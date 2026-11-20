import { CustomFirebaseWebConfig } from '../types/spicebridge';

/**
 * Clean Firebase configuration block for SpiceBridge.
 * Reads optional VITE_FIREBASE_* environment variables first, falling back to
 * the configured Firebase project below when env vars are unset.
 */
const DEFAULT_FIREBASE_CONFIG: CustomFirebaseWebConfig = {
  apiKey: 'AIzaSyD9dpuUMypM7UqxuI0QVtPVOjz1xWAe5K8',
  authDomain: 'spice-bridge-d22d8.firebaseapp.com',
  projectId: 'spice-bridge-d22d8',
  storageBucket: 'spice-bridge-d22d8.firebasestorage.app',
  messagingSenderId: '782847061911',
  appId: '1:782847061911:web:98e600dbcdcd2d489dded2',
  measurementId: 'G-LDPLYBVDT4',
  firestoreDatabaseId: '(default)',
};

function readOptionalEnv(key: string): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  const val = env?.[key]?.trim();
  return val ? val : undefined;
}

const ENV_FIREBASE_CONFIG: Partial<CustomFirebaseWebConfig> = {
  apiKey: readOptionalEnv('VITE_FIREBASE_API_KEY'),
  authDomain: readOptionalEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: readOptionalEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: readOptionalEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readOptionalEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readOptionalEnv('VITE_FIREBASE_APP_ID'),
  measurementId: readOptionalEnv('VITE_FIREBASE_MEASUREMENT_ID'),
  firestoreDatabaseId: readOptionalEnv('VITE_FIREBASE_DATABASE_ID'),
};

function isPlaceholderValue(val: string | undefined): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  if (!trimmed) return true;
  return (
    trimmed === 'remixed-project-id' ||
    trimmed.startsWith('MY_') ||
    trimmed.startsWith('YOUR_')
  );
}

export function isValidFirebaseConfig(
  config?: Partial<CustomFirebaseWebConfig> | null,
): config is CustomFirebaseWebConfig {
  if (!config) return false;
  return Boolean(
    !isPlaceholderValue(config.apiKey) &&
      !isPlaceholderValue(config.authDomain) &&
      !isPlaceholderValue(config.projectId) &&
      !isPlaceholderValue(config.appId),
  );
}

export function hasEnvFirebaseOverride(): boolean {
  return isValidFirebaseConfig(ENV_FIREBASE_CONFIG);
}

export function getDefaultFirebaseConfig(): CustomFirebaseWebConfig {
  if (hasEnvFirebaseOverride()) {
    return {
      apiKey: ENV_FIREBASE_CONFIG.apiKey!,
      authDomain: ENV_FIREBASE_CONFIG.authDomain!,
      projectId: ENV_FIREBASE_CONFIG.projectId!,
      storageBucket: ENV_FIREBASE_CONFIG.storageBucket || '',
      messagingSenderId: ENV_FIREBASE_CONFIG.messagingSenderId || '',
      appId: ENV_FIREBASE_CONFIG.appId!,
      measurementId: ENV_FIREBASE_CONFIG.measurementId || '',
      firestoreDatabaseId: ENV_FIREBASE_CONFIG.firestoreDatabaseId || '(default)',
    };
  }

  return { ...DEFAULT_FIREBASE_CONFIG };
}

export function resolveOptionalFirebaseConfig(
  customConfig?: CustomFirebaseWebConfig | null,
): CustomFirebaseWebConfig | null {
  if (isValidFirebaseConfig(customConfig)) {
    return normalizeFirebaseConfig(customConfig);
  }
  const fallback = getDefaultFirebaseConfig();
  if (isValidFirebaseConfig(fallback)) {
    return normalizeFirebaseConfig(fallback);
  }
  return null;
}

export function isFirebaseConfigured(
  customConfig?: CustomFirebaseWebConfig | null,
): boolean {
  return resolveOptionalFirebaseConfig(customConfig) !== null;
}

