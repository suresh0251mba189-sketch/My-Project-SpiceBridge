import {
  FarmerLot,
  MillOrder,
  ProcessingBatch,
  SpiceBridgeWorkspaceSnapshot,
} from '../types/spicebridge';
import { hasAnyAlternativeEntry } from '../utils/formatters';

function mergeByIdWithFreshness<T extends { id: string }>(
  localItems: T[],
  remoteItems: T[],
  preferLocal: boolean,
): T[] {
  const byId = new Map<string, T>();
  if (preferLocal) {
    for (const item of remoteItems) byId.set(item.id, item);
    for (const item of localItems) byId.set(item.id, item);
  } else {
    for (const item of localItems) byId.set(item.id, item);
    for (const item of remoteItems) byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

/**
 * Merges cloud snapshot with local offline cache without unexpectedly clobbering
 * newer local mutations when pending changes exist.
 */
export function mergeWorkspaceSnapshots(params: {
  local: SpiceBridgeWorkspaceSnapshot;
  remote: Partial<SpiceBridgeWorkspaceSnapshot>;
  hasPendingLocalChanges: boolean;
  localLastModifiedMs: number;
  remoteUpdatedAtMs: number;
}): SpiceBridgeWorkspaceSnapshot {
  const {
    local,
    remote,
    hasPendingLocalChanges,
    localLastModifiedMs,
    remoteUpdatedAtMs,
  } = params;

  const preferLocal =
    hasPendingLocalChanges || localLastModifiedMs > remoteUpdatedAtMs;

  const mergedLots: FarmerLot[] =
    remote.lots && remote.lots.length > 0
      ? mergeByIdWithFreshness(local.lots, remote.lots, preferLocal)
      : local.lots;

  const mergedBatches: ProcessingBatch[] =
    remote.batches && remote.batches.length > 0
      ? mergeByIdWithFreshness(local.batches, remote.batches, preferLocal)
      : local.batches;

  const mergedOrders: MillOrder[] =
    remote.millOrders && remote.millOrders.length > 0
      ? mergeByIdWithFreshness(local.millOrders, remote.millOrders, preferLocal)
      : local.millOrders;

  const localHasEnteredAlternatives = local.alternatives.some(hasAnyAlternativeEntry);
  const remoteHasEnteredAlternatives = Boolean(
    remote.alternatives && remote.alternatives.some(hasAnyAlternativeEntry),
  );

  const useRemoteStrategy =
    !preferLocal &&
    (remoteHasEnteredAlternatives || !localHasEnteredAlternatives);

  const mergedAlternatives =
    useRemoteStrategy && remote.alternatives
      ? remote.alternatives
      : local.alternatives;

  const mergedPositioningState =
    useRemoteStrategy && remote.positioningState
      ? remote.positioningState
      : local.positioningState;

  const mergedStatement =
    useRemoteStrategy && remote.positioningStatement
      ? remote.positioningStatement
      : local.positioningStatement;

  const mergedChallenge =
    useRemoteStrategy && remote.aiChallengeState
      ? remote.aiChallengeState
      : local.aiChallengeState;

  const mergedSelectedLotId =
    mergedLots.some((l) => l.id === local.selectedLotId)
      ? local.selectedLotId
      : remote.selectedLotId && mergedLots.some((l) => l.id === remote.selectedLotId)
        ? remote.selectedLotId
        : mergedLots[0]?.id ?? '';

  return {
    lots: mergedLots,
    selectedLotId: mergedSelectedLotId,
    batches: mergedBatches,
    passports: local.passports,
    millOrders: mergedOrders,
    activeStageId: local.activeStageId,
    activeView: local.activeView,
    alternatives: mergedAlternatives,
    positioningState: mergedPositioningState,
    positioningStatement: mergedStatement,
    aiChallengeState: mergedChallenge,
  };
}
