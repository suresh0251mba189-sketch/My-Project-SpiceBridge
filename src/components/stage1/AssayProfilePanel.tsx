import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { FarmerLot } from '../../types/spicebridge';
import {
  calculateLotFinancials,
  formatINR,
  formatNumberIN,
} from '../../utils/formatters';

interface AssayProfilePanelProps {
  lot: FarmerLot | undefined;
  onOpenCompetitionLab: () => void;
}

export function AssayProfilePanel({
  lot,
  onOpenCompetitionLab,
}: AssayProfilePanelProps) {
  const [queuedLotId, setQueuedLotId] = useState<string | null>(null);

  useEffect(() => {
    setQueuedLotId(null);
  }, [lot?.id]);

  if (!lot) {
    return (
      <section
        aria-label="My Selected Lot"
        className="rounded-xl border border-slate-200 bg-white px-6 py-6 text-center"
      >
        <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
          MY SELECTED LOT
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Select any farmer lot card above to view its harvest assay and spot pricing.
        </p>
      </section>
    );
  }

  const isPass = lot.qualityStatus === 'pass';
  const financials = calculateLotFinancials(lot);
  const isQueuedForBatching = queuedLotId === lot.id;

  return (
    <section
      aria-label="MY SELECTED LOT"
      className="rounded-xl border border-forest-600/30 bg-white px-5 py-4 shadow-xs"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left & Center Details */}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="font-display text-xs font-bold tracking-wider text-forest-700">
              MY SELECTED LOT
            </h2>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
                isPass
                  ? 'bg-emerald-50 text-forest-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {isPass ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-forest-700" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
              )}
              <span>{isPass ? 'Pass (< 9.0%)' : 'Hold / Re-dry'}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Lot ID & Crop/Variety + Farmer Name */}
            <div>
              <p className="text-[11px] font-medium text-slate-500">
                Lot ID &amp; Crop / Variety
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">
                <span className="font-mono text-forest-700">{lot.id}</span> ·{' '}
                {lot.cropLabel}
              </p>
              <p className="text-xs text-slate-600">{lot.variety}</p>
            </div>

            {/* Farmer Name & Cluster Geography */}
            <div>
              <p className="text-[11px] font-medium text-slate-500">
                Farmer &amp; Cluster Geography
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {lot.farmerName}
              </p>
              <p className="text-xs text-slate-600">{lot.clusterGeography}</p>
            </div>

            {/* Harvest Quantity & Bag Count */}
            <div>
              <p className="text-[11px] font-medium text-slate-500">
                Harvest Quantity &amp; Bags
              </p>
              <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 tabular-nums">
                {formatNumberIN(lot.quantityKg)} kg
              </p>
              <p className="text-xs text-slate-600 tabular-nums">
                {lot.bagCount} bags × 50 kg
              </p>
            </div>

            {/* Quality Assay & Offered Farm-Gate Price */}
            <div>
              <p className="text-[11px] font-medium text-slate-500">
                Quality Assay &amp; Farm-Gate Price
              </p>
              <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 tabular-nums">
                {formatINR(lot.offeredPricePerKg)}/kg{' '}
                <span className="font-sans text-xs font-medium text-slate-500">
                  ({lot.priceNote})
                </span>
              </p>
              <p className="text-xs text-slate-600 tabular-nums">
                {lot.moisturePercent.toFixed(1)}% H₂O · {lot.purityPercent.toFixed(1)}% pure ·{' '}
                {formatINR(financials.grossPayout)} gross
              </p>
            </div>
          </div>
        </div>

        {/* Right Primary CTAs */}
        <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-2 pt-2 border-t border-slate-100 lg:border-t-0 lg:border-l lg:border-slate-200 lg:pl-6 lg:pt-0">
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onOpenCompetitionLab}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-forest-600/35 bg-forest-50 px-3.5 py-2.5 text-sm font-semibold text-forest-800 transition-colors hover:bg-emerald-100/80 whitespace-nowrap cursor-pointer"
            >
              <span>Competition Lab</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setQueuedLotId(lot.id)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 whitespace-nowrap cursor-pointer"
            >
              <span>Continue to Batching Lab</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 text-center sm:text-right">
            Stage 2: Micro-Hub Cleaning &amp; Batching (Coming Next)
          </p>
        </div>
      </div>

      {isQueuedForBatching && (
        <div
          role="status"
          aria-live="polite"
          className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-xs text-forest-800"
        >
          <span>
            <strong>{lot.id}</strong> ({lot.farmerName} · {formatNumberIN(lot.quantityKg)}{' '}
            kg) selected and saved for the upcoming <strong>Batching Lab</strong> stage.
          </span>
        </div>
      )}
    </section>
  );
}