export function normalizeFirebaseConfig(
  config: CustomFirebaseWebConfig,
): CustomFirebaseWebConfig {
  return {
    apiKey: config.apiKey.trim(),
    authDomain: config.authDomain.trim(),
    projectId: config.projectId.trim(),
    storageBucket: config.storageBucket?.trim() || '',
    messagingSenderId: config.messagingSenderId?.trim() || '',
    appId: config.appId.trim(),
    measurementId: config.measurementId?.trim() || '',
    firestoreDatabaseId: config.firestoreDatabaseId?.trim() || '(default)',
  };
}

export function getFirebaseConfigSignature(
  config: CustomFirebaseWebConfig,
): string {
  const norm = normalizeFirebaseConfig(config);
  return [
    norm.projectId,
    norm.apiKey,
    norm.appId,
    norm.authDomain,
    norm.storageBucket || '',
    norm.messagingSenderId || '',
    norm.firestoreDatabaseId || '(default)',
  ].join('|');
}

export function isCustomFirebaseConfigActive(
  customConfig?: CustomFirebaseWebConfig | null,
): boolean {
  if (!isValidFirebaseConfig(customConfig)) {
    return false;
  }
  const defaultCfg = getDefaultFirebaseConfig();
  if (!isValidFirebaseConfig(defaultCfg)) {
    return true;
  }
  return (
    getFirebaseConfigSignature(customConfig) !==
    getFirebaseConfigSignature(defaultCfg)
  );
}

/**
 * Parses either strict JSON or a Firebase Console JS SDK snippet
 * (e.g. `const firebaseConfig = { apiKey: "...", ... };`).
 */
export function parseFirebaseWebConfigInput(
  rawInput: string,
):
  | { ok: true; config: CustomFirebaseWebConfig }
  | { ok: false; error: string } {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: 'Paste a Firebase Web SDK config object (JSON or JS snippet) first.',
    };
  }

  // Extract object literal block if wrapped in `const firebaseConfig = { ... };`
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return {
      ok: false,
      error: 'Could not find a config object `{ ... }` in the pasted text.',
    };
  }

  let objectBody = trimmed.slice(firstBrace, lastBrace + 1);

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(objectBody) as Record<string, unknown>;
  } catch {
    // Try normalizing JS object literal syntax (comments, unquoted keys, single quotes, trailing commas)
    try {
      const normalized = objectBody
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g, '$1"$2":')
        .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, inner: string) =>
          JSON.stringify(inner),
        )
        .replace(/,\s*([}\]])/g, '$1');

      parsed = JSON.parse(normalized) as Record<string, unknown>;
    } catch {
      return {
        ok: false,
        error:
          'Could not parse Firebase config. Paste valid JSON or the `const firebaseConfig = { ... }` snippet from Firebase Project Settings.',
      };
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      ok: false,
      error: 'Parsed Firebase config must be an object.',
    };
  }

  if (
    'private_key' in parsed ||
    ('type' in parsed && parsed.type === 'service_account')
  ) {
    return {
      ok: false,
      error:
        'Do not paste server service-account credentials in the browser. Paste only the public Firebase Web SDK config.',
    };
  }

  const str = (key: string): string =>
    typeof parsed?.[key] === 'string' ? (parsed[key] as string).trim() : '';

  const apiKey = str('apiKey');
  const authDomain = str('authDomain');
  const projectId = str('projectId');
  const appId = str('appId');
  const storageBucket = str('storageBucket');
  const messagingSenderId = str('messagingSenderId');
  const measurementId = str('measurementId');
  const firestoreDatabaseId =
    str('firestoreDatabaseId') ||
    str('databaseId') ||
    str('databaseName') ||
    '(default)';

  if (!apiKey || !authDomain || !projectId || !appId) {
    return {
      ok: false,
      error:
        'Firebase Web config must include apiKey, authDomain, projectId, and appId.',
    };
  }

  return {
    ok: true,
    config: {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
      measurementId,
      firestoreDatabaseId,
    },
  };
}

