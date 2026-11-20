import { Check, CheckCircle2, Info } from 'lucide-react';
import { useState } from 'react';
import { CropFilter, FarmerLot } from '../../types/spicebridge';
import { formatNumberIN } from '../../utils/formatters';

interface EligibleLotsPoolPanelProps {
  lots: FarmerLot[];
  selectedLotIds: string[];
  batchedLotMap: Map<string, string>;
  onToggleLot: (lotId: string) => void;
  onClearSelection: () => void;
}

const CROP_FILTERS: { value: CropFilter; label: string }[] = [
  { value: 'All', label: 'All Pass Lots' },
  { value: 'Fennel', label: 'Fennel' },
  { value: 'Cumin', label: 'Cumin' },
];

export function EligibleLotsPoolPanel({
  lots,
  selectedLotIds,
  batchedLotMap,
  onToggleLot,
  onClearSelection,
}: EligibleLotsPoolPanelProps) {
  const [cropFilter, setCropFilter] = useState<CropFilter>('All');

  const passLots = lots.filter((lot) => lot.qualityStatus === 'pass');
  const holdLots = lots.filter((lot) => lot.qualityStatus === 'hold');

  const filteredPassLots = passLots.filter(
    (lot) => cropFilter === 'All' || lot.crop === cropFilter,
  );

  const selectedSet = new Set(selectedLotIds);
  const unbatchedCount = passLots.filter((lot) => !batchedLotMap.has(lot.id)).length;

  return (
    <section
      aria-label="Approved Pass Farmer Lots Pool"
      className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      <div className="border-b border-slate-200 p-5 space-y-3.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
              Approved Stage 1 Lots (&lt; 9.0% Pass)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select Pass-grade farmer lots to pool into a 3,000 kg (3 MT) processing batch
            </p>
          </div>
          {selectedLotIds.length > 0 && (
            <button
              type="button"
              onClick={onClearSelection}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
            >
              Clear ({selectedLotIds.length})
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Filter eligible Pass lots by crop"
            className="inline-flex items-center rounded-lg bg-slate-100 p-1"
          >
            {CROP_FILTERS.map((tab) => {
              const active = cropFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setCropFilter(tab.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-forest-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <span className="font-mono text-xs font-medium text-slate-600 tabular-nums">
            {unbatchedCount} ready to pool
          </span>
        </div>

        {holdLots.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-900">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
            <span>
              <strong>{holdLots.length} Stage 1 lot{holdLots.length > 1 ? 's' : ''}</strong>{' '}
              ({holdLots.map((l) => l.id).join(', ')}) flagged{' '}
              <strong>Hold / Re-dry (&ge; 9.0% moisture)</strong> and excluded from batching
              until re-assayed.
            </span>
          </div>
        )}
      </div>

      {filteredPassLots.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-900">
            No approved Pass lots for this crop filter
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Log a new Pass (&lt; 9.0% moisture) assay in Stage 1 or switch crop filter.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200/80">
          {filteredPassLots.map((lot) => {
            const committedBatchId = batchedLotMap.get(lot.id);
            const isBatched = Boolean(committedBatchId);
            const isChecked = selectedSet.has(lot.id);

            return (
              <li key={lot.id}>
                <button
                  type="button"
                  disabled={isBatched}
                  onClick={() => onToggleLot(lot.id)}
                  aria-pressed={isChecked}
                  className={`w-full px-5 py-4 text-left transition-colors ${
                    isBatched
                      ? 'bg-slate-50/80 opacity-65 cursor-not-allowed'
                      : isChecked
                        ? 'bg-forest-50/85 ring-1 ring-inset ring-forest-600/25 cursor-pointer'
                        : 'bg-white hover:bg-slate-50/90 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Selection Indicator */}
                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        isBatched
                          ? 'border-slate-300 bg-slate-200 text-slate-500'
                          : isChecked
                            ? 'border-forest-700 bg-forest-700 text-white'
                            : 'border-slate-300 bg-white'
                      }`}
                      aria-hidden="true"
                    >
                      {isChecked && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-mono text-xs font-semibold text-forest-700 tabular-nums">
                              {lot.id}
                            </span>
                            <span className="text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span className="text-sm font-semibold text-slate-900">
                              {lot.farmerName}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">
                            <span className="font-medium text-slate-800">
                              {lot.cropLabel}
                            </span>{' '}
                            — {lot.variety}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {lot.clusterGeography} · Purity{' '}
                            <span className="font-mono text-slate-700 tabular-nums">
                              {lot.purityPercent.toFixed(1)}%
                            </span>{' '}
                            · Moisture{' '}
                            <span className="font-mono text-forest-700 tabular-nums">
                              {lot.moisturePercent.toFixed(1)}%
                            </span>
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                            {formatNumberIN(lot.quantityKg)} kg
                          </p>
                          <p className="text-xs text-slate-500 tabular-nums">
                            {lot.bagCount} bags
                          </p>
                          {isBatched ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded bg-slate-200/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                              Pooled: {committedBatchId}
                            </span>
                          ) : (
                            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              <span>Pass Eligible</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
