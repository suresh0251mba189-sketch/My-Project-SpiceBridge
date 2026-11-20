import { useCallback, useEffect, useState } from 'react';
import { OPERATIONAL_STAGES, SEED_FARMER_LOTS } from '../data/seedLots';
import {
  AIChallengeFeedback,
  AIChallengeFinalReview,
  AIChallengeQuestion,
  AIChallengeState,
  AppView,
  BatchStatus,
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
  StageId,
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

  const addLot = useCallback((newLot: FarmerLot) => {
    setLots((prev) => [newLot, ...prev]);
    setSelectedLotId(newLot.id);
  }, []);

  const addBatch = useCallback((newBatch: ProcessingBatch) => {
    setBatches((prev) => [newBatch, ...prev]);
  }, []);

  const updateBatchStatus = useCallback((batchId: string, status: BatchStatus) => {
    setBatches((prev) =>
      prev.map((batch) => (batch.id === batchId ? { ...batch, status } : batch)),
    );
  }, []);

  const removeBatch = useCallback((batchId: string) => {
    setBatches((prev) => prev.filter((batch) => batch.id !== batchId));
    setMillOrders((prev) => prev.filter((order) => order.batchId !== batchId));
  }, []);

  const addMillOrder = useCallback((newOrder: MillOrder) => {
    setMillOrders((prev) => [newOrder, ...prev]);
  }, []);

  const updateMillOrderStatus = useCallback(
    (orderId: string, settlementStatus: SettlementStatus) => {
      setMillOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, settlementStatus } : order,
        ),
      );
    },
    [],
  );

  const removeMillOrder = useCallback((orderId: string) => {
    setMillOrders((prev) => prev.filter((order) => order.id !== orderId));
  }, []);

  const updateAlternative = useCallback(
    (id: string, patch: Partial<CompetitorAlternative>) => {
      setAlternatives((prev) =>
        prev.map((alt) => (alt.id === id ? { ...alt, ...patch } : alt)),
      );
    },
    [],
  );

  const addAlternative = useCallback(() => {
    setAlternatives((prev) => {
      if (prev.length >= 6) return prev;
      return [...prev, createBlankAlternative(prev.length + 1)];
    });
  }, []);

  const removeAlternative = useCallback((id: string) => {
    setAlternatives((prev) => {
      if (prev.length <= 3) return prev;
      return prev.filter((alt) => alt.id !== id);
    });
  }, []);

  const updatePositioningAxes = useCallback((patch: Partial<PositioningAxes>) => {
    setPositioningState((prev) => ({
      ...prev,
      axes: { ...prev.axes, ...patch },
    }));
  }, []);

  const updateSpiceBridgeScore = useCallback((patch: Partial<PositioningScore>) => {
    setPositioningState((prev) => ({
      ...prev,
      spiceBridgeScore: { ...prev.spiceBridgeScore, ...patch },
    }));
  }, []);

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
    },
    [],
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
    },
    [alternatives],
  );

  const updateFinalStatementText = useCallback((finalStatement: string) => {
    setPositioningStatement((prev) => ({
      ...prev,
      finalStatement,
      isManuallyEdited: true,
    }));
  }, []);

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
  }, [alternatives]);

  const savePositioningStatement = useCallback(() => {
    setPositioningStatement((prev) => ({
      ...prev,
      savedAt: new Date().toISOString(),
    }));
  }, []);

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
    },
    [],
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
    },
    [],
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
    },
    [],
  );

  const setAIChallengeCurrentIndex = useCallback((index: number) => {
    setAIChallengeState((prev) => ({
      ...prev,
      currentIndex: Math.max(0, Math.min(2, index)),
    }));
  }, []);

  const completeAIChallengeWithReview = useCallback(
    (review: AIChallengeFinalReview) => {
      setAIChallengeState((prev) => ({
        ...prev,
        finalReview: review,
        completedAt: new Date().toISOString(),
      }));
    },
    [],
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

  const resetAppFromStart = useCallback(() => {
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
  }, []);

  const resetToSampleLots = useCallback(() => {
    setLots(SEED_FARMER_LOTS);
    setSelectedLotId(SEED_FARMER_LOTS[0].id);
    setBatches([]);
    setMillOrders([]);
  }, []);

  return {
    lots,
    selectedLotId,
    setSelectedLotId,
    addLot,
    batches,
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
    resetToSampleLots,
  };
}


