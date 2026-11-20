import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Firestore,
  doc,
  getDocFromServer,
  getFirestore,
} from 'firebase/firestore';
import defaultFirebaseConfig from '../../firebase-applet-config.json';
import { CustomFirebaseWebConfig } from '../types/spicebridge';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function getProvisionedFirebaseConfig(): CustomFirebaseWebConfig {
  return {
    projectId: defaultFirebaseConfig.projectId,
    appId: defaultFirebaseConfig.appId,
    apiKey: defaultFirebaseConfig.apiKey,
    authDomain: defaultFirebaseConfig.authDomain,
    firestoreDatabaseId: defaultFirebaseConfig.firestoreDatabaseId,
    storageBucket: defaultFirebaseConfig.storageBucket,
    messagingSenderId: defaultFirebaseConfig.messagingSenderId,
  };
}

function resolveEffectiveFirebaseConfig(
  customConfig?: CustomFirebaseWebConfig | null,
): CustomFirebaseWebConfig {
  if (
    customConfig &&
    customConfig.projectId?.trim() &&
    customConfig.apiKey?.trim() &&
    customConfig.appId?.trim() &&
    customConfig.authDomain?.trim()
  ) {
    return customConfig;
  }
  return getProvisionedFirebaseConfig();
}

export function getFirebaseServices(
  customConfig?: CustomFirebaseWebConfig | null,
): {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
  effectiveConfig: CustomFirebaseWebConfig;
  isCustomConfig: boolean;
} {
  const effectiveConfig = resolveEffectiveFirebaseConfig(customConfig);
  const isCustomConfig = Boolean(
    customConfig &&
      customConfig.projectId?.trim() &&
      customConfig.projectId.trim() !== defaultFirebaseConfig.projectId,
  );

  const appName = isCustomConfig
    ? `spicebridge-custom-${effectiveConfig.projectId.trim()}`
    : '[DEFAULT]';

  const existingApp = getApps().find((a) => a.name === appName);
  const app = existingApp
    ? existingApp
    : initializeApp(
        {
          projectId: effectiveConfig.projectId,
          appId: effectiveConfig.appId,
          apiKey: effectiveConfig.apiKey,
          authDomain: effectiveConfig.authDomain,
          storageBucket: effectiveConfig.storageBucket,
          messagingSenderId: effectiveConfig.messagingSenderId,
        },
        appName === '[DEFAULT]' ? undefined : appName,
      );

  const db = effectiveConfig.firestoreDatabaseId?.trim()
    ? getFirestore(app, effectiveConfig.firestoreDatabaseId.trim())
    : getFirestore(app);

  const auth = getAuth(app);

  return { app, db, auth, effectiveConfig, isCustomConfig };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  authInstance?: Auth,
): never {
  const activeAuth = authInstance ?? getFirebaseServices().auth;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: activeAuth.currentUser?.uid ?? null,
      email: activeAuth.currentUser?.email ?? null,
      emailVerified: activeAuth.currentUser?.emailVerified ?? null,
      isAnonymous: activeAuth.currentUser?.isAnonymous ?? null,
      tenantId: activeAuth.currentUser?.tenantId ?? null,
      providerInfo:
        activeAuth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(
  customConfig?: CustomFirebaseWebConfig | null,
): Promise<{
  reachable: boolean;
  offline: boolean;
  message: string;
}> {
  const { db } = getFirebaseServices(customConfig);
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return {
      reachable: true,
      offline: false,
      message: 'Cloud Firestore endpoint reachable.',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline') || msg.includes('unavailable')) {
      console.error('Please check your Firebase configuration.', msg);
      return {
        reachable: false,
        offline: true,
        message: 'Firestore unreachable (client appears offline or misconfigured).',
      };
    }
    if (
      msg.includes('Missing or insufficient permissions') ||
      msg.includes('permission-denied')
    ) {
      // Server responded with security rule check -> endpoint is online & reachable
      return {
        reachable: true,
        offline: false,
        message: 'Cloud Firestore reachable; sign in with Google to authorize sync.',
      };
    }
    return {
      reachable: false,
      offline: true,
      message: msg,
    };
  }
}

export async function signInFirebaseWithGoogle(
  customConfig?: CustomFirebaseWebConfig | null,
): Promise<User> {
  const { auth } = getFirebaseServices(customConfig);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutFirebaseAuth(
  customConfig?: CustomFirebaseWebConfig | null,
): Promise<void> {
  const { auth } = getFirebaseServices(customConfig);
  await signOut(auth);
}

export function subscribeFirebaseAuth(
  callback: (user: User | null) => void,
  customConfig?: CustomFirebaseWebConfig | null,
): () => void {
  const { auth } = getFirebaseServices(customConfig);
  return onAuthStateChanged(auth, callback);
}
