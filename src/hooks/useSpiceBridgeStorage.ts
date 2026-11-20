import { User } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OPERATIONAL_STAGES, SEED_FARMER_LOTS } from '../data/seedLots';
import {
  signInFirebaseWithGoogle,
  signOutFirebaseAuth,
  subscribeFirebaseAuth,
  testFirestoreConnection,
} from '../db/firebaseClient';
import {
  pullWorkspaceFromFirestore,
  pushWorkspaceToFirestore,
} from '../db/firestoreAdapter';
import { mergeWorkspaceSnapshots } from '../db/mergeWorkspace';
import { deriveTraceabilityPassports } from '../db/recordMappers';
import {
  pullWorkspaceFromSupabase,
  pushWorkspaceToSupabase,
  testSupabaseConnection,
} from '../db/supabaseAdapter';
import {
  AIChallengeFeedback,
  AIChallengeFinalReview,
  AIChallengeQuestion,
  AIChallengeState,
  AppView,
  BatchStatus,
  CloudDatabaseConfig,
  CompetitorAlternative,
  FarmerLot,
  MillOrder,
  OperatorSession,
  PositioningAxes,
  PositioningMapState,
  PositioningScore,
  PositioningStatementState,
  ProcessingBatch,
  SettlementStatus,
  SpiceBridgeWorkspaceSnapshot,
  StageId,
  SyncStatus,
} from '../types/spicebridge';
import {
  composePositioningStatement,
  createBlankAlternative,
  createInitialAIChallengeState,
  createInitialPositioningState,
  createInitialPositioningStatementState,
} from '../utils/formatters';

const LOTS_STORAGE_KEY = 'spicebridge_lots_v1';
const SELECTED_LOT_STORAGE_KEY = 'spicebridge_selected_lot_id_v1';
const BATCHES_STORAGE_KEY = 'spicebridge_batches_v1';
const MILL_ORDERS_STORAGE_KEY = 'spicebridge_mill_orders_v1';
const ACTIVE_STAGE_STORAGE_KEY = 'spicebridge_active_stage_v1';
const ACTIVE_VIEW_STORAGE_KEY = 'spicebridge_active_view_v1';
const COMPETITION_ALTERNATIVES_KEY = 'spicebridge_competition_alternatives_v1';
const POSITIONING_MAP_STORAGE_KEY = 'spicebridge_positioning_map_v1';
const POSITIONING_STATEMENT_KEY = 'spicebridge_positioning_statement_v1';
const AI_CHALLENGE_STORAGE_KEY = 'spicebridge_ai_challenge_v1';
const OPERATOR_SESSION_STORAGE_KEY = 'spicebridge_operator_session_v1';
const DB_CONFIG_STORAGE_KEY = 'spicebridge_db_config_v1';
const SYNC_META_STORAGE_KEY = 'spicebridge_sync_meta_v1';

interface SyncMetaState {
  lastSyncedAt: string | null;
  hasPendingChanges: boolean;
  lastLocalMutationMs: number;
}

function createInitialBlankAlternatives(): CompetitorAlternative[] {
  return [
    createBlankAlternative(1),
    createBlankAlternative(2),
    createBlankAlternative(3),
  ];
}

function readStoredLots(): FarmerLot[] {
  try {
    const raw = window.localStorage.getItem(LOTS_STORAGE_KEY);
    if (!raw) return SEED_FARMER_LOTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as FarmerLot[];
    }
  } catch {
    // Fallback to default seed data if localStorage is unavailable or corrupted
  }
  return SEED_FARMER_LOTS;
}

function readStoredSelectedId(lots: FarmerLot[]): string {
  try {
    const storedId = window.localStorage.getItem(SELECTED_LOT_STORAGE_KEY);
    if (storedId && lots.some((lot) => lot.id === storedId)) {
      return storedId;
    }
  } catch {
    // Ignore storage read errors
  }
  return lots[0]?.id ?? '';
}

function readStoredBatches(): ProcessingBatch[] {
  try {
    const raw = window.localStorage.getItem(BATCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as ProcessingBatch[];
    }
  } catch {
    // Ignore corrupted batch storage
  }
  return [];
}

function readStoredMillOrders(): MillOrder[] {
  try {
    const raw = window.localStorage.getItem(MILL_ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as MillOrder[];
    }
  } catch {
    // Ignore corrupted mill order storage
  }
  return [];
}

