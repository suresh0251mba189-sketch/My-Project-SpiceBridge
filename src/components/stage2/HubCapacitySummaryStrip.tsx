import { FarmerLot, ProcessingBatch } from '../../types/spicebridge';
import {
  CLEANING_CAPACITY_KG_PER_HR,
  DAILY_HUB_BOTTLENECK_BATCHES,
  DAILY_HUB_BOTTLENECK_KG,
  HOURS_PER_FULL_BATCH,
  formatNumberIN,
} from '../../utils/formatters';

interface HubCapacitySummaryStripProps {
  lots: FarmerLot[];
  batches: ProcessingBatch[];
  batchedLotIds: Set<string>;
}

export function HubCapacitySummaryStrip({
  lots,
  batches,
  batchedLotIds,
}: HubCapacitySummaryStripProps) {
  const passLots = lots.filter((lot) => lot.qualityStatus === 'pass');
  const availablePassLots = passLots.filter((lot) => !batchedLotIds.has(lot.id));
  const availablePassKg = availablePassLots.reduce(
    (sum, lot) => sum + lot.quantityKg,
    0,
  );

  const totalCommittedKg = batches.reduce((sum, batch) => sum + batch.totalKg, 0);
  const totalCommittedHours = batches.reduce(
    (sum, batch) => sum + batch.cleaningHours,
    0,
  );

  const todayBatches = batches.filter(
    (batch) => batch.shiftSchedule === 'Today (Shift 1)',
  );
  const todayBatchEquiv = todayBatches.reduce(
    (sum, batch) => sum + batch.batchEquivalent,
    0,
  );
  const todayUtilizationPercent =
    (todayBatchEquiv / DAILY_HUB_BOTTLENECK_BATCHES) * 100;

  return (
    <section
      aria-label="Micro-Hub Cleaning and Batching Summary"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-xs font-medium text-slate-500">
          Available Pass Pool (&lt; 9.0%)
        </p>
        <p className="mt-1.5 font-mono text-2xl font-semibold text-forest-700 tabular-nums">
          {formatNumberIN(availablePassKg)} kg
        </p>
        <p className="mt-1 text-xs text-slate-500 tabular-nums">
          {availablePassLots.length} of {passLots.length} Pass lots unbatched
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-xs font-medium text-slate-500">
          Committed 3 MT Batches
        </p>
        <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
          {batches.length} {batches.length === 1 ? 'batch' : 'batches'}
        </p>
        <p className="mt-1 text-xs text-slate-500 tabular-nums">
          {formatNumberIN(totalCommittedKg)} kg ({(totalCommittedKg / 1000).toFixed(2)} MT) ·{' '}
          {totalCommittedHours.toFixed(1)} hrs
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-xs font-medium text-slate-500">
          Cleaning &amp; Destoning Rate
        </p>
        <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
          {CLEANING_CAPACITY_KG_PER_HR} kg/hr
        </p>
        <p className="mt-1 text-xs text-slate-500 tabular-nums">
          {HOURS_PER_FULL_BATCH}.0 hrs per standard 3,000 kg (3 MT) batch
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-xs font-medium text-slate-500">
          Today&apos;s Bottleneck Utilization
        </p>
        <p
          className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${
            todayUtilizationPercent > 100
              ? 'text-red-600'
              : todayUtilizationPercent >= 85
                ? 'text-turmeric-600'
                : 'text-slate-900'
          }`}
        >
          {todayUtilizationPercent.toFixed(0)}%
        </p>
        <p className="mt-1 text-xs text-slate-500 tabular-nums">
          {todayBatchEquiv.toFixed(2)} / {DAILY_HUB_BOTTLENECK_BATCHES} batches/day (
          {formatNumberIN(DAILY_HUB_BOTTLENECK_KG)} kg cap)
        </p>
      </div>
    </section>
  );
}
