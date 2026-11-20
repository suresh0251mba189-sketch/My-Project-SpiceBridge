import { FarmerLot } from '../../types/spicebridge';
import { calculateLotFinancials, formatINR, formatNumberIN } from '../../utils/formatters';

interface OperationsSummaryStripProps {
  lots: FarmerLot[];
}

export function OperationsSummaryStrip({ lots }: OperationsSummaryStripProps) {
  const totalKg = lots.reduce((sum, lot) => sum + lot.quantityKg, 0);
  const totalBags = lots.reduce((sum, lot) => sum + lot.bagCount, 0);

  const passLots = lots.filter((lot) => lot.qualityStatus === 'pass');
  const passKg = passLots.reduce((sum, lot) => sum + lot.quantityKg, 0);

  const avgPurity =
    lots.length > 0
      ? lots.reduce((sum, lot) => sum + lot.purityPercent, 0) / lots.length
      : 0;

  const totalExtraFarmerGain = lots.reduce((sum, lot) => {
    if (lot.qualityStatus !== 'pass') return sum;
    const { extraFarmerGain } = calculateLotFinancials(lot);
    return sum + (extraFarmerGain ?? 0);
  }, 0);

  return (
    <section
      aria-label="Farm-Gate Intake Summary"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-xs font-medium text-slate-500">Total Assayed Volume</p>
        <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
          {formatNumberIN(totalKg)} kg
        </p>
        <p className="mt-1 text-xs text-slate-500 tabular-nums">
          {formatNumberIN(totalBags)} bags (50 kg standard) · {lots.length} lots
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-xs font-medium text-slate-500">Pass-Grade Intake (&lt; 9.0%)</p>
        <p className="mt-1.5 font-mono text-2xl font-semibold text-forest-700 tabular-nums">
          {passLots.length} / {lots.length} lots
        </p>
        <p className="mt-1 text-xs text-slate-500 tabular-nums">
          {formatNumberIN(passKg)} kg cleared for 24h transfer
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-xs font-medium text-slate-500">Average Lot Purity</p>
        <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
          {avgPurity.toFixed(1)}%
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Farm-gate sieve &amp; foreign matter assay
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-xs font-medium text-slate-500">Farmer Gain vs. Mandi</p>
        <p className="mt-1.5 font-mono text-2xl font-semibold text-turmeric-600 tabular-nums">
          +{formatINR(totalExtraFarmerGain)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Direct spot premium across pass lots
        </p>
      </div>
    </section>
  );
}
