import { CheckCircle2, Clock, Sparkles, Trash2 } from 'lucide-react';
import { BatchStatus, ProcessingBatch } from '../../types/spicebridge';
import { formatDurationHours, formatNumberIN } from '../../utils/formatters';

interface CommittedBatchesLedgerProps {
  batches: ProcessingBatch[];
  onUpdateStatus: (batchId: string, status: BatchStatus) => void;
  onRemoveBatch: (batchId: string) => void;
}

const STATUS_OPTIONS: { value: BatchStatus; label: string }[] = [
  { value: 'queued', label: 'Queued' },
  { value: 'cleaning', label: 'Cleaning (500 kg/hr)' },
  { value: 'cleaned', label: 'Cleaned & Ready' },
];

export function CommittedBatchesLedger({
  batches,
  onUpdateStatus,
  onRemoveBatch,
}: CommittedBatchesLedgerProps) {
  return (
    <section
      aria-label="Committed Commercial Processing Batches"
      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
            Committed 3 MT Micro-Hub Batches
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Saved batches persist in browser localStorage; update line status or unpack to
            release lots
          </p>
        </div>
        <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
          {batches.length} {batches.length === 1 ? 'batch saved' : 'batches saved'}
        </span>
      </div>

      {batches.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-900">
            No processing batches committed yet
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            Pool approved Pass (&lt; 9.0%) farmer lots in the Batch Builder above (for example,
            SB-101 + SB-104 for a full 3,000 kg Fennel batch) and click Create &amp; Save.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 pl-6 pr-4 whitespace-nowrap">Batch ID &amp; Shift</th>
                <th className="py-3 px-4 whitespace-nowrap">Crop &amp; Pooled Lots</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Volume &amp; Fill</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">
                  Cleaning Time (500 kg/hr)
                </th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Weighted Quality</th>
                <th className="py-3 px-4 whitespace-nowrap">Line Status</th>
                <th className="py-3 pl-4 pr-6 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-sm">
              {batches.map((batch) => {
                const isCleaned = batch.status === 'cleaned';
                const isCleaning = batch.status === 'cleaning';

                return (
                  <tr key={batch.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pl-6 pr-4 align-top">
                      <div className="font-mono text-xs font-bold text-forest-700 tabular-nums">
                        {batch.id}
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-slate-800">
                        {batch.hubLine}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {batch.shiftSchedule}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top">
                      <div className="text-xs font-semibold text-slate-900">
                        {batch.cropSummary}
                      </div>
                      <div className="mt-1 font-mono text-xs text-slate-600">
                        {batch.lotIds.join(', ')}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right align-top">
                      <div className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                        {formatNumberIN(batch.totalKg)} kg ({(batch.totalKg / 1000).toFixed(2)} MT)
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                        {batch.fillPercent.toFixed(0)}% of 3 MT · {batch.totalBags} bags
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right align-top">
                      <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {formatDurationHours(batch.cleaningHours)}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                        {batch.batchEquivalent.toFixed(2)} batch equiv.
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right align-top">
                      <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {batch.weightedPurity.toFixed(1)}% pure
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-forest-700 tabular-nums">
                        {batch.weightedMoisture.toFixed(1)}% moisture
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top">
                      <div className="inline-flex items-center gap-1.5">
                        {isCleaned ? (
                          <CheckCircle2
                            className="h-3.5 w-3.5 text-forest-700 shrink-0"
                            aria-hidden="true"
                          />
                        ) : isCleaning ? (
                          <Sparkles
                            className="h-3.5 w-3.5 text-turmeric-600 shrink-0"
                            aria-hidden="true"
                          />
                        ) : (
                          <Clock
                            className="h-3.5 w-3.5 text-slate-500 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        <select
                          aria-label={`Status for batch ${batch.id}`}
                          value={batch.status}
                          onChange={(e) =>
                            onUpdateStatus(batch.id, e.target.value as BatchStatus)
                          }
                          className={`rounded-md border px-2 py-1 text-xs font-semibold focus:outline-none cursor-pointer ${
                            isCleaned
                              ? 'border-emerald-200 bg-emerald-50 text-forest-800'
                              : isCleaning
                                ? 'border-amber-200 bg-amber-50 text-amber-800'
                                : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    <td className="py-3.5 pl-4 pr-6 text-right align-top">
                      <button
                        type="button"
                        onClick={() => onRemoveBatch(batch.id)}
                        title={`Unpack ${batch.id} and return lots to Pass pool`}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Unpack</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
