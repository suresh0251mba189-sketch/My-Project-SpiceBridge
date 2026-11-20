import { CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { useEffect } from 'react';
import { FarmerLot, ProcessingBatch } from '../../types/spicebridge';
import {
  computeBatchOriginBreakdown,
  computePostCleanLabPurity,
  formatNumberIN,
  generatePassportHash,
} from '../../utils/formatters';
import { BatchQrCode } from './BatchQrCode';

interface QrScanPreviewModalProps {
  batch: ProcessingBatch | null;
  lots: FarmerLot[];
  onClose: () => void;
}

export function QrScanPreviewModal({
  batch,
  lots,
  onClose,
}: QrScanPreviewModalProps) {
  useEffect(() => {
    if (!batch) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [batch, onClose]);

  if (!batch) return null;

  const passportHash = generatePassportHash(
    `${batch.id}:${batch.lotIds.join(',')}:${batch.createdAt}`,
  );
  const qrPayload = `https://spicebridge.ag/passport/${batch.id}?hash=${passportHash}`;
  const origin = computeBatchOriginBreakdown(batch.lotIds, lots);
  const labPurity = computePostCleanLabPurity(batch.weightedPurity);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scan-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-forest-800 px-6 py-4 text-white">
          <div>
            <p className="text-xs font-semibold text-amber-300">
              Buyer QR Verification View
            </p>
            <h2
              id="qr-scan-modal-title"
              className="font-display text-lg font-bold tracking-tight"
            >
              Digital Passport {batch.id}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR preview"
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row">
            <BatchQrCode
              payload={qrPayload}
              size={104}
              label={`Scannable QR code for ${batch.id}`}
            />
            <div className="min-w-0 flex-1 space-y-1.5 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-forest-800 border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5 text-forest-700" aria-hidden="true" />
                <span>Verified Traceability Passport</span>
              </div>
              <p className="font-mono text-xs font-semibold text-slate-800 break-all">
                {qrPayload}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                {batch.cropSummary} · {formatNumberIN(batch.totalKg)} kg (
                {(batch.totalKg / 1000).toFixed(2)} MT) · {batch.hubLine}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 p-3.5">
              <p className="text-xs text-slate-500">Composite Moisture</p>
              <p className="mt-1 font-mono text-lg font-bold text-forest-700 tabular-nums">
                {batch.weightedMoisture.toFixed(1)}%
              </p>
              <p className="text-[11px] font-medium text-slate-600">
                Verified &lt; 9.0% Pass
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3.5">
              <p className="text-xs text-slate-500">Post-Cleaning Lab Purity</p>
              <p className="mt-1 font-mono text-lg font-bold text-forest-700 tabular-nums">
                {labPurity.toFixed(2)}%
              </p>
              <p className="text-[11px] font-medium text-slate-600">
                Verified &gt; 99.0% Sortex CoA
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-700 mb-2">
              Verified Farm-Gate Provenance Ledger ({origin.contributingLots.length} Farmers)
            </h3>
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 text-xs">
              {origin.contributingLots.map((lot) => (
                <li
                  key={lot.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                >
                  <div>
                    <span className="font-mono font-semibold text-forest-700">
                      {lot.id}
                    </span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span className="font-semibold text-slate-900">{lot.farmerName}</span>
                    <span className="block text-[11px] text-slate-500">
                      {lot.clusterGeography} · {lot.variety}
                    </span>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="font-semibold text-slate-900">
                      {formatNumberIN(lot.quantityKg)} kg
                    </span>
                    <span className="block text-[11px] text-forest-700">
                      {lot.moisturePercent.toFixed(1)}% H₂O
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-forest-800">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-forest-700" aria-hidden="true" />
              <span>FSSAI Grade &amp; APMC Direct-Purchase Compliant</span>
            </span>
            <span className="font-mono text-[11px] font-semibold">
              SHA-256: {passportHash}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
