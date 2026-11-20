import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  CustomFirebaseWebConfig,
  OperatorSession,
  SpiceBridgeWorkspaceSnapshot,
} from '../types/spicebridge';
import {
  OperationType,
  getFirebaseServices,
  handleFirestoreError,
} from './firebaseClient';
import {
  deriveTraceabilityPassports,
  fromDbBatch,
  fromDbFarmerLot,
  fromDbMillOrder,
  toDbBatch,
  toDbFarmerLot,
  toDbMillOrder,
} from './recordMappers';

export interface CloudPullResult {
  hasRemoteData: boolean;
  snapshot: Partial<SpiceBridgeWorkspaceSnapshot>;
  remoteUpdatedAtMs: number;
}

function timestampToMs(val: unknown): number {
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (val && typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().getTime();
  }
  return 0;
}

async function ensureWorkspaceRoot(
  uid: string,
  operatorSession: OperatorSession | null,
  customConfig?: CustomFirebaseWebConfig | null,
): Promise<void> {
  const { db, auth } = getFirebaseServices(customConfig);
  const path = `workspaces/${uid}`;
  const ref = doc(db, 'workspaces', uid);

  const operatorEmail = (
    operatorSession?.email ||
    auth.currentUser?.email ||
    'operator@spicebridge.in'
  ).slice(0, 160);
  const operatorName = (
    operatorSession?.name ||
    auth.currentUser?.displayName ||
    'SpiceBridge Operator'
  ).slice(0, 120);
  const operatorRole = (operatorSession?.role || 'Founder').slice(0, 80);

  let existsSnap = false;
  try {
    const snap = await getDoc(ref);
    existsSnap = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path, auth);
  }

  if (!existsSnap) {
    try {
      await setDoc(ref, {
        ownerId: uid,
        operatorEmail,
        operatorName,
        operatorRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path, auth);
    }
  } else {
    try {
      await updateDoc(ref, {
        operatorEmail,
        operatorName,
        operatorRole,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  }
}

export async function pullWorkspaceFromFirestore(
  uid: string,
  customConfig?: CustomFirebaseWebConfig | null,
): Promise<CloudPullResult> {
  const { db, auth } = getFirebaseServices(customConfig);
  const base = `workspaces/${uid}`;

  let maxUpdatedMs = 0;

  // Check if workspace root exists first
  let rootExists = false;
  try {
    const rootSnap = await getDoc(doc(db, 'workspaces', uid));
    rootExists = rootSnap.exists();
    if (rootExists) {
      maxUpdatedMs = Math.max(maxUpdatedMs, timestampToMs(rootSnap.data()?.updatedAt));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, base, auth);
  }

  if (!rootExists) {
    return {
      hasRemoteData: false,
      snapshot: {},
      remoteUpdatedAtMs: 0,
    };
  }

  const snapshot: Partial<SpiceBridgeWorkspaceSnapshot> = {};

  // 1. Farmer Lots
  const lotsPath = `${base}/farmer_lots`;
  try {
    const lotsSnap = await getDocs(collection(db, lotsPath));
    if (!lotsSnap.empty) {
      snapshot.lots = lotsSnap.docs.map((d) => {
        const data = d.data();
        maxUpdatedMs = Math.max(maxUpdatedMs, timestampToMs(data.updated_at));
        return fromDbFarmerLot(data);
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, lotsPath, auth);
  }

  // 2. Micro-Hub Batches
  const batchesPath = `${base}/micro_hub_batches`;
  try {
    const batchesSnap = await getDocs(collection(db, batchesPath));
    if (!batchesSnap.empty) {
      snapshot.batches = batchesSnap.docs.map((d) => {
        const data = d.data();
        maxUpdatedMs = Math.max(maxUpdatedMs, timestampToMs(data.updated_at));
        return fromDbBatch(data);
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, batchesPath, auth);
  }

  // 4. Mill Orders
  const ordersPath = `${base}/mill_orders`;
  try {
    const ordersSnap = await getDocs(collection(db, ordersPath));
    if (!ordersSnap.empty) {
      snapshot.millOrders = ordersSnap.docs.map((d) => {
        const data = d.data();
        maxUpdatedMs = Math.max(maxUpdatedMs, timestampToMs(data.updated_at));
        return fromDbMillOrder(data);
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ordersPath, auth);
  }

  // 5. Strategy & Competition Lab State
  const strategyPath = `${base}/strategy_state/active`;
  try {
    const strategySnap = await getDoc(doc(db, base, 'strategy_state', 'active'));
    if (strategySnap.exists()) {
      const data = strategySnap.data();
      maxUpdatedMs = Math.max(maxUpdatedMs, timestampToMs(data.updated_at));
      if (Array.isArray(data.competitors_list)) {
        snapshot.alternatives = data.competitors_list;
      }
      if (data.positioning_axes && data.positioning_scores) {
        snapshot.positioningState = {
          axes: data.positioning_axes,
          spiceBridgeScore: data.positioning_scores.spiceBridgeScore ?? {
            x: null,
            y: null,
          },
          alternativeScores: data.positioning_scores.alternativeScores ?? {},
        };
      }
      if (data.positioning_statement) {
        snapshot.positioningStatement = data.positioning_statement;
      }
      if (data.strategy_challenge_history) {
        snapshot.aiChallengeState = data.strategy_challenge_history;
      }
      if (typeof data.selected_lot_id === 'string' && data.selected_lot_id) {
        snapshot.selectedLotId = data.selected_lot_id;
      }
      if (typeof data.active_stage_id === 'string') {
        snapshot.activeStageId = data.active_stage_id as SpiceBridgeWorkspaceSnapshot['activeStageId'];
      }
      if (typeof data.active_view === 'string') {
        snapshot.activeView = data.active_view as SpiceBridgeWorkspaceSnapshot['activeView'];
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, strategyPath, auth);
  }

  const hasRemoteData = Boolean(
    (snapshot.lots && snapshot.lots.length > 0) ||
      (snapshot.batches && snapshot.batches.length > 0) ||
      (snapshot.millOrders && snapshot.millOrders.length > 0) ||
      snapshot.alternatives,
  );

  return {
    hasRemoteData,
    snapshot,
    remoteUpdatedAtMs: maxUpdatedMs,
  };
}

export async function pushWorkspaceToFirestore(
  uid: string,
  operatorSession: OperatorSession | null,
  workspace: SpiceBridgeWorkspaceSnapshot,
  customConfig?: CustomFirebaseWebConfig | null,
): Promise<void> {
  const { db, auth } = getFirebaseServices(customConfig);
  const base = `workspaces/${uid}`;

  await ensureWorkspaceRoot(uid, operatorSession, customConfig);

  // 1. Sync Farmer Lots
  const lotsColPath = `${base}/farmer_lots`;
  let existingLotIds = new Set<string>();
  try {
    const existingSnap = await getDocs(collection(db, lotsColPath));
    existingLotIds = new Set(existingSnap.docs.map((d) => d.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, lotsColPath, auth);
  }

  const targetLotIds = new Set<string>();
  for (const lot of workspace.lots) {
    const row = toDbFarmerLot(lot);
    targetLotIds.add(row.lot_id);
    const docPath = `${lotsColPath}/${row.lot_id}`;
    const docRef = doc(db, lotsColPath, row.lot_id);
    if (existingLotIds.has(row.lot_id)) {
      try {
        await updateDoc(docRef, {
          farmer_name: row.farmer_name,
          crop: row.crop,
          crop_label: row.crop_label,
          variety: row.variety,
          cluster_geography: row.cluster_geography,
          quantity_kg: row.quantity_kg,
          bags_50kg: row.bags_50kg,
          moisture_pct: row.moisture_pct,
          moisture_note: row.moisture_note,
          purity_pct: row.purity_pct,
          foreign_matter_note: row.foreign_matter_note,
          aroma_grade: row.aroma_grade,
          offered_price_per_kg: row.offered_price_per_kg,
          mandi_price_per_kg: row.mandi_price_per_kg,
          price_note: row.price_note,
          bank_transfer_status: row.bank_transfer_status,
          assay_status: row.assay_status,
          assayed_at: row.assayed_at,
          updated_at: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, docPath, auth);
      }
    } else {
      try {
        await setDoc(docRef, {
          ownerId: uid,
          ...row,
          updated_at: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, docPath, auth);
      }
    }
  }
  for (const staleId of existingLotIds) {
    if (!targetLotIds.has(staleId)) {
      const docPath = `${lotsColPath}/${staleId}`;
      try {
        await deleteDoc(doc(db, lotsColPath, staleId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, docPath, auth);
      }
    }
  }

  // 2. Sync Micro-Hub Batches
  const batchesColPath = `${base}/micro_hub_batches`;
  let existingBatchIds = new Set<string>();
  try {
    const existingSnap = await getDocs(collection(db, batchesColPath));
    existingBatchIds = new Set(existingSnap.docs.map((d) => d.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, batchesColPath, auth);
  }

  const targetBatchIds = new Set<string>();
  for (const batch of workspace.batches) {
    const mapped = toDbBatch(batch);
    targetBatchIds.add(mapped.batch_id);
    const docPath = `${batchesColPath}/${mapped.batch_id}`;
    const docRef = doc(db, batchesColPath, mapped.batch_id);
    const mutableFields = {
      crop: mapped.crop,
      total_kg: mapped.total_kg,
      source_lot_ids: mapped.source_lot_ids,
      cleaning_hours: mapped.cleaning_hours,
      bottleneck_utilisation_pct: mapped.bottleneck_utilisation_pct,
      status: mapped.status,
      hub_line: mapped.hub_line,
      shift_schedule: mapped.shift_schedule,
      is_mixed_crop: mapped.is_mixed_crop,
      total_bags: mapped.total_bags,
      fill_percent: mapped.fill_percent,
      batch_equivalent: mapped.batch_equivalent,
      weighted_moisture: mapped.weighted_moisture,
      weighted_purity: mapped.weighted_purity,
      updated_at: serverTimestamp(),
    };

    if (existingBatchIds.has(mapped.batch_id)) {
      try {
        await updateDoc(docRef, mutableFields);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, docPath, auth);
      }
    } else {
      try {
        await setDoc(docRef, {
          ownerId: uid,
          batch_id: mapped.batch_id,
          ...mutableFields,
          created_at: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, docPath, auth);
      }
    }
  }
  for (const staleId of existingBatchIds) {
    if (!targetBatchIds.has(staleId)) {
      const docPath = `${batchesColPath}/${staleId}`;
      try {
        await deleteDoc(doc(db, batchesColPath, staleId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, docPath, auth);
      }
    }
  }

  // 3. Sync Traceability Passports
  const passportsColPath = `${base}/traceability_passports`;
  const derivedPassports = deriveTraceabilityPassports(
    workspace.batches,
    workspace.lots,
  );
  let existingPassportIds = new Set<string>();
  try {
    const existingSnap = await getDocs(collection(db, passportsColPath));
    existingPassportIds = new Set(existingSnap.docs.map((d) => d.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, passportsColPath, auth);
  }

  const targetPassportIds = new Set<string>();
  for (const passport of derivedPassports) {
    targetPassportIds.add(passport.passport_id);
    const docPath = `${passportsColPath}/${passport.passport_id}`;
    const docRef = doc(db, passportsColPath, passport.passport_id);
    if (existingPassportIds.has(passport.passport_id)) {
      try {
        await updateDoc(docRef, {
          qr_payload: passport.qr_payload,
          cluster_breakdown: passport.cluster_breakdown,
          composite_moisture_pct: passport.composite_moisture_pct,
          purity_pct: passport.purity_pct,
          compliance_status: passport.compliance_status,
          updated_at: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, docPath, auth);
      }
    } else {
      try {
        await setDoc(docRef, {
          ownerId: uid,
          ...passport,
          updated_at: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, docPath, auth);
      }
    }
  }
  for (const staleId of existingPassportIds) {
    if (!targetPassportIds.has(staleId)) {
      const docPath = `${passportsColPath}/${staleId}`;
      try {
        await deleteDoc(doc(db, passportsColPath, staleId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, docPath, auth);
      }
    }
  }

  // 4. Sync B2B Mill Orders & Settlements
  const ordersColPath = `${base}/mill_orders`;
  const existingOrdersMap = new Map<string, string>();
  try {
    const existingSnap = await getDocs(collection(db, ordersColPath));
    for (const d of existingSnap.docs) {
      existingOrdersMap.set(d.id, String(d.data()?.settlement_status ?? ''));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ordersColPath, auth);
  }

  const targetOrderIds = new Set<string>();
  for (const order of workspace.millOrders) {
    const mapped = toDbMillOrder(order);
    targetOrderIds.add(mapped.order_id);
    const docPath = `${ordersColPath}/${mapped.order_id}`;
    const docRef = doc(db, ordersColPath, mapped.order_id);
    if (existingOrdersMap.has(mapped.order_id)) {
      const prevStatus = existingOrdersMap.get(mapped.order_id);
      if (prevStatus !== 'settled' && prevStatus !== mapped.settlement_status) {
        try {
          await updateDoc(docRef, {
            settlement_status: mapped.settlement_status,
            updated_at: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, docPath, auth);
        }
      }
    } else {
      try {
        await setDoc(docRef, {
          ownerId: uid,
          ...mapped,
          updated_at: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, docPath, auth);
      }
    }
  }
  for (const staleId of existingOrdersMap.keys()) {
    if (!targetOrderIds.has(staleId)) {
      const docPath = `${ordersColPath}/${staleId}`;
      try {
        await deleteDoc(doc(db, ordersColPath, staleId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, docPath, auth);
      }
    }
  }

  // 5. Sync Strategy & Competition Lab State
  const strategyPath = `${base}/strategy_state/active`;
  const strategyRef = doc(db, base, 'strategy_state', 'active');
  let strategyExists = false;
  try {
    const snap = await getDoc(strategyRef);
    strategyExists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, strategyPath, auth);
  }

  const strategyPayload = {
    competitors_list: workspace.alternatives.slice(0, 6),
    positioning_axes: workspace.positioningState.axes,
    positioning_scores: {
      spiceBridgeScore: workspace.positioningState.spiceBridgeScore,
      alternativeScores: workspace.positioningState.alternativeScores,
    },
    positioning_statement: workspace.positioningStatement,
    strategy_challenge_history: workspace.aiChallengeState,
    selected_lot_id: (workspace.selectedLotId || '').slice(0, 64),
    active_stage_id: (workspace.activeStageId || 'stage-1-assay').slice(0, 64),
    active_view: (workspace.activeView || 'lot-bank').slice(0, 64),
    updated_at: serverTimestamp(),
  };

  if (strategyExists) {
    try {
      await updateDoc(strategyRef, strategyPayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, strategyPath, auth);
    }
  } else {
    try {
      await setDoc(strategyRef, {
        ownerId: uid,
        ...strategyPayload,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, strategyPath, auth);
    }
  }
}