export function isFirestorePermissionError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  let coreMessage = raw;

  if (raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as { error?: unknown };
      if (typeof parsed.error === 'string' && parsed.error.trim()) {
        coreMessage = parsed.error;
      }
    } catch {
      // Keep raw fallback
    }
  }

  const lower = coreMessage.toLowerCase();
  return (
    lower.includes('missing or insufficient permissions') ||
    lower.includes('permission-denied') ||
    lower.includes('permission_denied')
  );
}

/**
 * Converts structured FirestoreErrorInfo JSON or raw SDK error strings into
 * clear, actionable status feedback for the SpiceBridge UI.
 */
export function formatCloudErrorMessage(
  error: unknown,
  context?: { projectId?: string; databaseId?: string },
): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  let coreMessage = raw;
  let path: string | null = null;
  let userId: string | null = null;

  // Unwrap structured FirestoreErrorInfo JSON without surfacing raw JSON in the UI
  if (raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as {
        error?: unknown;
        path?: unknown;
        authInfo?: { userId?: unknown };
      };
      if (typeof parsed.error === 'string' && parsed.error.trim()) {
        coreMessage = parsed.error;
      }
      if (typeof parsed.path === 'string' && parsed.path.trim()) {
        path = parsed.path;
      }
      if (
        parsed.authInfo &&
        typeof parsed.authInfo.userId === 'string' &&
        parsed.authInfo.userId.trim()
      ) {
        userId = parsed.authInfo.userId;
      }
    } catch {
      // Keep raw string fallback
    }
  }

  const lower = coreMessage.toLowerCase();
  const projectLabel = context?.projectId || 'configured Firebase project';
  const dbLabel = context?.databaseId || '(default)';

  if (
    lower.includes('missing or insufficient permissions') ||
    lower.includes('permission-denied') ||
    lower.includes('permission_denied')
  ) {
    if (!userId) {
      return `Cloud Firestore access requires Google sign-in for "${projectLabel}". Using Local Offline Cache until signed in.`;
    }
    const pathLabel = path ? ` (${path})` : '';
    return `Firestore permissions are not yet published for "${projectLabel}"${pathLabel}. Falling back cleanly to Local Offline Cache — publish the workspaces/{userId} rules in Firebase Console and click "Test & Sync Now".`;
  }

  if (
    lower.includes('not_found') ||
    lower.includes('not found') ||
    lower.includes('does not exist')
  ) {
    return `Firestore database "${dbLabel}" was not found in project "${projectLabel}". Leave Database Name as "(default)" unless you created a named Firestore database.`;
  }

  if (
    lower.includes('the client is offline') ||
    lower.includes('unavailable') ||
    lower.includes('network') ||
    lower.includes('failed to fetch')
  ) {
    return `Cloud Firestore is unreachable or not yet initialized for "${projectLabel}". Confirm that Firestore Database is created in Firebase Console and your network is online — all edits remain safely saved in Local Offline Cache.`;
  }

  if (lower.includes('auth/unauthorized-domain')) {
    const origin =
      typeof window !== 'undefined' ? window.location.hostname : 'this app domain';
    return `Google sign-in blocked for "${origin}". Add "${origin}" under Firebase Console -> Authentication -> Settings -> Authorized domains in project "${projectLabel}".`;
  }

  if (
    lower.includes('auth/popup-closed-by-user') ||
    lower.includes('auth/cancelled-popup-request')
  ) {
    return 'Google sign-in popup was closed before completing authorization.';
  }

  if (lower.includes('auth/popup-blocked')) {
    return 'Browser blocked the Google sign-in popup. Allow popups for this site and try again.';
  }

  if (
    lower.includes('auth/invalid-api-key') ||
    lower.includes('api key not valid')
  ) {
    return `Invalid Firebase API Key for "${projectLabel}". Double-check the apiKey in your Firebase Web config.`;
  }

  if (lower.includes('quota exceeded')) {
    return 'Firestore free-tier quota exceeded for today. Your workspace continues running on Local Offline Cache.';
  }

  // Strip verbose "FirebaseError:" prefix if present
  return coreMessage.replace(/^FirebaseError:\s*/i, '').trim() ||
    'Cloud database operation could not be completed. Local Offline Cache remains active.';
}
