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
import { CustomFirebaseWebConfig } from '../types/spicebridge';
import {
  formatCloudErrorMessage,
  getDefaultFirebaseConfig,
  getFirebaseConfigSignature,
  isCustomFirebaseConfigActive,
  isFirebaseConfigured,
  resolveOptionalFirebaseConfig,
} from './firebaseConfig';

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

function hashConfigSignature(sig: string): string {
  let hash = 5381;
  for (let i = 0; i < sig.length; i += 1) {
    hash = ((hash << 5) + hash) ^ sig.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function getProvisionedFirebaseConfig(): CustomFirebaseWebConfig {
  return getDefaultFirebaseConfig();
}

export function resolveEffectiveFirebaseConfig(
  customConfig?: CustomFirebaseWebConfig | null,
): CustomFirebaseWebConfig {
  return resolveOptionalFirebaseConfig(customConfig) ?? getDefaultFirebaseConfig();
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
  const resolved = resolveOptionalFirebaseConfig(customConfig);
  if (!resolved) {
    throw new Error(
      'Firebase is not configured. Running cleanly on Local Offline Cache.',
    );
  }

  const effectiveConfig = resolved;
  const isCustomConfig = isCustomFirebaseConfigActive(customConfig);

  const signature = getFirebaseConfigSignature(effectiveConfig);
  const appName = isCustomConfig
    ? `spicebridge-custom-${effectiveConfig.projectId}-${hashConfigSignature(signature)}`
    : '[DEFAULT]';

  const existingApp = getApps().find((a) => a.name === appName);
  const firebaseOptions: Record<string, string> = {
    projectId: effectiveConfig.projectId,
    appId: effectiveConfig.appId,
    apiKey: effectiveConfig.apiKey,
    authDomain: effectiveConfig.authDomain,
  };
  if (effectiveConfig.storageBucket) {
    firebaseOptions.storageBucket = effectiveConfig.storageBucket;
  }
  if (effectiveConfig.messagingSenderId) {
    firebaseOptions.messagingSenderId = effectiveConfig.messagingSenderId;
  }

  const app = existingApp
    ? existingApp
    : initializeApp(
        firebaseOptions,
        appName === '[DEFAULT]' ? undefined : appName,
      );

  const dbName = effectiveConfig.firestoreDatabaseId?.trim();
  const db =
    dbName && dbName !== '(default)'
      ? getFirestore(app, dbName)
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
  const activeAuth =
    authInstance ??
    (isFirebaseConfigured() ? getFirebaseServices().auth : undefined);
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: activeAuth?.currentUser?.uid ?? null,
      email: activeAuth?.currentUser?.email ?? null,
      emailVerified: activeAuth?.currentUser?.emailVerified ?? null,
      isAnonymous: activeAuth?.currentUser?.isAnonymous ?? null,
      tenantId: activeAuth?.currentUser?.tenantId ?? null,
      providerInfo:
        activeAuth?.currentUser?.providerData?.map((provider) => ({
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
  const resolved = resolveOptionalFirebaseConfig(customConfig);
  if (!resolved) {
    return {
      reachable: false,
      offline: false,
      message:
        'Firebase config is optional and currently blank. SpiceBridge is running cleanly on Local Offline Cache (browser localStorage).',
    };
  }

  try {
    const services = getFirebaseServices(customConfig);
    const effectiveConfig = services.effectiveConfig;
    await getDocFromServer(doc(services.db, 'test', 'connection'));
    return {
      reachable: true,
      offline: false,
      message: `Cloud Firestore reachable (${effectiveConfig.projectId} · ${effectiveConfig.firestoreDatabaseId || '(default)'}).`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const lower = msg.toLowerCase();

    if (lower.includes('the client is offline') || lower.includes('unavailable')) {
      console.error('Please check your Firebase configuration.', msg);
      return {
        reachable: false,
        offline: true,
        message: `Firestore unreachable for "${resolved.projectId}" (client appears offline or network blocked).`,
      };
    }

    if (
      lower.includes('missing or insufficient permissions') ||
      lower.includes('permission-denied')
    ) {
      // Server responded to the probe with a security rule check -> endpoint is reachable
      return {
        reachable: true,
        offline: false,
        message: `Cloud Firestore endpoint reachable (${resolved.projectId} · ${resolved.firestoreDatabaseId || '(default)'}).`,
      };
    }

    return {
      reachable: false,
      offline: false,
      message: formatCloudErrorMessage(error, {
        projectId: resolved.projectId,
        databaseId: resolved.firestoreDatabaseId,
      }),
    };
  }
}

export async function signInFirebaseWithGoogle(
  customConfig?: CustomFirebaseWebConfig | null,
): Promise<User> {
  if (!isFirebaseConfigured(customConfig)) {
    throw new Error(
      'Paste your Firebase Web config first to enable Google Cloud sync, or continue using Local Offline Cache.',
    );
  }
  const { auth } = getFirebaseServices(customConfig);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutFirebaseAuth(
  customConfig?: CustomFirebaseWebConfig | null,
): Promise<void> {
  if (!isFirebaseConfigured(customConfig)) return;
  const { auth } = getFirebaseServices(customConfig);
  await signOut(auth);
}

export function subscribeFirebaseAuth(
  callback: (user: User | null) => void,
  customConfig?: CustomFirebaseWebConfig | null,
): () => void {
  if (!isFirebaseConfigured(customConfig)) {
    callback(null);
    return () => {};
  }
  const { auth } = getFirebaseServices(customConfig);
  return onAuthStateChanged(auth, callback);
}
