import {
  AlertCircle,
  Check,
  CheckCircle2,
  Cloud,
  CloudOff,
  Copy,
  Database,
  HardDrive,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getProvisionedFirebaseConfig } from '../../db/firebaseClient';
import {
  formatCloudErrorMessage,
  isCustomFirebaseConfigActive,
  isFirebaseConfigured,
  parseFirebaseWebConfigInput,
} from '../../db/firebaseConfig';
import { SUPABASE_SCHEMA_SQL } from '../../db/supabaseAdapter';
import {
  CloudDatabaseConfig,
  CustomFirebaseWebConfig,
  DatabaseProvider,
  SyncStatus,
} from '../../types/spicebridge';

interface DatabaseSettingsModalProps {
  isOpen: boolean;
  dbConfig: CloudDatabaseConfig;
  syncStatus: SyncStatus;
  syncStatusLabel: string;
  lastSyncedAt: string | null;
  hasPendingChanges: boolean;
  isNavigatorOnline: boolean;
  firebaseUserEmail: string | null;
  firebaseUserUid: string | null;
  syncError: string | null;
  recordCounts: {
    lots: number;
    batches: number;
    passports: number;
    millOrders: number;
  };
  onClose: () => void;
  onUpdateConfig: (next: CloudDatabaseConfig) => void;
  onConnectFirebaseGoogle: () => Promise<void>;
  onDisconnectFirebaseGoogle: () => Promise<void>;
  onTestAndSyncNow: () => Promise<{ ok: boolean; message: string }>;
}

const EMPTY_FIREBASE_FIELDS: CustomFirebaseWebConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
  firestoreDatabaseId: '(default)',
};

