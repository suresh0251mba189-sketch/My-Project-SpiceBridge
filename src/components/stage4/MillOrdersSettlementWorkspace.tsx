import { useMemo, useState } from 'react';
import {
  BatchStatus,
  FarmerLot,
  MillOrder,
  ProcessingBatch,
  SettlementStatus,
  StageId,
} from '../../types/spicebridge';
import { getNextMillOrderId } from '../../utils/formatters';
import { AssignMillOrderPanel } from './AssignMillOrderPanel';
import { BatchUnitEconomicsCard } from './BatchUnitEconomicsCard';
import { ExecutiveKpiBar } from './ExecutiveKpiBar';
import { MillSettlementLedger } from './MillSettlementLedger';

interface MillOrdersSettlementWorkspaceProps {
  lots: FarmerLot[];
  batches: ProcessingBatch[];
  millOrders: MillOrder[];
  onAddMillOrder: (order: MillOrder) => void;
  onUpdateSettlementStatus: (orderId: string, status: SettlementStatus) => void;
  onRemoveMillOrder: (orderId: string) => void;
  onUpdateBatchStatus: (batchId: string, status: BatchStatus) => void;
  onSelectStage: (stageId: StageId) => void;
}

export function MillOrdersSettlementWorkspace({
  lots,
  batches,
  millOrders,
  onAddMillOrder,
  onUpdateSettlementStatus,
  onRemoveMillOrder,
  onUpdateBatchStatus,
  onSelectStage,
}: MillOrdersSettlementWorkspaceProps) {
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  const assignedBatchIds = useMemo(
    () => new Set(millOrders.map((order) => order.batchId)),
    [millOrders],
  );

  const readyUnassignedBatches = useMemo(
    () =>
      batches.filter(
        (batch) => batch.status === 'cleaned' && !assignedBatchIds.has(batch.id),
      ),
    [batches, assignedBatchIds],
  );

  const activeBatch = useMemo(() => {
    return (
      readyUnassignedBatches.find((b) => b.id === selectedBatchId) ??
      readyUnassignedBatches[0]
    );
  }, [readyUnassignedBatches, selectedBatchId]);

  const nextOrderId = useMemo(
    () => getNextMillOrderId(millOrders),
    [millOrders],
  );

  const handleMarkBatchCleaned = (batchId: string) => {
    onUpdateBatchStatus(batchId, 'cleaned');
    setSelectedBatchId(batchId);
  };

  const handleAssignMillOrder = (order: MillOrder) => {
    onAddMillOrder(order);
    setSelectedBatchId('');
  };

  return (
    <div className="space-y-6">
      <ExecutiveKpiBar lots={lots} batches={batches} millOrders={millOrders} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-start">
        <div className="xl:col-span-6">
          <AssignMillOrderPanel
            batches={batches}
            assignedBatchIds={assignedBatchIds}
            selectedBatchId={activeBatch?.id ?? ''}
            onSelectBatch={setSelectedBatchId}
            onMarkBatchCleaned={handleMarkBatchCleaned}
            onSelectStage={onSelectStage}
          />
        </div>

        <div className="xl:col-span-6 xl:sticky xl:top-6">
          <BatchUnitEconomicsCard
            selectedBatch={activeBatch}
            nextOrderId={nextOrderId}
            onAssignMillOrder={handleAssignMillOrder}
          />
        </div>
      </div>

      <MillSettlementLedger
        orders={millOrders}
        onUpdateSettlementStatus={onUpdateSettlementStatus}
        onRemoveOrder={onRemoveMillOrder}
      />
    </div>
  );
}
