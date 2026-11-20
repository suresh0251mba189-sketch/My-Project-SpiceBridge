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
  ShieldCheck,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getProvisionedFirebaseConfig } from '../../db/firebaseClient';
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
  onTestConnection: () => Promise<{ ok: boolean; message: string }>;
  onSyncNow: () => Promise<void>;
}

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
  onTestConnection,
  onSyncNow,
}: DatabaseSettingsModalProps) {
  const provisioned = getProvisionedFirebaseConfig();

  const [selectedProvider, setSelectedProvider] = useState<DatabaseProvider>(
    dbConfig.provider,
  );
  const [customFirebaseJson, setCustomFirebaseJson] = useState('');
  const [showCustomFirebase, setShowCustomFirebase] = useState(false);
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
    setSelectedProvider(dbConfig.provider);
    setSupabaseUrl(dbConfig.supabaseConfig?.url ?? '');
    setSupabaseAnonKey(dbConfig.supabaseConfig?.anonKey ?? '');
    setCustomFirebaseJson(
      dbConfig.customFirebaseConfig
        ? JSON.stringify(dbConfig.customFirebaseConfig, null, 2)
        : '',
    );
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

  const handleApplyCustomFirebase = () => {
    setFormError(null);
    if (!customFirebaseJson.trim()) {
      onUpdateConfig({
        ...dbConfig,
        provider: 'firebase',
        customFirebaseConfig: null,
      });
      setTestResult({
        ok: true,
        message: 'Reverted to provisioned Firebase Cloud Firestore config.',
      });
      return;
    }

    try {
      const parsed = JSON.parse(customFirebaseJson) as Record<string, unknown>;
      if ('private_key' in parsed || 'type' in parsed && parsed.type === 'service_account') {
        setFormError(
          'Do not paste server service-account credentials in the browser. Paste only the public Firebase Web SDK config.',
        );
        return;
      }
      if (
        typeof parsed.projectId !== 'string' ||
        typeof parsed.apiKey !== 'string' ||
        typeof parsed.appId !== 'string' ||
        typeof parsed.authDomain !== 'string'
      ) {
        setFormError(
          'Firebase Web config JSON must include projectId, apiKey, appId, and authDomain.',
        );
        return;
      }

      const cleanConfig: CustomFirebaseWebConfig = {
        projectId: parsed.projectId.trim(),
        apiKey: parsed.apiKey.trim(),
        appId: parsed.appId.trim(),
        authDomain: parsed.authDomain.trim(),
        firestoreDatabaseId:
          typeof parsed.firestoreDatabaseId === 'string'
            ? parsed.firestoreDatabaseId.trim()
            : undefined,
        storageBucket:
          typeof parsed.storageBucket === 'string'
            ? parsed.storageBucket.trim()
            : undefined,
        messagingSenderId:
          typeof parsed.messagingSenderId === 'string'
            ? parsed.messagingSenderId.trim()
            : undefined,
      };

      onUpdateConfig({
        ...dbConfig,
        provider: 'firebase',
        customFirebaseConfig: cleanConfig,
      });
      setTestResult({
        ok: true,
        message: `Applied custom Firebase Web config (${cleanConfig.projectId}).`,
      });
    } catch {
      setFormError('Invalid JSON format for Firebase Web config.');
    }
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
    setTestResult({
      ok: true,
      message: 'Supabase configuration saved locally. Click "Test Connection" or "Sync Now" to verify.',
    });
  };

  const handleTest = async () => {
    setActionBusy(true);
    setTestResult(null);
    setFormError(null);
    try {
      const res = await onTestConnection();
      setTestResult(res);
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Connection check failed.',
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleSync = async () => {
    setActionBusy(true);
    setTestResult(null);
    setFormError(null);
    try {
      await onSyncNow();
      setTestResult({
        ok: true,
        message: 'Workspace synchronized successfully with cloud database.',
      });
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Cloud sync failed.',
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
        err instanceof Error ? err.message : 'Could not complete Google sign-in.',
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

  const activeFirebaseProject =
    dbConfig.customFirebaseConfig?.projectId || provisioned.projectId;
  const activeFirebaseDbId =
    dbConfig.customFirebaseConfig?.firestoreDatabaseId ||
    provisioned.firestoreDatabaseId ||
    '(default)';

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

          {/* Feedback Banners */}
          {(formError || syncError) && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="break-words">{formError || syncError}</span>
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
              <span>{testResult.message}</span>
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
                  Provisioned NoSQL sync + hardened rules
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
                  <p className="text-xs font-bold text-slate-900">
                    Provisioned Cloud Firestore Instance
                  </p>
                  <p className="font-mono text-[11px] text-slate-600 break-all">
                    Project: {activeFirebaseProject} · DB: {activeFirebaseDbId}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCustomFirebase((v) => !v)}
                  className="text-xs font-semibold text-forest-700 hover:underline cursor-pointer"
                >
                  {showCustomFirebase ? 'Hide Custom Config' : 'Paste Custom Config'}
                </button>
              </div>

              {/* Google Cloud Auth Connection */}
              <div className="rounded-lg border border-emerald-200 bg-forest-50/50 p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <ShieldCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-forest-700"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900">
                      {firebaseUserEmail
                        ? `Cloud Auth Active: ${firebaseUserEmail}`
                        : 'Authorize Cloud Firestore Sync'}
                    </p>
                    <p className="text-[11px] text-slate-600 break-all">
                      {firebaseUserUid
                        ? `Workspace UID: ${firebaseUserUid}`
                        : 'Connect your Google account so hardened Firestore rules isolate and sync your workspace.'}
                    </p>
                  </div>
                </div>

                {firebaseUserEmail ? (
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
                )}
              </div>

              {showCustomFirebase && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <label
                    htmlFor="custom-firebase-json"
                    className="block text-xs font-semibold text-slate-800"
                  >
                    Custom Firebase Web SDK Config JSON (Leave blank to use provisioned DB)
                  </label>
                  <textarea
                    id="custom-firebase-json"
                    rows={5}
                    value={customFirebaseJson}
                    onChange={(e) => setCustomFirebaseJson(e.target.value)}
                    placeholder='{"apiKey": "...", "authDomain": "...", "projectId": "...", "appId": "...", "firestoreDatabaseId": "(default)"}'
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-[11px] text-slate-900 focus:border-forest-600 focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleApplyCustomFirebase}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                    >
                      Apply Firebase Config
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
              lots, batches, passports, and mill orders remain preserved locally. Switch
              back to Firebase or Supabase at any time to push cached records to the cloud.
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {selectedProvider !== 'local' && (
                <>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => {
                      void handleTest();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                  >
                    <Database className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Test Connection</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => {
                      void handleSync();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-forest-700 px-4 py-2 text-xs font-semibold text-white hover:bg-forest-800 disabled:opacity-60 cursor-pointer"
                  >
                    {actionBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>Sync Now</span>
                  </button>
                </>
              )}
            </div>

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
