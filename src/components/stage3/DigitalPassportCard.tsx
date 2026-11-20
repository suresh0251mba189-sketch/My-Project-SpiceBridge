import {
  Check,
  CheckCircle2,
  Copy,
  Droplets,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { FarmerLot, ProcessingBatch } from '../../types/spicebridge';
import {
  computeBatchOriginBreakdown,
  computePostCleanLabPurity,
  formatNumberIN,
  generatePassportHash,
} from '../../utils/formatters';
import { BatchQrCode } from './BatchQrCode';

interface DigitalPassportCardProps {
  batch: ProcessingBatch;
  lots: FarmerLot[];
  onInspectQr: (batch: ProcessingBatch) => void;
}

export function DigitalPassportCard({
  batch,
  lots,
  onInspectQr,
}: DigitalPassportCardProps) {
  const [copied, setCopied] = useState(false);

  const origin = computeBatchOriginBreakdown(batch.lotIds, lots);
  const labPurity = computePostCleanLabPurity(batch.weightedPurity);
  const isMoisturePass = batch.weightedMoisture < 9.0;
  const isPurityPass = labPurity > 99.0;

  const passportId = `PASSPORT-${batch.id}`;
  const passportHash = generatePassportHash(
    `${batch.id}:${batch.lotIds.join(',')}:${batch.createdAt}`,
  );
  const qrPayload = `https://spicebridge.ag/passport/${batch.id}?hash=${passportHash}`;

  const handleCopyHash = async () => {
    try {
      await navigator.clipboard.writeText(`${passportId} (${passportHash})`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  return (
    <article
      aria-label={`Digital Batch Passport for ${batch.id}`}
      className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      {/* Passport Official Credential Top Band */}
      <div className="bg-forest-800 px-6 py-4 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-amber-300">
              SpiceBridge Traceability Passport
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h3 className="font-display text-lg font-bold tracking-tight">
                {batch.id}
              </h3>
              <span className="text-white/40" aria-hidden="true">
                ·
              </span>
              <span className="text-sm font-medium text-emerald-100">
                {batch.cropSummary}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="font-mono text-sm font-bold text-white tabular-nums">
              {formatNumberIN(batch.totalKg)} kg ({(batch.totalKg / 1000).toFixed(2)} MT)
            </span>
            <p className="text-[11px] text-emerald-100/80 tabular-nums">
              {batch.totalBags} bags · {batch.hubLine}
            </p>
          </div>
        </div>
      </div>

      {/* QR Code + Serial + Quick Scan Strip */}
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="shrink-0 self-start">
            <BatchQrCode
              payload={qrPayload}
              size={104}
              label={`Unique QR code for batch ${batch.id}`}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Unique Batch Passport ID
                </p>
                <p className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {passportId}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-forest-800 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-forest-700" aria-hidden="true" />
                <span>
                  {batch.status === 'cleaned'
                    ? 'Sortex & CoA Verified'
                    : batch.status === 'cleaning'
                      ? 'Line Cleaning Active'
                      : 'Pre-Clean Lot Traceable'}
                </span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              <span className="font-mono text-slate-700">
                Checksum: {passportHash}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="tabular-nums">
                {origin.contributingLots.length} contributing{' '}
                {origin.contributingLots.length === 1 ? 'farmer' : 'farmers'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => onInspectQr(batch)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-forest-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-800 transition-colors cursor-pointer"
              >
                <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Scan Buyer QR View</span>
              </button>
              <button
                type="button"
                onClick={handleCopyHash}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-forest-700" aria-hidden="true" />
                    <span className="text-forest-700">Copied ID</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    <span>Copy Passport ID</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Origin Cluster Breakdown (Unjha / Sirohi Farmer %) */}
      <div className="border-b border-slate-200 px-6 py-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-turmeric-600" aria-hidden="true" />
            <h4 className="font-display text-sm font-bold text-slate-900">
              Origin Cluster Breakdown (% of Contributing Farmers)
            </h4>
          </div>
          <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
            Unjha {origin.unjhaFarmerPercent.toFixed(0)}% · Sirohi{' '}
            {origin.sirohiFarmerPercent.toFixed(0)}%
            {origin.otherFarmerPercent > 0
              ? ` · Other ${origin.otherFarmerPercent.toFixed(0)}%`
              : ''}
          </span>
        </div>

        {/* Segmented Origin Bar */}
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          {origin.clusters.map((cluster, idx) => {
            const barColor =
              cluster.clusterKey === 'Unjha'
                ? 'bg-forest-700'
                : cluster.clusterKey === 'Sirohi'
                  ? 'bg-turmeric-500'
                  : idx % 2 === 0
                    ? 'bg-emerald-500'
                    : 'bg-slate-500';
            return (
              <div
                key={cluster.clusterKey}
                className={`${barColor} transition-all duration-200`}
                style={{ width: `${cluster.farmerPercent}%` }}
                title={`${cluster.regionLabel}: ${cluster.farmerPercent.toFixed(0)}% of farmers`}
              />
            );
          })}
        </div>

        {/* Per-Cluster Farmer & Weight Breakdown */}
        <ul className="space-y-2">
          {origin.clusters.map((cluster) => {
            const dotColor =
              cluster.clusterKey === 'Unjha'
                ? 'bg-forest-700'
                : cluster.clusterKey === 'Sirohi'
                  ? 'bg-turmeric-500'
                  : 'bg-slate-500';
            return (
              <li
                key={cluster.clusterKey}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-slate-50/60 px-3.5 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-xs shrink-0 ${dotColor}`}
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-slate-900">
                      {cluster.regionLabel}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      ({cluster.lotIds.join(', ')})
                    </span>
                  </div>
                  <p className="mt-0.5 pl-4.5 text-[11px] text-slate-500 truncate">
                    {cluster.farmerNames.join(', ')}
                  </p>
                </div>

                <div className="text-right font-mono tabular-nums shrink-0">
                  <span className="font-bold text-slate-900">
                    {cluster.farmerPercent.toFixed(0)}% farmers
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {cluster.farmerCount} {cluster.farmerCount === 1 ? 'farmer' : 'farmers'} ·{' '}
                    {formatNumberIN(cluster.totalKg)} kg ({cluster.weightPercent.toFixed(0)}%)
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Composite Moisture (<9%) & Lab Purity (>99%) */}
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Droplets className="h-4 w-4 text-forest-700" aria-hidden="true" />
                <span>Composite Moisture</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isMoisturePass ? 'Pass (< 9%)' : 'Review'}</span>
              </span>
            </div>
            <p className="mt-2 font-mono text-xl font-bold text-slate-900 tabular-nums">
              {batch.weightedMoisture.toFixed(1)}%
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Weighted farm-gate composite below 9.0% limit
            </p>
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Sparkles className="h-4 w-4 text-turmeric-600" aria-hidden="true" />
                <span>Lab Purity (Post-Sortex)</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isPurityPass ? 'Pass (> 99%)' : 'Standard'}</span>
              </span>
            </div>
            <p className="mt-2 font-mono text-xl font-bold text-slate-900 tabular-nums">
              {labPurity.toFixed(2)}%
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
              Upgraded from {batch.weightedPurity.toFixed(1)}% raw farm-gate intake
            </p>
          </div>
        </div>
      </div>

      {/* FSSAI & APMC Regulatory Compliance Verification */}
      <div className="px-6 py-4 bg-slate-50/60">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 text-forest-700" aria-hidden="true" />
          <h4 className="font-display text-xs font-bold text-slate-800">
            Regulatory &amp; Trade Compliance Verification
          </h4>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200/80 bg-white px-3 py-2.5">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-forest-700"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-semibold text-slate-900">
                FSSAI Spice Grade Verified
              </p>
              <p className="text-[11px] text-slate-500">
                Moisture &lt;9% · Purity &gt;99% · MRL Screened
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-emerald-200/80 bg-white px-3 py-2.5">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-forest-700"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-semibold text-slate-900">
                APMC Direct-Purchase Verified
              </p>
              <p className="text-[11px] text-slate-500">
                GJ/RJ Direct Farm-Gate Ledger · Zero Mandi Fee
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
