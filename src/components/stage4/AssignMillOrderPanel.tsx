import { ArrowRight, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { ProcessingBatch, StageId } from '../../types/spicebridge';
import {
  MILL_SELLING_PRICE_PER_KG,
  formatINR,
  formatNumberIN,
} from '../../utils/formatters';

interface AssignMillOrderPanelProps {
  batches: ProcessingBatch[];
  assignedBatchIds: Set<string>;
  selectedBatchId: string;
  onSelectBatch: (batchId: string) => void;
  onMarkBatchCleaned: (batchId: string) => void;
  onSelectStage: (stageId: StageId) => void;
}

export function AssignMillOrderPanel({
  batches,
  assignedBatchIds,
  selectedBatchId,
  onSelectBatch,
  onMarkBatchCleaned,
  onSelectStage,
}: AssignMillOrderPanelProps) {
  const unassignedBatches = batches.filter((b) => !assignedBatchIds.has(b.id));
  const readyBatches = unassignedBatches.filter((b) => b.status === 'cleaned');
  const inProgressBatches = unassignedBatches.filter((b) => b.status !== 'cleaned');

  if (batches.length === 0) {
    return (
      <section
        aria-label="Completed Batches Ready for Mill Assignment"
        className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center"
      >
        <p className="text-sm font-semibold text-slate-900">
          No 3 MT Processing Batches Available Yet
        </p>
        <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          Pool approved Pass lots into a 3,000 kg batch in Stage 2 and mark it Cleaned
          &amp; Ready before assigning it to an industrial grinding mill.
        </p>
        <button
          type="button"
          onClick={() => onSelectStage('stage-2-cleaning')}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-forest-700 px-4 py-2 text-xs font-semibold text-white hover:bg-forest-800 cursor-pointer"
        >
          <span>Go to Stage 2: Create 3 MT Batch</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label="Completed Batches for Mill Assignment"
      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
              Completed 3 MT Batches Ready for Mills
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a cleaned batch to assign to an industrial spice grinding mill at{' '}
              {formatINR(MILL_SELLING_PRICE_PER_KG)}/kg
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-forest-700 tabular-nums">
            {readyBatches.length} ready · {assignedBatchIds.size} assigned
          </span>
        </div>
      </div>

      {/* Ready (Cleaned) Batches */}
      {readyBatches.length === 0 ? (
        <div className="px-6 py-8 text-center border-b border-slate-200">
          <p className="text-sm font-semibold text-slate-900">
            {inProgressBatches.length > 0
              ? 'No batches marked Cleaned & Ready yet'
              : 'All cleaned batches have been assigned to mill orders'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {inProgressBatches.length > 0
              ? 'Complete mechanical cleaning on a queued batch below to unlock it for mill dispatch.'
              : 'Create a new 3 MT batch in Stage 2 or manage active 14-day mill invoices below.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200/80 border-b border-slate-200">
          {readyBatches.map((batch) => {
            const isSelected = batch.id === selectedBatchId;
            const contractValue = batch.totalKg * MILL_SELLING_PRICE_PER_KG;

            return (
              <li key={batch.id}>
                <button
                  type="button"
                  onClick={() => onSelectBatch(batch.id)}
                  aria-pressed={isSelected}
                  className={`w-full px-5 py-4 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-forest-50/85 ring-1 ring-inset ring-forest-600/25'
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-mono text-xs font-bold text-forest-700 tabular-nums">
                          {batch.id}
                        </span>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {batch.cropSummary}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-600">
                        {batch.hubLine} · Lots: {batch.lotIds.join(', ')}
                      </p>

                      <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                        {formatNumberIN(batch.totalKg)} kg (
                        {(batch.totalKg / 1000).toFixed(2)} MT) ·{' '}
                        {batch.weightedMoisture.toFixed(1)}% H₂O
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-forest-800">
                        <CheckCircle2 className="h-3 w-3 text-forest-700" aria-hidden="true" />
                        <span>Cleaned &amp; Ready</span>
                      </span>
                      <p className="mt-1.5 font-mono text-sm font-bold text-slate-900 tabular-nums">
                        {formatINR(contractValue)}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Unfinished Stage 2 Batches with 1-click completion */}
      {inProgressBatches.length > 0 && (
        <div className="bg-slate-50/70 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-700">
              In-Progress Stage 2 Batches ({inProgressBatches.length})
            </p>
            <span className="text-[11px] text-slate-500">
              Complete cleaning before mill dispatch
            </span>
          </div>

          <ul className="space-y-2">
            {inProgressBatches.map((batch) => (
              <li
                key={batch.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    {batch.status === 'cleaning' ? (
                      <Sparkles className="h-3.5 w-3.5 text-turmeric-600" aria-hidden="true" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    )}
                    <span className="font-mono font-bold text-slate-800">
                      {batch.id}
                    </span>
                    <span className="text-slate-600">
                      {batch.cropSummary} · {formatNumberIN(batch.totalKg)} kg
                    </span>
                  </div>
                  <p className="mt-0.5 pl-5.5 text-[11px] text-slate-500">
                    Current Stage 2 status:{' '}
                    <span className="font-semibold capitalize">{batch.status}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onMarkBatchCleaned(batch.id)}
                  className="rounded-md border border-forest-600/30 bg-forest-50 px-3 py-1.5 text-xs font-semibold text-forest-800 hover:bg-emerald-100 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Mark Cleaned &amp; Ready
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
