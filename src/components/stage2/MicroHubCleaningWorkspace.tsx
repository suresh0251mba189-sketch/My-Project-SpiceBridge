import { useMemo, useState } from 'react';
import {
  BatchStatus,
  FarmerLot,
  ProcessingBatch,
  ShiftSchedule,
} from '../../types/spicebridge';
import { calculateBatchMetrics, getNextBatchId } from '../../utils/formatters';
import { BatchBuilderPanel } from './BatchBuilderPanel';
import { CommittedBatchesLedger } from './CommittedBatchesLedger';
import { DailyBottleneckTracker } from './DailyBottleneckTracker';
import { EligibleLotsPoolPanel } from './EligibleLotsPoolPanel';
import { HubCapacitySummaryStrip } from './HubCapacitySummaryStrip';

interface MicroHubCleaningWorkspaceProps {
  lots: FarmerLot[];
  batches: ProcessingBatch[];
  onAddBatch: (batch: ProcessingBatch) => void;
  onUpdateBatchStatus: (batchId: string, status: BatchStatus) => void;
  onRemoveBatch: (batchId: string) => void;
}

export function MicroHubCleaningWorkspace({
  lots,
  batches,
  onAddBatch,
  onUpdateBatchStatus,
  onRemoveBatch,
}: MicroHubCleaningWorkspaceProps) {
  const [draftLotIds, setDraftLotIds] = useState<string[]>([]);
  const [selectedShift, setSelectedShift] =
    useState<ShiftSchedule>('Today (Shift 1)');

  // Map every lot ID already committed to a saved batch -> batch ID
  const batchedLotMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const batch of batches) {
      for (const lotId of batch.lotIds) {
        map.set(lotId, batch.id);
      }
    }
    return map;
  }, [batches]);

  const batchedLotIdSet = useMemo(
    () => new Set(batchedLotMap.keys()),
    [batchedLotMap],
  );

  // Only keep draft selections that are still Pass & unbatched
  const validDraftLotIds = useMemo(
    () =>
      draftLotIds.filter((id) => {
        if (batchedLotIdSet.has(id)) return false;
        const lot = lots.find((l) => l.id === id);
        return lot?.qualityStatus === 'pass';
      }),
    [draftLotIds, batchedLotIdSet, lots],
  );

  const selectedLots = useMemo(
    () =>
      validDraftLotIds
        .map((id) => lots.find((l) => l.id === id))
        .filter((lot): lot is FarmerLot => Boolean(lot)),
    [validDraftLotIds, lots],
  );

  const draftMetrics = useMemo(
    () => calculateBatchMetrics(selectedLots),
    [selectedLots],
  );

  const nextBatchId = useMemo(() => getNextBatchId(batches), [batches]);

  const handleToggleLot = (lotId: string) => {
    if (batchedLotIdSet.has(lotId)) return;
    setDraftLotIds((prev) =>
      prev.includes(lotId) ? prev.filter((id) => id !== lotId) : [...prev, lotId],
    );
  };

  const handleRemoveLot = (lotId: string) => {
    setDraftLotIds((prev) => prev.filter((id) => id !== lotId));
  };

  const handleCommitBatch = (batch: ProcessingBatch) => {
    onAddBatch(batch);
    setDraftLotIds([]);
  };

  return (
    <div className="space-y-6">
      <HubCapacitySummaryStrip
        lots={lots}
        batches={batches}
        batchedLotIds={batchedLotIdSet}
      />

      <DailyBottleneckTracker
        batches={batches}
        selectedShift={selectedShift}
        onChangeShift={setSelectedShift}
        draftBatchEquivalent={draftMetrics.batchEquivalent}
        draftKg={draftMetrics.totalKg}
        draftCleaningHours={draftMetrics.cleaningHours}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-start">
        <div className="xl:col-span-6">
          <EligibleLotsPoolPanel
            lots={lots}
            selectedLotIds={validDraftLotIds}
            batchedLotMap={batchedLotMap}
            onToggleLot={handleToggleLot}
            onClearSelection={() => setDraftLotIds([])}
          />
        </div>

        <div className="xl:col-span-6 xl:sticky xl:top-6">
          <BatchBuilderPanel
            nextBatchId={nextBatchId}
            selectedLots={selectedLots}
            selectedShift={selectedShift}
            onChangeShift={setSelectedShift}
            onRemoveLot={handleRemoveLot}
            onCommitBatch={handleCommitBatch}
          />
        </div>
      </div>

      <CommittedBatchesLedger
        batches={batches}
        onUpdateStatus={onUpdateBatchStatus}
        onRemoveBatch={onRemoveBatch}
      />
    </div>
  );
}
