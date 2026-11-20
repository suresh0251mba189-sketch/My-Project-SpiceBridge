import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import {
  FarmerLot,
  ProcessingBatch,
  ShiftSchedule,
} from '../../types/spicebridge';
import {
  BATCH_TARGET_KG,
  CLEANING_CAPACITY_KG_PER_HR,
  HOURS_PER_FULL_BATCH,
  calculateBatchMetrics,
  formatDurationHours,
  formatNumberIN,
} from '../../utils/formatters';

interface BatchBuilderPanelProps {
  nextBatchId: string;
  selectedLots: FarmerLot[];
  selectedShift: ShiftSchedule;
  onChangeShift: (shift: ShiftSchedule) => void;
  onRemoveLot: (lotId: string) => void;
  onCommitBatch: (batch: ProcessingBatch) => void;
}

const HUB_LINES = [
  'Unjha Micro-Hub Line 1',
  'Sirohi Micro-Hub Line 1',
  'Palanpur Micro-Hub Line 1',
];

const SHIFTS: ShiftSchedule[] = ['Today (Shift 1)', 'Tomorrow (Shift 2)'];

export function BatchBuilderPanel({
  nextBatchId,
  selectedLots,
  selectedShift,
  onChangeShift,
  onRemoveLot,
  onCommitBatch,
}: BatchBuilderPanelProps) {
  const [hubLine, setHubLine] = useState<string>(HUB_LINES[0]);

  const metrics = calculateBatchMetrics(selectedLots);
  const clampedFillWidth = Math.min(100, metrics.fillPercent);
  const canCommit = selectedLots.length > 0 && !metrics.isOverCapacity;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canCommit) return;

    const newBatch: ProcessingBatch = {
      id: nextBatchId,
      hubLine,
      shiftSchedule: selectedShift,
      lotIds: selectedLots.map((lot) => lot.id),
      cropSummary: metrics.cropSummary,
      isMixedCrop: metrics.isMixedCrop,
      totalKg: metrics.totalKg,
      totalBags: metrics.totalBags,
      fillPercent: Number(metrics.fillPercent.toFixed(1)),
      cleaningHours: Number(metrics.cleaningHours.toFixed(2)),
      batchEquivalent: Number(metrics.batchEquivalent.toFixed(2)),
      weightedMoisture: Number(metrics.weightedMoisture.toFixed(2)),
      weightedPurity: Number(metrics.weightedPurity.toFixed(2)),
      status: 'queued',
      createdAt: new Date().toISOString(),
    };

    onCommitBatch(newBatch);
  };

  return (
    <aside
      aria-label="3 MT Processing Batch Builder"
      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      {/* Builder Header */}
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-forest-700">
              3 MT Commercial Batch Builder
            </p>
            <div className="mt-1 flex items-center gap-2.5">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Draft Batch
              </h2>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 tabular-nums">
                {nextBatchId}
              </span>
            </div>
          </div>

          <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
            Target: {formatNumberIN(BATCH_TARGET_KG)} kg (3.00 MT)
          </span>
        </div>

        {/* Live Batch-Fill Progress Bar toward 3,000 kg */}
        <div className="mt-5 rounded-lg border border-slate-200/80 bg-slate-50/90 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-semibold text-slate-700">
              Live Batch Fill Progress
            </span>
            <div className="text-right">
              <span
                className={`font-mono text-lg font-bold tabular-nums ${
                  metrics.isOverCapacity
                    ? 'text-red-600'
                    : metrics.isOptimalFull
                      ? 'text-forest-700'
                      : 'text-slate-900'
                }`}
              >
                {formatNumberIN(metrics.totalKg)} / {formatNumberIN(BATCH_TARGET_KG)} kg
              </span>
              <span className="ml-2 font-mono text-xs font-semibold text-slate-600 tabular-nums">
                ({metrics.fillPercent.toFixed(1)}%)
              </span>
            </div>
          </div>

          <div
            className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={Math.min(BATCH_TARGET_KG, metrics.totalKg)}
            aria-valuemin={0}
            aria-valuemax={BATCH_TARGET_KG}
            aria-label="Batch fill progress toward 3,000 kg"
          >
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                metrics.isOverCapacity
                  ? 'bg-red-600'
                  : metrics.isOptimalFull
                    ? 'bg-forest-700'
                    : 'bg-forest-600'
              }`}
              style={{ width: `${clampedFillWidth}%` }}
            />
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            {selectedLots.length === 0 ? (
              <span className="text-slate-500">
                Select approved Pass (&lt; 9.0%) lots on the left to fill this 3 MT hopper.
              </span>
            ) : metrics.isOverCapacity ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-red-700 tabular-nums">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Exceeds 3,000 kg batch limit by {formatNumberIN(metrics.overCapacityKg)} kg
                  — remove a lot to commit
                </span>
              </span>
            ) : metrics.isOptimalFull ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-forest-700">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Exact 3,000 kg (3.00 MT) commercial batch ready!</span>
              </span>
            ) : (
              <span className="text-slate-600 tabular-nums">
                {formatNumberIN(metrics.remainingKg)} kg remaining to reach full 3.00 MT
                standard ({metrics.totalBags} / 60 bags)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mechanical Cleaning Time & Weighted Quality */}
      <div className="border-b border-slate-200 px-6 py-5 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Clock className="h-4 w-4 text-forest-700" aria-hidden="true" />
              <span>Cleaning &amp; Destoning Time</span>
            </div>
            <p className="mt-2 font-mono text-base font-bold text-slate-900 tabular-nums">
              {formatDurationHours(metrics.cleaningHours)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
              @ {CLEANING_CAPACITY_KG_PER_HR} kg/hr capacity ({HOURS_PER_FULL_BATCH} hrs per
              3 MT)
            </p>
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Sparkles className="h-4 w-4 text-turmeric-600" aria-hidden="true" />
              <span>Pooled Lot Blend Quality</span>
            </div>
            {selectedLots.length > 0 ? (
              <>
                <p className="mt-2 font-mono text-base font-bold text-slate-900 tabular-nums">
                  {metrics.weightedPurity.toFixed(1)}% purity ·{' '}
                  {metrics.weightedMoisture.toFixed(1)}% H₂O
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {metrics.cropSummary} · {selectedLots.length}{' '}
                  {selectedLots.length === 1 ? 'farmer lot' : 'farmer lots'}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 font-mono text-base font-bold text-slate-400 tabular-nums">
                  — % purity · — % H₂O
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Weighted average computes automatically
                </p>
              </>
            )}
          </div>
        </div>

        {metrics.isMixedCrop && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-900">
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700"
              aria-hidden="true"
            />
            <span>
              <strong>Mixed Crop Notice:</strong> This draft pools both Fennel and Cumin.
              Micro-hub SOP recommends single-crop batches for clean screen runs.
            </span>
          </div>
        )}
      </div>

      {/* Selected Lots Chips & Commit Form */}
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Pooled Farmer Lots ({selectedLots.length})
            </span>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {metrics.batchEquivalent.toFixed(2)} batch equiv.
            </span>
          </div>

          {selectedLots.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-slate-200 px-3.5 py-3 text-xs text-slate-500">
              No lots pooled yet. Click any Pass (&lt; 9.0%) lot in the left panel.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50">
              {selectedLots.map((lot) => (
                <li
                  key={lot.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-mono font-semibold text-forest-700 tabular-nums">
                      {lot.id}
                    </span>
                    <span className="mx-1.5 text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-medium text-slate-800">{lot.farmerName}</span>
                    <span className="ml-1.5 text-slate-500">({lot.crop})</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-semibold text-slate-700 tabular-nums">
                      {formatNumberIN(lot.quantityKg)} kg
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveLot(lot.id)}
                      aria-label={`Remove ${lot.id} from batch`}
                      className="rounded p-1 text-slate-400 hover:bg-slate-200/80 hover:text-slate-800 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="hubLine"
              className="block text-xs font-semibold text-slate-700"
            >
              Micro-Hub Processing Line
            </label>
            <select
              id="hubLine"
              value={hubLine}
              onChange={(e) => setHubLine(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-forest-600 focus:outline-none"
            >
              {HUB_LINES.map((line) => (
                <option key={line} value={line}>
                  {line}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="shiftSchedule"
              className="block text-xs font-semibold text-slate-700"
            >
              Assigned Shift Schedule
            </label>
            <select
              id="shiftSchedule"
              value={selectedShift}
              onChange={(e) => onChangeShift(e.target.value as ShiftSchedule)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-forest-600 focus:outline-none"
            >
              {SHIFTS.map((shift) => (
                <option key={shift} value={shift}>
                  {shift}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canCommit}
          className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            canCommit
              ? 'bg-forest-700 text-white hover:bg-forest-800 shadow-xs cursor-pointer'
              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Layers className="h-4 w-4" aria-hidden="true" />
          <span>
            Create &amp; Save Processing Batch ({nextBatchId})
          </span>
        </button>
      </form>
    </aside>
  );
}