function readStoredActiveStage(): StageId {
  try {
    const stored = window.localStorage.getItem(ACTIVE_STAGE_STORAGE_KEY) as StageId | null;
    if (
      stored &&
      OPERATIONAL_STAGES.some((stage) => stage.id === stored && stage.active)
    ) {
      return stored;
    }
  } catch {
    // Ignore storage errors
  }
  return 'stage-1-assay';
}

function readStoredActiveView(): AppView {
  try {
    const stored = window.localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY);
    if (
      stored === 'lot-bank' ||
      stored === 'competition-lab' ||
      stored === 'battlefield-map' ||
      stored === 'positioning-statement' ||
      stored === 'ai-challenge'
    ) {
      return stored;
    }
  } catch {
    // Ignore storage errors
  }
  return 'lot-bank';
}

function readStoredAlternatives(): CompetitorAlternative[] {
  try {
    const raw = window.localStorage.getItem(COMPETITION_ALTERNATIVES_KEY);
    if (!raw) return createInitialBlankAlternatives();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 3 && parsed.length <= 6) {
      return parsed as CompetitorAlternative[];
    }
  } catch {
    // Ignore corrupted storage
  }
  return createInitialBlankAlternatives();
}

function readStoredPositioningState(): PositioningMapState {
  try {
    const raw = window.localStorage.getItem(POSITIONING_MAP_STORAGE_KEY);
    if (!raw) return createInitialPositioningState();
    const parsed = JSON.parse(raw) as Partial<PositioningMapState>;
    const base = createInitialPositioningState();
    return {
      axes: {
        ...base.axes,
        ...(parsed.axes ?? {}),
      },
      spiceBridgeScore: {
        ...base.spiceBridgeScore,
        ...(parsed.spiceBridgeScore ?? {}),
      },
      alternativeScores:
        parsed.alternativeScores && typeof parsed.alternativeScores === 'object'
          ? parsed.alternativeScores
          : {},
    };
  } catch {
    // Ignore corrupted storage
  }
  return createInitialPositioningState();
}