const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /workspaces/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}`;

export function DatabaseSettingsModal({
  isOpen,
  dbConfig,
  syncStatus,
  syncStatusLabel,
  lastSyncedAt,
  hasPendingChanges,
  isNavigatorOnline,
  firebaseUserEmail,
  firebaseUserUid,
  syncError,
  recordCounts,
  onClose,
  onUpdateConfig,
  onConnectFirebaseGoogle,
  onDisconnectFirebaseGoogle,
  onTestAndSyncNow,
}: DatabaseSettingsModalProps) {
  const defaultFirebase = getProvisionedFirebaseConfig();
  const hasCustomFirebase = isCustomFirebaseConfigActive(
    dbConfig.customFirebaseConfig,
  );

  const [selectedProvider, setSelectedProvider] = useState<DatabaseProvider>(
    dbConfig.provider,
  );
  const [showFirebaseEditor, setShowFirebaseEditor] = useState(
    hasCustomFirebase,
  );
  const [firebasePasteText, setFirebasePasteText] = useState('');
  const [fbFields, setFbFields] = useState<CustomFirebaseWebConfig>(
    dbConfig.customFirebaseConfig ?? EMPTY_FIREBASE_FIELDS,
  );

  const [showFirebaseRules, setShowFirebaseRules] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);

  const [supabaseUrl, setSupabaseUrl] = useState(
    dbConfig.supabaseConfig?.url ?? '',
  );
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(
    dbConfig.supabaseConfig?.anonKey ?? '',
  );
  const [showSupabaseSql, setShowSupabaseSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const [actionBusy, setActionBusy] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const customActive = isCustomFirebaseConfigActive(
      dbConfig.customFirebaseConfig,
    );
    setSelectedProvider(dbConfig.provider);
    setShowFirebaseEditor(customActive);
    setFbFields(
      dbConfig.customFirebaseConfig
        ? {
            apiKey: dbConfig.customFirebaseConfig.apiKey || '',
            authDomain: dbConfig.customFirebaseConfig.authDomain || '',
            projectId: dbConfig.customFirebaseConfig.projectId || '',
            storageBucket: dbConfig.customFirebaseConfig.storageBucket || '',
            messagingSenderId:
              dbConfig.customFirebaseConfig.messagingSenderId || '',
            appId: dbConfig.customFirebaseConfig.appId || '',
            firestoreDatabaseId:
              dbConfig.customFirebaseConfig.firestoreDatabaseId || '(default)',
          }
        : EMPTY_FIREBASE_FIELDS,
    );
    setFirebasePasteText(
      dbConfig.customFirebaseConfig
        ? JSON.stringify(dbConfig.customFirebaseConfig, null, 2)
        : '',
    );
    setSupabaseUrl(dbConfig.supabaseConfig?.url ?? '');
    setSupabaseAnonKey(dbConfig.supabaseConfig?.anonKey ?? '');
    setFormError(null);
    setTestResult(null);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dbConfig, onClose]);

  if (!isOpen) return null;

  const handleSelectProvider = (provider: DatabaseProvider) => {
    setSelectedProvider(provider);
    setFormError(null);
    setTestResult(null);
    onUpdateConfig({
      ...dbConfig,
      provider,
    });
  };

  const handleParseFirebasePaste = (rawValue?: string) => {
    setFormError(null);
    const input = rawValue ?? firebasePasteText;
    const result = parseFirebaseWebConfigInput(input);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setFbFields(result.config);
    setTestResult({
      ok: true,
      message: `Parsed Firebase config for project "${result.config.projectId}". Click "Save Firebase Config" to activate it.`,
    });
  };

  const handleSaveCustomFirebase = () => {
    setFormError(null);
    const trimmed: CustomFirebaseWebConfig = {
      apiKey: fbFields.apiKey.trim(),
      authDomain: fbFields.authDomain.trim(),
      projectId: fbFields.projectId.trim(),
      storageBucket: fbFields.storageBucket?.trim() || '',
      messagingSenderId: fbFields.messagingSenderId?.trim() || '',
      appId: fbFields.appId.trim(),
      firestoreDatabaseId: fbFields.firestoreDatabaseId?.trim() || '(default)',
    };

    if (
      !trimmed.apiKey &&
      !trimmed.authDomain &&
      !trimmed.projectId &&
      !trimmed.appId &&
      firebasePasteText.trim()
    ) {
      const parsed = parseFirebaseWebConfigInput(firebasePasteText);
      if (!parsed.ok) {
        setFormError(parsed.error);
        return;
      }
      Object.assign(trimmed, parsed.config);
      setFbFields(parsed.config);
    }

    if (
      !trimmed.apiKey ||
      !trimmed.authDomain ||
      !trimmed.projectId ||
      !trimmed.appId
    ) {
      setFormError(
        'Please provide apiKey, authDomain, projectId, and appId (either paste your Firebase snippet above or fill the fields).',
      );
      return;
    }

    setFirebasePasteText(JSON.stringify(trimmed, null, 2));
    onUpdateConfig({
      ...dbConfig,
      provider: 'firebase',
      customFirebaseConfig: trimmed,
    });
    setSelectedProvider('firebase');
    setTestResult({
      ok: true,
      message: `Saved Firebase config for "${trimmed.projectId}" (${trimmed.firestoreDatabaseId || '(default)'}) to browser localStorage. Connect Google Account below and click "Test & Sync Now".`,
    });
  };

  const handleResetCustomFirebase = () => {
    setFormError(null);
    setFbFields(EMPTY_FIREBASE_FIELDS);
    setFirebasePasteText('');
    setShowFirebaseEditor(false);
    onUpdateConfig({
      ...dbConfig,
      provider: 'firebase',
      customFirebaseConfig: null,
    });
    setTestResult({
      ok: true,
      message: `Reverted to default Firebase config (${defaultFirebase.projectId}). All saved lots and workspace records remain intact.`,
    });
  };

  const handleSaveSupabase = async () => {
    setFormError(null);
    const trimmedUrl = supabaseUrl.trim();
    const trimmedKey = supabaseAnonKey.trim();

    if (!trimmedUrl.startsWith('https://')) {
      setFormError('Please enter a valid Supabase Project URL starting with https://');
      return;
    }
    if (!trimmedKey || trimmedKey.length < 20) {
      setFormError('Please enter your Supabase public anon/publishable key.');
      return;
    }
    if (trimmedKey.toLowerCase().includes('service_role')) {
      setFormError(
        'Do not use a service_role secret key in the browser. Use your public anon key protected by RLS.',
      );
      return;
    }

    onUpdateConfig({
      ...dbConfig,
      provider: 'supabase',
      supabaseConfig: {
        url: trimmedUrl,
        anonKey: trimmedKey,
      },
    });
    setSelectedProvider('supabase');
    setTestResult({
      ok: true,
      message:
        'Supabase configuration saved to browser localStorage. Click "Test & Sync Now" to verify and sync.',
    });
  };

  const handleTestAndSyncNow = async () => {
    setActionBusy(true);
    setTestResult(null);
    setFormError(null);
    try {
      const res = await onTestAndSyncNow();
      setTestResult(res);
    } catch (err) {
      setTestResult({
        ok: false,
        message: formatCloudErrorMessage(err, {
          projectId: activeFirebaseProject,
          databaseId: activeFirebaseDbId,
        }),
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setActionBusy(true);
    setTestResult(null);
    setFormError(null);
    try {
      await onConnectFirebaseGoogle();
      setTestResult({
        ok: true,
        message: 'Google Cloud Auth connected. Syncing SpiceBridge records...',
      });
    } catch (err) {
      setFormError(
        formatCloudErrorMessage(err, {
          projectId: activeFirebaseProject,
          databaseId: activeFirebaseDbId,
        }),
      );
    } finally {
      setActionBusy(false);
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
      setCopiedSql(true);
      window.setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      setCopiedSql(true);
      window.setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  const handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
      setCopiedRules(true);
      window.setTimeout(() => setCopiedRules(false), 2000);
    } catch {
      setCopiedRules(true);
      window.setTimeout(() => setCopiedRules(false), 2000);
    }
  };

  const firebaseConfigured = isFirebaseConfigured(dbConfig.customFirebaseConfig);
  const activeFirebaseProject =
    dbConfig.customFirebaseConfig?.projectId || defaultFirebase.projectId;
  const activeFirebaseDbId =
    dbConfig.customFirebaseConfig?.firestoreDatabaseId ||
    defaultFirebase.firestoreDatabaseId ||
    '(default)';

  const readableSyncError = syncError
    ? formatCloudErrorMessage(syncError, {
        projectId: activeFirebaseProject,
        databaseId: activeFirebaseDbId,
      })
    : null;

  const currentOriginHost =
    typeof window !== 'undefined' ? window.location.hostname : 'your app domain';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="db-settings-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-700 text-amber-300">
              <Database className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="db-settings-modal-title"
                className="font-display text-base font-bold text-slate-900"
              >
                Database Settings &amp; Cloud Connection
              </h2>
              <p className="text-[11px] text-slate-500">
                Cloud Firestore / Supabase PostgreSQL with localStorage offline cache
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close database settings"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Live Status Summary Strip */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {syncStatus === 'connected' || syncStatus === 'saved' ? (
                  <Cloud className="h-4 w-4 text-forest-700" aria-hidden="true" />
                ) : syncStatus === 'queued_offline' ? (
                  <CloudOff className="h-4 w-4 text-amber-700" aria-hidden="true" />
                ) : syncStatus === 'syncing' ? (
                  <Loader2
                    className="h-4 w-4 animate-spin text-forest-700"
                    aria-hidden="true"
                  />
                ) : (
                  <HardDrive className="h-4 w-4 text-slate-600" aria-hidden="true" />
                )}
                <span className="text-xs font-bold text-slate-900">
                  {syncStatusLabel}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono tabular-nums">
                <span>Network: {isNavigatorOnline ? 'Online' : 'Offline'}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {lastSyncedAt
                    ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : 'Not yet synced to cloud'}
                </span>
              </div>
            </div>

            {/* 4 Persisted Entity Counts */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 border-t border-slate-200/80 pt-3">
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <p className="text-[10px] text-slate-500">Farmer Lots</p>
                <p className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {recordCounts.lots}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <p className="text-[10px] text-slate-500">Batches</p>
                <p className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {recordCounts.batches}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <p className="text-[10px] text-slate-500">Passports</p>
                <p className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {recordCounts.passports}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <p className="text-[10px] text-slate-500">Mill Orders</p>
                <p className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {recordCounts.millOrders}
                </p>
              </div>
            </div>

            {hasPendingChanges && (
              <p className="text-[11px] font-medium text-amber-800">
                Local edits are saved in your offline cache and queued for cloud sync.
              </p>
            )}
          </div>

          {/* Feedback Banners (Always Human-Readable, Never Raw Error JSON) */}
          {(formError || readableSyncError) && (
            <div
              role="alert"
              className={`flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-xs ${
                !formError &&
                readableSyncError?.includes('Local Offline Cache')
                  ? 'border-amber-200 bg-turmeric-50 text-amber-900'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="break-words">{formError || readableSyncError}</span>
            </div>
          )}

          {testResult && (
            <div
              role="status"
              className={`flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-xs ${
                testResult.ok
                  ? 'border-emerald-200 bg-emerald-50 text-forest-800'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span className="break-words">{testResult.message}</span>
            </div>
          )}

          {/* Database Provider Selector */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-800">
              Active Cloud Database Adapter
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleSelectProvider('firebase')}
                className={`rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                  selectedProvider === 'firebase'
                    ? 'border-forest-600 bg-forest-50/70'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <p className="text-xs font-bold text-slate-900">
                  Firebase (Cloud Firestore)
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  Connect default or custom Firebase project
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectProvider('supabase')}
                className={`rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                  selectedProvider === 'supabase'
                    ? 'border-forest-600 bg-forest-50/70'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <p className="text-xs font-bold text-slate-900">
                  Supabase (PostgreSQL)
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  Connect your own Supabase REST URL
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectProvider('local')}
                className={`rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                  selectedProvider === 'local'
                    ? 'border-forest-600 bg-forest-50/70'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <p className="text-xs font-bold text-slate-900">
                  Local Offline Cache
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  Browser localStorage only (no cloud calls)
                </p>
              </button>
            </div>
          </div>

          {/* Firebase Panel */}
          {selectedProvider === 'firebase' && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      Firebase Cloud Firestore Target
                    </p>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                        !firebaseConfigured
                          ? 'bg-slate-100 text-slate-700'
                          : hasCustomFirebase
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-100 text-forest-800'
                      }`}
                    >
                      {!firebaseConfigured
                        ? 'Not Configured (Optional)'
                        : hasCustomFirebase
                          ? 'Custom Browser Config'
                          : 'Default / Env Config'}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-slate-600 break-all">
                    {firebaseConfigured
                      ? `Project: ${activeFirebaseProject} · DB: ${activeFirebaseDbId}`
                      : 'Running cleanly on Local Offline Cache (VITE_FIREBASE_* env vars are optional)'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFirebaseRules((v) => !v)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    {showFirebaseRules
                      ? 'Hide Firestore Rules'
                      : 'Firestore Rules & Setup'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFirebaseEditor((v) => !v)}
                    className="text-xs font-semibold text-forest-700 hover:underline cursor-pointer"
                  >
                    {showFirebaseEditor
                      ? 'Hide Firebase Config Editor'
                      : 'Switch / Paste New Firebase Config'}
                  </button>
                </div>
              </div>

              {/* Google Cloud Auth Connection */}
              <div className="rounded-lg border border-emerald-200 bg-forest-50/50 p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <ShieldCheck
                      className="mt-0.5 h-4 w-4 shrink-0 text-forest-700"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900">
                        {!firebaseConfigured
                          ? 'Firebase Sync Optional — Local Offline Cache Active'
                          : firebaseUserEmail
                            ? `Cloud Auth Active: ${firebaseUserEmail}`
                            : `Authorize Sync for ${activeFirebaseProject}`}
                      </p>
                      <p className="text-[11px] text-slate-600 break-all">
                        {!firebaseConfigured
                          ? 'Leave blank to use browser localStorage offline cache, or paste a Firebase Web config below to enable Cloud Firestore sync.'
                          : firebaseUserUid
                            ? `Workspace UID: ${firebaseUserUid}`
                            : 'Connect your Google account so Firestore rules isolate and sync your workspace.'}
                      </p>
                    </div>
                  </div>

                  {firebaseConfigured &&
                    (firebaseUserEmail ? (
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => {
                          void onDisconnectFirebaseGoogle();
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Disconnect Cloud Auth
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => {
                          void handleGoogleSignIn();
                        }}
                        className="rounded-lg bg-forest-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-forest-800 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Connect Google Account for Cloud Sync
                      </button>
                    ))}
                </div>

                {hasCustomFirebase && (
                  <p className="text-[11px] text-slate-600 border-t border-emerald-200/70 pt-2">
                    New project setup: enable Google Sign-In, add{' '}
                    <span className="font-mono font-semibold text-slate-800">
                      {currentOriginHost}
                    </span>{' '}
                    to Authentication Authorized Domains, and publish the{' '}
                    <span className="font-mono">workspaces/{'{userId}'}</span> rules. If
                    rules are not published yet, SpiceBridge falls back cleanly to Local
                    Offline Cache.
                  </p>
                )}
              </div>

              {showFirebaseRules && (
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-800">
                      Firestore Rules for New Project (workspaces/{'{userId}'})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void handleCopyRules();
                      }}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      {copiedRules ? (
                        <>
                          <Check className="h-3 w-3 text-forest-700" aria-hidden="true" />
                          <span>Copied Rules</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" aria-hidden="true" />
                          <span>Copy Rules</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-[11px] text-slate-800">
                    {FIRESTORE_RULES_SNIPPET}
                  </pre>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Paste into Firebase Console → Firestore Database → Rules. Until
                    published, SpiceBridge saves all edits safely in browser{' '}
                    <span className="font-mono">localStorage</span> (Local Offline Cache).
                  </p>
                </div>
              )}

              {showFirebaseEditor && (
                <div className="space-y-3.5 border-t border-slate-100 pt-3.5">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label
                        htmlFor="custom-firebase-json"
                        className="block text-xs font-semibold text-slate-800"
                      >
                        Quick Paste Firebase Web Config (JSON or JS SDK Snippet)
                      </label>
                      <button
                        type="button"
                        onClick={() => handleParseFirebasePaste()}
                        className="text-[11px] font-semibold text-forest-700 hover:underline cursor-pointer"
                      >
                        Parse Snippet into Fields
                      </button>
                    </div>
                    <textarea
                      id="custom-firebase-json"
                      rows={4}
                      value={firebasePasteText}
                      onChange={(e) => setFirebasePasteText(e.target.value)}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData('text');
                        const parsed = parseFirebaseWebConfigInput(pasted);
                        if (parsed.ok) {
                          setFbFields(parsed.config);
                        }
                      }}
                      placeholder={`Paste JSON or const firebaseConfig = { apiKey: "...", authDomain: "...", projectId: "...", storageBucket: "...", messagingSenderId: "...", appId: "..." };`}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-[11px] text-slate-900 focus:border-forest-600 focus:outline-none"
                    />
                  </div>

                  {/* Clean Individual Firebase Config Fields */}
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="fb-project-id"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Project ID *
                      </label>
                      <input
                        id="fb-project-id"
                        type="text"
                        value={fbFields.projectId}
                        onChange={(e) =>
                          setFbFields((prev) => ({
                            ...prev,
                            projectId: e.target.value,
                          }))
                        }
                        placeholder="my-spicebridge-project"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="fb-api-key"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        API Key *
                      </label>
                      <input
                        id="fb-api-key"
                        type="text"
                        value={fbFields.apiKey}
                        onChange={(e) =>
                          setFbFields((prev) => ({ ...prev, apiKey: e.target.value }))
                        }
                        placeholder="AIzaSy..."
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="fb-auth-domain"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Auth Domain *
                      </label>
                      <input
                        id="fb-auth-domain"
                        type="text"
                        value={fbFields.authDomain}
                        onChange={(e) =>
                          setFbFields((prev) => ({
                            ...prev,
                            authDomain: e.target.value,
                          }))
                        }
                        placeholder="my-project.firebaseapp.com"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="fb-app-id"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        App ID *
                      </label>
                      <input
                        id="fb-app-id"
                        type="text"
                        value={fbFields.appId}
                        onChange={(e) =>
                          setFbFields((prev) => ({ ...prev, appId: e.target.value }))
                        }
                        placeholder="1:123456789:web:abcdef"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="fb-storage-bucket"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Storage Bucket
                      </label>
                      <input
                        id="fb-storage-bucket"
                        type="text"
                        value={fbFields.storageBucket || ''}
                        onChange={(e) =>
                          setFbFields((prev) => ({
                            ...prev,
                            storageBucket: e.target.value,
                          }))
                        }
                        placeholder="my-project.firebasestorage.app"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="fb-sender-id"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Messaging Sender ID
                      </label>
                      <input
                        id="fb-sender-id"
                        type="text"
                        value={fbFields.messagingSenderId || ''}
                        onChange={(e) =>
                          setFbFields((prev) => ({
                            ...prev,
                            messagingSenderId: e.target.value,
                          }))
                        }
                        placeholder="123456789012"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="fb-database-name"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Firestore Database Name (optional — leave as{' '}
                        <span className="font-mono">(default)</span> for standard
                        projects)
                      </label>
                      <input
                        id="fb-database-name"
                        type="text"
                        value={fbFields.firestoreDatabaseId || ''}
                        onChange={(e) =>
                          setFbFields((prev) => ({
                            ...prev,
                            firestoreDatabaseId: e.target.value,
                          }))
                        }
                        placeholder="(default)"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {hasCustomFirebase ? (
                      <button
                        type="button"
                        onClick={handleResetCustomFirebase}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Reset to Default Config</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        Saved to browser localStorage; existing lots stay preserved.
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveCustomFirebase}
                      className="rounded-lg bg-forest-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-forest-800 cursor-pointer"
                    >
                      Save Firebase Config
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Supabase Panel */}
          {selectedProvider === 'supabase' && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-900">
                  Supabase PostgreSQL Connection
                </p>
                <button
                  type="button"
                  onClick={() => setShowSupabaseSql((v) => !v)}
                  className="text-xs font-semibold text-forest-700 hover:underline cursor-pointer"
                >
                  {showSupabaseSql ? 'Hide SQL Schema' : 'View PostgreSQL Schema SQL'}
                </button>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label
                    htmlFor="supabase-url"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Supabase Project URL
                  </label>
                  <input
                    id="supabase-url"
                    type="url"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://your-project-ref.supabase.co"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="supabase-anon-key"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Supabase Public Anon Key (Never paste service_role secret keys)
                  </label>
                  <input
                    id="supabase-anon-key"
                    type="password"
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    placeholder="eyJhbGciOi..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      void handleSaveSupabase();
                    }}
                    className="rounded-lg bg-forest-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-forest-800 cursor-pointer"
                  >
                    Save Supabase Credentials
                  </button>
                </div>
              </div>

              {showSupabaseSql && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600">
                      PostgreSQL Tables for SpiceBridge
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void handleCopySql();
                      }}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      {copiedSql ? (
                        <>
                          <Check className="h-3 w-3 text-forest-700" aria-hidden="true" />
                          <span>Copied SQL</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" aria-hidden="true" />
                          <span>Copy SQL</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="max-h-44 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] text-slate-800">
                    {SUPABASE_SCHEMA_SQL}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Local Offline Cache Notice */}
          {selectedProvider === 'local' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-700 leading-relaxed">
              SpiceBridge is running purely on your browser&apos;s{' '}
              <span className="font-mono">localStorage</span> offline cache. All farmer
              lots, batches, passports, mill orders, and strategy records remain
              preserved locally. Switch back to Firebase or Supabase at any time to sync
              cached records to the cloud.
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => {
                void handleTestAndSyncNow();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-forest-700 px-4 py-2 text-xs font-semibold text-white hover:bg-forest-800 disabled:opacity-60 cursor-pointer"
            >
              {actionBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Test &amp; Sync Now</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
