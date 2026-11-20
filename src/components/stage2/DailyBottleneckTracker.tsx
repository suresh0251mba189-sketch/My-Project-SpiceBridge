import { AlertTriangle, CheckCircle2, Gauge } from 'lucide-react';
import { ProcessingBatch, ShiftSchedule } from '../../types/spicebridge';
import {
  DAILY_HUB_BOTTLENECK_BATCHES,
  DAILY_HUB_BOTTLENECK_KG,
  HOURS_PER_FULL_BATCH,
  formatDurationHours,
  formatNumberIN,
} from '../../utils/formatters';

interface DailyBottleneckTrackerProps {
  batches: ProcessingBatch[];
  selectedShift: ShiftSchedule;
  onChangeShift: (shift: ShiftSchedule) => void;
  draftBatchEquivalent: number;
  draftKg: number;
  draftCleaningHours: number;
}

const SHIFTS: ShiftSchedule[] = ['Today (Shift 1)', 'Tomorrow (Shift 2)'];

export function DailyBottleneckTracker({
  batches,
  selectedShift,
  onChangeShift,
  draftBatchEquivalent,
  draftKg,
  draftCleaningHours,
}: DailyBottleneckTrackerProps) {
  const shiftBatches = batches.filter(
    (batch) => batch.shiftSchedule === selectedShift,
  );
  const committedBatchesEquiv = shiftBatches.reduce(
    (sum, batch) => sum + batch.batchEquivalent,
    0,
  );
  const committedKg = shiftBatches.reduce((sum, batch) => sum + batch.totalKg, 0);
  const committedHours = shiftBatches.reduce(
    (sum, batch) => sum + batch.cleaningHours,
    0,
  );

  const projectedBatchesEquiv = committedBatchesEquiv + draftBatchEquivalent;
  const projectedKg = committedKg + draftKg;
  const projectedHours = committedHours + draftCleaningHours;

  const committedPercentOfBottleneck =
    (committedBatchesEquiv / DAILY_HUB_BOTTLENECK_BATCHES) * 100;
  const draftPercentOfBottleneck =
    (draftBatchEquivalent / DAILY_HUB_BOTTLENECK_BATCHES) * 100;
  const projectedPercentOfBottleneck =
    committedPercentOfBottleneck + draftPercentOfBottleneck;

  const maxDailyHours = DAILY_HUB_BOTTLENECK_BATCHES * HOURS_PER_FULL_BATCH; // 7.98 hrs (~8.0 hrs)
  const isOverBottleneck = projectedBatchesEquiv > DAILY_HUB_BOTTLENECK_BATCHES;
  const isApproachingBottleneck =
    !isOverBottleneck && projectedPercentOfBottleneck >= 85;

  // Bar scale spans up to max(125%, projectedPercent) so overflow remains visually proportional
  const barCommittedWidth = Math.min(100, committedPercentOfBottleneck);
  const barDraftWidth = Math.min(
    Math.max(0, 100 - barCommittedWidth),
    draftPercentOfBottleneck,
  );

  return (
    <section
      aria-label="Daily Hub Capacity Bottleneck Tracker"
      className="rounded-xl border border-slate-200 bg-white px-5 py-5 space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-forest-700" aria-hidden="true" />
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Daily Hub Capacity Utilization vs. 1.33 Batches/Day Bottleneck
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Single-line bottleneck: {DAILY_HUB_BOTTLENECK_BATCHES} batches/day (
              {formatNumberIN(DAILY_HUB_BOTTLENECK_KG)} kg/day ·{' '}
              {maxDailyHours.toFixed(1)} machine hrs @ 500 kg/hr)
            </p>
          </div>
        </div>

        {/* Shift Selector */}
        <div
          role="group"
          aria-label="Inspect capacity for shift schedule"
          className="inline-flex items-center rounded-lg bg-slate-100 p-1 self-start sm:self-auto"
        >
          {SHIFTS.map((shift) => {
            const active = selectedShift === shift;
            return (
              <button
                key={shift}
                type="button"
                onClick={() => onChangeShift(shift)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-forest-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {shift}
              </button>
            );
          })}
        </div>
      </div>

      {/* Layered Utilization Bar */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-medium text-slate-700 tabular-nums">
              Committed:{' '}
              <strong className="font-mono text-slate-900">
                {committedBatchesEquiv.toFixed(2)} / {DAILY_HUB_BOTTLENECK_BATCHES} batches
              </strong>{' '}
              ({committedPercentOfBottleneck.toFixed(0)}%)
            </span>
            {draftKg > 0 && (
              <span className="font-medium text-turmeric-700 tabular-nums">
                + Active Draft:{' '}
                <strong className="font-mono">
                  +{draftBatchEquivalent.toFixed(2)} batches
                </strong>{' '}
                (Projected: {projectedBatchesEquiv.toFixed(2)} /{' '}
                {DAILY_HUB_BOTTLENECK_BATCHES})
              </span>
            )}
          </div>

          <span className="font-mono font-semibold text-slate-700 tabular-nums">
            {formatNumberIN(projectedKg)} / {formatNumberIN(DAILY_HUB_BOTTLENECK_KG)} kg ·{' '}
            {formatDurationHours(projectedHours)}
          </span>
        </div>

        <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/80">
          <div
            className="absolute inset-y-0 left-0 bg-forest-700 transition-all duration-200"
            style={{ width: `${barCommittedWidth}%` }}
            title={`Committed: ${committedBatchesEquiv.toFixed(2)} batches`}
          />
          {draftKg > 0 && (
            <div
              className={`absolute inset-y-0 transition-all duration-200 ${
                isOverBottleneck ? 'bg-red-500' : 'bg-amber-400'
              }`}
              style={{
                left: `${barCommittedWidth}%`,
                width: `${barDraftWidth}%`,
              }}
              title={`Active Draft: +${draftBatchEquivalent.toFixed(2)} batches`}
            />
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4 text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-forest-700" aria-hidden="true" />
              <span>Committed ({shiftBatches.length})</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-xs ${
                  isOverBottleneck ? 'bg-red-500' : 'bg-amber-400'
                }`}
                aria-hidden="true"
              />
              <span>Active Draft</span>
            </span>
          </div>

          {isOverBottleneck ? (
            <div className="inline-flex items-center gap-1.5 font-semibold text-red-700 tabular-nums">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Exceeds {DAILY_HUB_BOTTLENECK_BATCHES} batches/day bottleneck by{' '}
                +{(projectedBatchesEquiv - DAILY_HUB_BOTTLENECK_BATCHES).toFixed(2)} batches
                — move draft to Tomorrow (Shift 2) or authorize overtime
              </span>
            </div>
          ) : isApproachingBottleneck ? (
            <div className="inline-flex items-center gap-1.5 font-semibold text-amber-800 tabular-nums">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Near daily bottleneck ({projectedPercentOfBottleneck.toFixed(0)}% of 1.33
                batches/day limit)
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 font-medium text-forest-700 tabular-nums">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {(DAILY_HUB_BOTTLENECK_BATCHES - projectedBatchesEquiv).toFixed(2)} batches (
                {formatNumberIN(Math.max(0, DAILY_HUB_BOTTLENECK_KG - projectedKg))} kg)
                shift capacity remaining
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