function readStoredPositioningStatement(
  initialLot: FarmerLot | undefined,
): PositioningStatementState {
  const base = createInitialPositioningStatementState(initialLot);
  try {
    const raw = window.localStorage.getItem(POSITIONING_STATEMENT_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<PositioningStatementState>;
    return {
      ...base,
      ...parsed,
    };
  } catch {
    // Ignore corrupted storage
  }
  return base;
}

function readStoredAIChallengeState(): AIChallengeState {
  const base = createInitialAIChallengeState();
  try {
    const raw = window.localStorage.getItem(AI_CHALLENGE_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<AIChallengeState>;
    return {
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      responses: Array.isArray(parsed.responses)
        ? parsed.responses
        : ['', '', ''],
      feedbacks: Array.isArray(parsed.feedbacks)
        ? parsed.feedbacks
        : [null, null, null],
      currentIndex:
        typeof parsed.currentIndex === 'number' &&
        parsed.currentIndex >= 0 &&
        parsed.currentIndex <= 2
          ? parsed.currentIndex
          : 0,
      finalReview: parsed.finalReview ?? null,
      completedAt: parsed.completedAt ?? null,
    };
  } catch {
    // Ignore corrupted storage
  }
  return base;
}

function readStoredOperatorSession(): OperatorSession | null {
  try {
    const raw = window.localStorage.getItem(OPERATOR_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OperatorSession>;
    if (
      parsed &&
      parsed.mfaVerified === true &&
      typeof parsed.email === 'string' &&
      parsed.email.trim().length > 0 &&
      typeof parsed.name === 'string' &&
      parsed.name.trim().length > 0 &&
      typeof parsed.role === 'string' &&
      (parsed.mfaMethod === 'email_otp' ||
        parsed.mfaMethod === 'authenticator_backup') &&
      typeof parsed.verifiedAt === 'string'
    ) {
      return parsed as OperatorSession;
    }
  } catch {
    // Ignore corrupted session storage
  }
  return null;
}

function readStoredDbConfig(): CloudDatabaseConfig {
  try {
    const raw = window.localStorage.getItem(DB_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CloudDatabaseConfig>;
      if (
        parsed.provider === 'firebase' ||
        parsed.provider === 'supabase' ||
        parsed.provider === 'local'
      ) {
        return {
          provider: parsed.provider,
          customFirebaseConfig: parsed.customFirebaseConfig ?? null,
          supabaseConfig: parsed.supabaseConfig ?? null,
        };
      }
    }
  } catch {
    // Fallback to provisioned Firebase adapter
  }
  return {
    provider: 'firebase',
    customFirebaseConfig: null,
    supabaseConfig: null,
  };
}

function readStoredSyncMeta(): SyncMetaState {
  try {
    const raw = window.localStorage.getItem(SYNC_META_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SyncMetaState>;
      return {
        lastSyncedAt:
          typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
        hasPendingChanges: Boolean(parsed.hasPendingChanges),
        lastLocalMutationMs:
          typeof parsed.lastLocalMutationMs === 'number'
            ? parsed.lastLocalMutationMs
            : 0,
      };
    }
  } catch {
    // Ignore storage errors
  }
  return {
    lastSyncedAt: null,
    hasPendingChanges: false,
    lastLocalMutationMs: 0,
  };
}

export function useSpiceBridgeStorage() {
  const [lots, setLots] = useState<FarmerLot[]>(() => readStoredLots());
  const [selectedLotId, setSelectedLotId] = useState<string>(() =>
    readStoredSelectedId(readStoredLots()),
  );
  const [batches, setBatches] = useState<ProcessingBatch[]>(() => readStoredBatches());
  const [millOrders, setMillOrders] = useState<MillOrder[]>(() =>
    readStoredMillOrders(),
  );
  const [activeStageId, setActiveStageId] = useState<StageId>(() =>
    readStoredActiveStage(),
  );
  const [activeView, setActiveView] = useState<AppView>(() =>
    readStoredActiveView(),
  );
  const [alternatives, setAlternatives] = useState<CompetitorAlternative[]>(() =>
    readStoredAlternatives(),
  );
  const [positioningState, setPositioningState] = useState<PositioningMapState>(() =>
    readStoredPositioningState(),
  );
  const [positioningStatement, setPositioningStatement] =
    useState<PositioningStatementState>(() => {
      const initialLots = readStoredLots();
      const initialSelectedId = readStoredSelectedId(initialLots);
      const initialLot =
        initialLots.find((l) => l.id === initialSelectedId) ?? initialLots[0];
      return readStoredPositioningStatement(initialLot);
    });
  const [aiChallengeState, setAIChallengeState] = useState<AIChallengeState>(
    () => readStoredAIChallengeState(),
  );
  const [operatorSession, setOperatorSession] = useState<OperatorSession | null>(
    () => readStoredOperatorSession(),
  );

  // Cloud DB & Resilience state
  const [dbConfig, setDbConfig] = useState<CloudDatabaseConfig>(() =>
    readStoredDbConfig(),
  );
  const [syncMeta, setSyncMeta] = useState<SyncMetaState>(() => readStoredSyncMeta());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local_cache');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isNavigatorOnline, setIsNavigatorOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [localMutationVersion, setLocalMutationVersion] = useState(0);

  const hydratedCloudSessionRef = useRef<string | null>(null);

  const passports = useMemo(
    () => deriveTraceabilityPassports(batches, lots),
    [batches, lots],
  );

  const currentSnapshot = useMemo<SpiceBridgeWorkspaceSnapshot>(
    () => ({
      lots,
      selectedLotId,
      batches,
      passports,
      millOrders,
      activeStageId,
      activeView,
      alternatives,
      positioningState,
      positioningStatement,
      aiChallengeState,
    }),
    [
      lots,
      selectedLotId,
      batches,
      passports,
      millOrders,
      activeStageId,
      activeView,
      alternatives,
      positioningState,
      positioningStatement,
      aiChallengeState,
    ],
  );

  const snapshotRef = useRef<SpiceBridgeWorkspaceSnapshot>(currentSnapshot);
  snapshotRef.current = currentSnapshot;

  const operatorSessionRef = useRef<OperatorSession | null>(operatorSession);
  operatorSessionRef.current = operatorSession;

  const syncMetaRef = useRef<SyncMetaState>(syncMeta);
  syncMetaRef.current = syncMeta;

  // Persist localStorage caches synchronously
  useEffect(() => {
    try {
      window.localStorage.setItem(LOTS_STORAGE_KEY, JSON.stringify(lots));
    } catch {
      // Ignore quota or storage errors
    }
  }, [lots]);

  useEffect(() => {
    try {
      if (selectedLotId) {
        window.localStorage.setItem(SELECTED_LOT_STORAGE_KEY, selectedLotId);
      }
    } catch {
      // Ignore storage errors
    }
  }, [selectedLotId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(BATCHES_STORAGE_KEY, JSON.stringify(batches));
    } catch {
      // Ignore storage errors
    }
  }, [batches]);

  useEffect(() => {
    try {
      window.localStorage.setItem(MILL_ORDERS_STORAGE_KEY, JSON.stringify(millOrders));
    } catch {
      // Ignore storage errors
    }
  }, [millOrders]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ACTIVE_STAGE_STORAGE_KEY, activeStageId);
    } catch {
      // Ignore storage errors
    }
  }, [activeStageId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, activeView);
    } catch {
      // Ignore storage errors
    }
  }, [activeView]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        COMPETITION_ALTERNATIVES_KEY,
        JSON.stringify(alternatives),
      );
    } catch {
      // Ignore storage errors
    }
  }, [alternatives]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        POSITIONING_MAP_STORAGE_KEY,
        JSON.stringify(positioningState),
      );
    } catch {
      // Ignore storage errors
    }
  }, [positioningState]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        POSITIONING_STATEMENT_KEY,
        JSON.stringify(positioningStatement),
      );
    } catch {
      // Ignore storage errors
    }
  }, [positioningStatement]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        AI_CHALLENGE_STORAGE_KEY,
        JSON.stringify(aiChallengeState),
      );
    } catch {
      // Ignore storage errors
    }
  }, [aiChallengeState]);

  useEffect(() => {
    try {
      if (operatorSession && operatorSession.mfaVerified) {
        window.localStorage.setItem(
          OPERATOR_SESSION_STORAGE_KEY,
          JSON.stringify(operatorSession),
        );
      } else {
        window.localStorage.removeItem(OPERATOR_SESSION_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [operatorSession]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DB_CONFIG_STORAGE_KEY, JSON.stringify(dbConfig));
    } catch {
      // Ignore storage errors
    }
  }, [dbConfig]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SYNC_META_STORAGE_KEY, JSON.stringify(syncMeta));
    } catch {
      // Ignore storage errors
    }
  }, [syncMeta]);

  // Listen to browser online/offline transitions
  useEffect(() => {
    const handleOnline = () => setIsNavigatorOnline(true);
    const handleOffline = () => setIsNavigatorOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscribe to Firebase Auth & run boot testConnection() when Firebase provider is active
  useEffect(() => {
    if (dbConfig.provider !== 'firebase') {
      setFirebaseUser(null);
      return;
    }

    let active = true;
    void testFirestoreConnection(dbConfig.customFirebaseConfig).then((res) => {
      if (!active) return;
      if (res.offline) {
        setSyncStatus(
          syncMetaRef.current.hasPendingChanges ? 'queued_offline' : 'local_cache',
        );
      }
    });

    const unsubscribe = subscribeFirebaseAuth((user) => {
      if (!active) return;
      setFirebaseUser(user);
    }, dbConfig.customFirebaseConfig);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [dbConfig.provider, dbConfig.customFirebaseConfig]);

  const isCloudReady = useMemo(() => {
    if (!isNavigatorOnline) return false;
    if (dbConfig.provider === 'firebase') {
      return Boolean(firebaseUser?.uid);
    }
    if (dbConfig.provider === 'supabase') {
      return Boolean(
        dbConfig.supabaseConfig?.url?.trim() &&
          dbConfig.supabaseConfig?.anonKey?.trim(),
      );
    }
    return false;
  }, [dbConfig, firebaseUser, isNavigatorOnline]);

  const applyMergedSnapshot = useCallback(
    (merged: SpiceBridgeWorkspaceSnapshot) => {
      setLots(merged.lots);
      setSelectedLotId(merged.selectedLotId);
      setBatches(merged.batches);
      setMillOrders(merged.millOrders);
      setAlternatives(merged.alternatives);
      setPositioningState(merged.positioningState);
      setPositioningStatement(merged.positioningStatement);
      setAIChallengeState(merged.aiChallengeState);
    },
    [],
  );

  const performFullSync = useCallback(async () => {
    if (dbConfig.provider === 'local') {
      setSyncStatus('local_cache');
      setSyncError(null);
      return;
    }
    if (!isNavigatorOnline) {
      setSyncStatus('queued_offline');
      return;
    }
    if (dbConfig.provider === 'firebase' && !firebaseUser?.uid) {
      setSyncStatus(
        syncMetaRef.current.hasPendingChanges ? 'queued_offline' : 'local_cache',
      );
      return;
    }
    if (
      dbConfig.provider === 'supabase' &&
      (!dbConfig.supabaseConfig?.url?.trim() ||
        !dbConfig.supabaseConfig?.anonKey?.trim())
    ) {
      setSyncStatus('local_cache');
      return;
    }

    setSyncStatus('syncing');
    setSyncError(null);

    try {
      const pullResult =
        dbConfig.provider === 'firebase'
          ? await pullWorkspaceFromFirestore(
              firebaseUser!.uid,
              dbConfig.customFirebaseConfig,
            )
          : await pullWorkspaceFromSupabase(dbConfig.supabaseConfig!);

      const merged = mergeWorkspaceSnapshots({
        local: snapshotRef.current,
        remote: pullResult.snapshot,
        hasPendingLocalChanges: syncMetaRef.current.hasPendingChanges,
        localLastModifiedMs: syncMetaRef.current.lastLocalMutationMs,
        remoteUpdatedAtMs: pullResult.remoteUpdatedAtMs,
      });

      if (pullResult.hasRemoteData) {
        applyMergedSnapshot(merged);
      }

      if (!pullResult.hasRemoteData || syncMetaRef.current.hasPendingChanges) {
        if (dbConfig.provider === 'firebase') {
          await pushWorkspaceToFirestore(
            firebaseUser!.uid,
            operatorSessionRef.current,
            merged,
            dbConfig.customFirebaseConfig,
          );
        } else {
          await pushWorkspaceToSupabase(dbConfig.supabaseConfig!, merged);
        }
      }

      const syncedIso = new Date().toISOString();
      setSyncMeta((prev) => ({
        ...prev,
        lastSyncedAt: syncedIso,
        hasPendingChanges: false,
      }));
      setSyncStatus('saved');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setSyncError(msg);
      if (
        msg.toLowerCase().includes('offline') ||
        msg.toLowerCase().includes('network') ||
        msg.toLowerCase().includes('failed to fetch')
      ) {
        setSyncStatus('queued_offline');
      } else {
        setSyncStatus('error');
      }
      throw error;
    }
  }, [applyMergedSnapshot, dbConfig, firebaseUser, isNavigatorOnline]);

  // Auto-hydrate and sync once when cloud connection becomes ready
  useEffect(() => {
    if (!isCloudReady) {
      hydratedCloudSessionRef.current = null;
      setSyncStatus(
        syncMetaRef.current.hasPendingChanges && dbConfig.provider !== 'local'
          ? 'queued_offline'
          : 'local_cache',
      );
      return;
    }

    const sessionSignature =
      dbConfig.provider === 'firebase'
        ? `firebase:${firebaseUser?.uid ?? ''}:${dbConfig.customFirebaseConfig?.projectId ?? 'default'}`
        : `supabase:${dbConfig.supabaseConfig?.url ?? ''}`;

    if (hydratedCloudSessionRef.current === sessionSignature) return;
    hydratedCloudSessionRef.current = sessionSignature;

    void performFullSync().catch(() => {
      // Error state is already recorded in syncError / syncStatus
    });
  }, [isCloudReady, dbConfig, firebaseUser, performFullSync]);

  // Debounced async cloud push whenever a local mutation occurs
  useEffect(() => {
    if (localMutationVersion === 0) return;
    if (dbConfig.provider === 'local') {
      setSyncStatus('local_cache');
      return;
    }
    if (!isCloudReady) {
      setSyncStatus('queued_offline');
      return;
    }

    const timer = window.setTimeout(() => {
      setSyncStatus('syncing');
      setSyncError(null);
      const runPush =
        dbConfig.provider === 'firebase'
          ? pushWorkspaceToFirestore(
              firebaseUser!.uid,
              operatorSessionRef.current,
              snapshotRef.current,
              dbConfig.customFirebaseConfig,
            )
          : pushWorkspaceToSupabase(
              dbConfig.supabaseConfig!,
              snapshotRef.current,
            );

      void runPush
        .then(() => {
          setSyncMeta((prev) => ({
            ...prev,
            lastSyncedAt: new Date().toISOString(),
            hasPendingChanges: false,
          }));
          setSyncStatus('saved');
        })
        .catch((error) => {
          const msg = error instanceof Error ? error.message : String(error);
          setSyncError(msg);
          setSyncStatus('queued_offline');
        });
    }, 650);

    return () => window.clearTimeout(timer);
  }, [localMutationVersion, dbConfig, firebaseUser, isCloudReady]);

  const markLocalDirty = useCallback(() => {
    const now = Date.now();
    setSyncMeta((prev) => ({
      ...prev,
      hasPendingChanges: dbConfig.provider !== 'local',
      lastLocalMutationMs: now,
    }));
    setLocalMutationVersion((v) => v + 1);
  }, [dbConfig.provider]);

  const syncStatusLabel = useMemo(() => {
    if (dbConfig.provider === 'local') return 'Local Offline Cache';
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing to Cloud...';
      case 'saved':
        return 'Saved to Cloud';
      case 'connected':
        return 'Cloud DB Connected';
      case 'queued_offline':
        return 'Queued Offline — Syncing';
      case 'error':
        return 'Sync Error — Offline Cache';
      default:
        return 'Local Offline Cache';
    }
  }, [dbConfig.provider, syncStatus]);

  const updateDbConfig = useCallback((next: CloudDatabaseConfig) => {
    hydratedCloudSessionRef.current = null;
    setSyncError(null);
    setDbConfig(next);
  }, []);

  const connectFirebaseGoogle = useCallback(async () => {
    setSyncError(null);
    await signInFirebaseWithGoogle(dbConfig.customFirebaseConfig);
  }, [dbConfig.customFirebaseConfig]);

  const disconnectFirebaseGoogle = useCallback(async () => {
    await signOutFirebaseAuth(dbConfig.customFirebaseConfig);
    setFirebaseUser(null);
    hydratedCloudSessionRef.current = null;
    setSyncStatus('local_cache');
  }, [dbConfig.customFirebaseConfig]);

  const testDbConnection = useCallback(async (): Promise<{
    ok: boolean;
    message: string;
  }> => {
    if (dbConfig.provider === 'local') {
      return {
        ok: true,
        message: 'Local Offline Cache (browser localStorage) is active.',
      };
    }
    if (dbConfig.provider === 'firebase') {
      const res = await testFirestoreConnection(dbConfig.customFirebaseConfig);
      return { ok: res.reachable, message: res.message };
    }
    if (!dbConfig.supabaseConfig?.url || !dbConfig.supabaseConfig?.anonKey) {
      return {
        ok: false,
        message: 'Enter your Supabase URL and Public Anon Key first.',
      };
    }
    const res = await testSupabaseConnection(dbConfig.supabaseConfig);
    return { ok: res.reachable, message: res.message };
  }, [dbConfig]);

  const syncNow = useCallback(async () => {
    if (dbConfig.provider === 'firebase' && !firebaseUser?.uid) {
      throw new Error(
        'Connect your Google account in Database Settings to authorize Cloud Firestore sync.',
      );
    }
    if (
      dbConfig.provider === 'supabase' &&
      (!dbConfig.supabaseConfig?.url || !dbConfig.supabaseConfig?.anonKey)
    ) {
      throw new Error('Save your Supabase URL and Public Anon Key before syncing.');
    }
    await performFullSync();
  }, [dbConfig, firebaseUser, performFullSync]);

  // Existing domain mutations (all preserved + marked dirty for async cloud sync)
  const addLot = useCallback(
    (newLot: FarmerLot) => {
      setLots((prev) => [newLot, ...prev]);
      setSelectedLotId(newLot.id);
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const addBatch = useCallback(
    (newBatch: ProcessingBatch) => {
      setBatches((prev) => [newBatch, ...prev]);
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const updateBatchStatus = useCallback(
    (batchId: string, status: BatchStatus) => {
      setBatches((prev) =>
        prev.map((batch) => (batch.id === batchId ? { ...batch, status } : batch)),
      );
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const removeBatch = useCallback(
    (batchId: string) => {
      setBatches((prev) => prev.filter((batch) => batch.id !== batchId));
      setMillOrders((prev) => prev.filter((order) => order.batchId !== batchId));
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const addMillOrder = useCallback(
    (newOrder: MillOrder) => {
      setMillOrders((prev) => [newOrder, ...prev]);
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const updateMillOrderStatus = useCallback(
    (orderId: string, settlementStatus: SettlementStatus) => {
      setMillOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, settlementStatus } : order,
        ),
      );
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const removeMillOrder = useCallback(
    (orderId: string) => {
      setMillOrders((prev) => prev.filter((order) => order.id !== orderId));
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const updateAlternative = useCallback(
    (id: string, patch: Partial<CompetitorAlternative>) => {
      setAlternatives((prev) =>
        prev.map((alt) => (alt.id === id ? { ...alt, ...patch } : alt)),
      );
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const addAlternative = useCallback(() => {
    setAlternatives((prev) => {
      if (prev.length >= 6) return prev;
      return [...prev, createBlankAlternative(prev.length + 1)];
    });
    markLocalDirty();
  }, [markLocalDirty]);

  const removeAlternative = useCallback(
    (id: string) => {
      setAlternatives((prev) => {
        if (prev.length <= 3) return prev;
        return prev.filter((alt) => alt.id !== id);
      });
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const updatePositioningAxes = useCallback(
    (patch: Partial<PositioningAxes>) => {
      setPositioningState((prev) => ({
        ...prev,
        axes: { ...prev.axes, ...patch },
      }));
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const updateSpiceBridgeScore = useCallback(
    (patch: Partial<PositioningScore>) => {
      setPositioningState((prev) => ({
        ...prev,
        spiceBridgeScore: { ...prev.spiceBridgeScore, ...patch },
      }));
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const updateAlternativeScore = useCallback(
    (alternativeId: string, patch: Partial<PositioningScore>) => {
      setPositioningState((prev) => {
        const current = prev.alternativeScores[alternativeId] ?? {
          x: null,
          y: null,
        };
        return {
          ...prev,
          alternativeScores: {
            ...prev.alternativeScores,
            [alternativeId]: { ...current, ...patch },
          },
        };
      });
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const updatePositioningStatementComponents = useCallback(
    (
      patch: Partial<
        Pick<
          PositioningStatementState,
          | 'targetCustomer'
          | 'category'
          | 'primaryBenefit'
          | 'mainAlternativeId'
          | 'reasonToBelieve'
        >
      >,
    ) => {
      setPositioningStatement((prev) => {
        const next = { ...prev, ...patch };
        const altName =
          alternatives.find((a) => a.id === next.mainAlternativeId)?.name.trim() ?? '';
        return {
          ...next,
          finalStatement: composePositioningStatement(next, altName),
          isManuallyEdited: false,
        };
      });
      markLocalDirty();
    },
    [alternatives, markLocalDirty],
  );

  const updateFinalStatementText = useCallback(
    (finalStatement: string) => {
      setPositioningStatement((prev) => ({
        ...prev,
        finalStatement,
        isManuallyEdited: true,
      }));
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const resetStatementToTemplate = useCallback(() => {
    setPositioningStatement((prev) => {
      const altName =
        alternatives.find((a) => a.id === prev.mainAlternativeId)?.name.trim() ?? '';
      return {
        ...prev,
        finalStatement: composePositioningStatement(prev, altName),
        isManuallyEdited: false,
      };
    });
    markLocalDirty();
  }, [alternatives, markLocalDirty]);

  const savePositioningStatement = useCallback(() => {
    setPositioningStatement((prev) => ({
      ...prev,
      savedAt: new Date().toISOString(),
    }));
    markLocalDirty();
  }, [markLocalDirty]);

  const startNewAIChallenge = useCallback(
    (questions: AIChallengeQuestion[]) => {
      setAIChallengeState({
        questions: questions.slice(0, 3),
        responses: ['', '', ''],
        feedbacks: [null, null, null],
        currentIndex: 0,
        finalReview: null,
        completedAt: null,
      });
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const updateAIChallengeResponse = useCallback(
    (index: number, responseText: string) => {
      setAIChallengeState((prev) => {
        const nextResponses = [...prev.responses];
        nextResponses[index] = responseText;
        return {
          ...prev,
          responses: nextResponses,
        };
      });
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const setAIChallengeFeedback = useCallback(
    (index: number, feedback: AIChallengeFeedback) => {
      setAIChallengeState((prev) => {
        const nextFeedbacks = [...prev.feedbacks];
        nextFeedbacks[index] = feedback;
        return {
          ...prev,
          feedbacks: nextFeedbacks,
        };
      });
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const setAIChallengeCurrentIndex = useCallback(
    (index: number) => {
      setAIChallengeState((prev) => ({
        ...prev,
        currentIndex: Math.max(0, Math.min(2, index)),
      }));
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const completeAIChallengeWithReview = useCallback(
    (review: AIChallengeFinalReview) => {
      setAIChallengeState((prev) => ({
        ...prev,
        finalReview: review,
        completedAt: new Date().toISOString(),
      }));
      markLocalDirty();
    },
    [markLocalDirty],
  );

  const completeOperatorSignIn = useCallback((session: OperatorSession) => {
    setOperatorSession({
      ...session,
      mfaVerified: true,
    });
  }, []);

  const lockOperatorSession = useCallback(() => {
    setOperatorSession(null);
  }, []);

  const restartFromBeginning = useCallback(() => {
    setActiveStageId('stage-1-assay');
    setActiveView('lot-bank');
    setOperatorSession(null);
  }, []);

  const clearAllSpiceBridgeLocalStorage = useCallback(() => {
    try {
      const keysToClear = [
        LOTS_STORAGE_KEY,
        SELECTED_LOT_STORAGE_KEY,
        BATCHES_STORAGE_KEY,
        MILL_ORDERS_STORAGE_KEY,
        ACTIVE_STAGE_STORAGE_KEY,
        ACTIVE_VIEW_STORAGE_KEY,
        COMPETITION_ALTERNATIVES_KEY,
        POSITIONING_MAP_STORAGE_KEY,
        POSITIONING_STATEMENT_KEY,
        AI_CHALLENGE_STORAGE_KEY,
        SYNC_META_STORAGE_KEY,
      ];
      for (const key of keysToClear) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore localStorage removal errors
    }
  }, []);

  const resetAppFromStart = useCallback(() => {
    try {
      window.localStorage.clear();
    } catch {
      clearAllSpiceBridgeLocalStorage();
    }
    setOperatorSession(null);
    setActiveStageId('stage-1-assay');
    setActiveView('lot-bank');
    setLots(SEED_FARMER_LOTS);
    setSelectedLotId(SEED_FARMER_LOTS[0].id);
    setBatches([]);
    setMillOrders([]);
    setAlternatives(createInitialBlankAlternatives());
    setPositioningState(createInitialPositioningState());
    setPositioningStatement(
      createInitialPositioningStatementState(SEED_FARMER_LOTS[0]),
    );
    setAIChallengeState(createInitialAIChallengeState());
    markLocalDirty();
  }, [clearAllSpiceBridgeLocalStorage, markLocalDirty]);

  const resetAllDemoData = useCallback(() => {
    const currentSession = operatorSessionRef.current;
    const currentDbConfig = dbConfig;
    try {
      window.localStorage.clear();
      if (currentSession && currentSession.mfaVerified) {
        window.localStorage.setItem(
          OPERATOR_SESSION_STORAGE_KEY,
          JSON.stringify(currentSession),
        );
      }
      window.localStorage.setItem(
        DB_CONFIG_STORAGE_KEY,
        JSON.stringify(currentDbConfig),
      );
    } catch {
      clearAllSpiceBridgeLocalStorage();
    }
    setActiveStageId('stage-1-assay');
    setActiveView('lot-bank');
    setLots(SEED_FARMER_LOTS);
    setSelectedLotId(SEED_FARMER_LOTS[0].id);
    setBatches([]);
    setMillOrders([]);
    setAlternatives(createInitialBlankAlternatives());
    setPositioningState(createInitialPositioningState());
    setPositioningStatement(
      createInitialPositioningStatementState(SEED_FARMER_LOTS[0]),
    );
    setAIChallengeState(createInitialAIChallengeState());
    markLocalDirty();
  }, [clearAllSpiceBridgeLocalStorage, dbConfig, markLocalDirty]);

  const resetToSampleLots = useCallback(() => {
    setLots(SEED_FARMER_LOTS);
    setSelectedLotId(SEED_FARMER_LOTS[0].id);
    setBatches([]);
    setMillOrders([]);
    markLocalDirty();
  }, [markLocalDirty]);

  return {
    lots,
    selectedLotId,
    setSelectedLotId,
    addLot,
    batches,
    passports,
    addBatch,
    updateBatchStatus,
    removeBatch,
    millOrders,
    addMillOrder,
    updateMillOrderStatus,
    removeMillOrder,
    activeStageId,
    setActiveStageId,
    activeView,
    setActiveView,
    alternatives,
    updateAlternative,
    addAlternative,
    removeAlternative,
    positioningState,
    updatePositioningAxes,
    updateSpiceBridgeScore,
    updateAlternativeScore,
    positioningStatement,
    updatePositioningStatementComponents,
    updateFinalStatementText,
    resetStatementToTemplate,
    savePositioningStatement,
    aiChallengeState,
    startNewAIChallenge,
    updateAIChallengeResponse,
    setAIChallengeFeedback,
    setAIChallengeCurrentIndex,
    completeAIChallengeWithReview,
    operatorSession,
    completeOperatorSignIn,
    lockOperatorSession,
    restartFromBeginning,
    resetAppFromStart,
    resetAllDemoData,
    resetToSampleLots,
    // Cloud Database & Sync API
    dbConfig,
    updateDbConfig,
    syncStatus,
    syncStatusLabel,
    lastSyncedAt: syncMeta.lastSyncedAt,
    hasPendingChanges: syncMeta.hasPendingChanges,
    isNavigatorOnline,
    syncError,
    firebaseUserEmail: firebaseUser?.email ?? null,
    firebaseUserUid: firebaseUser?.uid ?? null,
    connectFirebaseGoogle,
    disconnectFirebaseGoogle,
    testDbConnection,
    syncNow,
  };
}
