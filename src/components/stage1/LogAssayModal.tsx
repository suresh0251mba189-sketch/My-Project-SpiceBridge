import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import {
  AROMA_GRADE_OPTIONS,
  CLUSTER_SUGGESTIONS,
  VARIETY_OPTIONS,
} from '../../data/seedLots';
import { CropType, FarmerLot, NewLotFormValues } from '../../types/spicebridge';
import {
  calculateBagCount,
  evaluateMoisture,
  formatINR,
  getCropDisplayName,
} from '../../utils/formatters';

interface LogAssayModalProps {
  isOpen: boolean;
  nextLotId: string;
  onClose: () => void;
  onSubmitLot: (lot: FarmerLot) => void;
}

const INITIAL_FORM_VALUES: NewLotFormValues = {
  farmerName: '',
  crop: 'Fennel',
  variety: VARIETY_OPTIONS.Fennel[0],
  clusterGeography: CLUSTER_SUGGESTIONS[0],
  quantityKg: '1000',
  moisturePercent: '8.3',
  purityPercent: '98.2',
  aromaGrade: AROMA_GRADE_OPTIONS[0],
  offeredPricePerKg: '179',
  mandiNetPricePerKg: '164',
};

export function LogAssayModal({
  isOpen,
  nextLotId,
  onClose,
  onSubmitLot,
}: LogAssayModalProps) {
  const [values, setValues] = useState<NewLotFormValues>(INITIAL_FORM_VALUES);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setValues(INITIAL_FORM_VALUES);
    setErrorMessage('');

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const parsedQty = parseFloat(values.quantityKg);
  const parsedMoisture = parseFloat(values.moisturePercent);
  const parsedPurity = parseFloat(values.purityPercent);
  const parsedOffered = parseFloat(values.offeredPricePerKg);
  const parsedMandi = parseFloat(values.mandiNetPricePerKg);

  const hasValidMoisture =
    Number.isFinite(parsedMoisture) && parsedMoisture >= 1 && parsedMoisture <= 30;
  const moistureEval = hasValidMoisture ? evaluateMoisture(parsedMoisture) : null;

  const estimatedBags = Number.isFinite(parsedQty) ? calculateBagCount(parsedQty) : 0;
  const foreignMatterPercent =
    Number.isFinite(parsedPurity) && parsedPurity >= 50 && parsedPurity <= 100
      ? (100 - parsedPurity).toFixed(1)
      : null;

  const previewGross =
    Number.isFinite(parsedQty) &&
    parsedQty > 0 &&
    Number.isFinite(parsedOffered) &&
    parsedOffered > 0
      ? parsedQty * parsedOffered
      : null;

  const previewGain =
    previewGross !== null &&
    Number.isFinite(parsedMandi) &&
    parsedMandi > 0 &&
    parsedOffered > parsedMandi
      ? parsedQty * (parsedOffered - parsedMandi)
      : null;

  const handleCropChange = (nextCrop: CropType) => {
    setValues((prev) => ({
      ...prev,
      crop: nextCrop,
      variety: VARIETY_OPTIONS[nextCrop][0],
      offeredPricePerKg: nextCrop === 'Cumin' ? '242' : '179',
      mandiNetPricePerKg: nextCrop === 'Cumin' ? '225' : '164',
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const trimmedFarmer = values.farmerName.trim();
    const trimmedCluster = values.clusterGeography.trim();
    const trimmedVariety = values.variety.trim();
    const trimmedAroma = values.aromaGrade.trim();

    if (!trimmedFarmer) {
      setErrorMessage('Please enter the farmer name.');
      return;
    }
    if (!trimmedCluster) {
      setErrorMessage('Please specify the cluster geography.');
      return;
    }
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setErrorMessage('Harvest quantity must be a positive number in kg.');
      return;
    }
    if (!hasValidMoisture || !moistureEval) {
      setErrorMessage('Moisture reading must be between 1.0% and 30.0%.');
      return;
    }
    if (!Number.isFinite(parsedPurity) || parsedPurity < 50 || parsedPurity > 100) {
      setErrorMessage('Purity percentage must be between 50% and 100%.');
      return;
    }
    if (!Number.isFinite(parsedOffered) || parsedOffered <= 0) {
      setErrorMessage('Offered farm-gate price must be greater than ₹0/kg.');
      return;
    }

    const isPass = moistureEval.status === 'pass';
    const hasMandiNet = Number.isFinite(parsedMandi) && parsedMandi > 0;

    const newLot: FarmerLot = {
      id: nextLotId,
      farmerName: trimmedFarmer,
      crop: values.crop,
      cropLabel: getCropDisplayName(values.crop),
      variety: trimmedVariety || VARIETY_OPTIONS[values.crop][0],
      clusterGeography: trimmedCluster,
      quantityKg: Math.round(parsedQty),
      bagCount: Math.max(1, calculateBagCount(parsedQty)),
      moisturePercent: Number(parsedMoisture.toFixed(1)),
      moistureNote: moistureEval.note,
      qualityStatus: moistureEval.status,
      purityPercent: Number(parsedPurity.toFixed(1)),
      foreignMatterNote: `${(100 - parsedPurity).toFixed(1)}% foreign matter`,
      aromaGrade:
        trimmedAroma ||
        (isPass ? 'Premium Export Green' : 'Moisture Risk — Hold'),
      offeredPricePerKg: Math.round(parsedOffered),
      mandiNetPricePerKg: isPass && hasMandiNet ? Math.round(parsedMandi) : null,
      priceNote: isPass
        ? hasMandiNet
          ? `vs. Mandi net ₹${Math.round(parsedMandi)}/kg`
          : 'Direct spot quote'
        : parsedMoisture >= 10
          ? 'Subject to re-assay'
          : 'Conditional on drying',
      bankTransferStatus: isPass
        ? 'Scheduled — 24h Direct Bank Transfer'
        : 'On Hold — Sun-drying < 9.0% required before transfer',
      assayedAt: new Date().toISOString(),
    };

    onSubmitLot(newLot);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-assay-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2
                id="log-assay-modal-title"
                className="font-display text-lg font-bold text-slate-900"
              >
                Log New Farm-Gate Assay
              </h2>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 tabular-nums">
                {nextLotId}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Digital moisture grading auto-validates against the 9.0% intake threshold.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700"
            >
              {errorMessage}
            </div>
          )}

          {/* Farmer & Cluster */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="farmerName"
                className="block text-xs font-semibold text-slate-700"
              >
                Farmer Name
              </label>
              <input
                id="farmerName"
                type="text"
                required
                value={values.farmerName}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, farmerName: e.target.value }))
                }
                placeholder="e.g. Arvindbhai Chaudhary"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="clusterGeography"
                className="block text-xs font-semibold text-slate-700"
              >
                Cluster Geography
              </label>
              <input
                id="clusterGeography"
                type="text"
                list="cluster-suggestions"
                required
                value={values.clusterGeography}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, clusterGeography: e.target.value }))
                }
                placeholder="e.g. Unjha, Mehsana (Gujarat)"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
              />
              <datalist id="cluster-suggestions">
                {CLUSTER_SUGGESTIONS.map((cluster) => (
                  <option key={cluster} value={cluster} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Crop, Variety & Quantity */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <span className="block text-xs font-semibold text-slate-700">Crop</span>
              <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                {(['Fennel', 'Cumin'] as CropType[]).map((crop) => (
                  <button
                    key={crop}
                    type="button"
                    onClick={() => handleCropChange(crop)}
                    className={`rounded-md py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      values.crop === crop
                        ? 'bg-white text-forest-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {crop}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="variety"
                className="block text-xs font-semibold text-slate-700"
              >
                Variety
              </label>
              <input
                id="variety"
                type="text"
                list="variety-suggestions"
                required
                value={values.variety}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, variety: e.target.value }))
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-forest-600 focus:outline-none"
              />
              <datalist id="variety-suggestions">
                {VARIETY_OPTIONS[values.crop].map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>

            <div>
              <label
                htmlFor="quantityKg"
                className="block text-xs font-semibold text-slate-700"
              >
                Harvest Quantity (kg)
              </label>
              <input
                id="quantityKg"
                type="number"
                min="50"
                step="50"
                required
                value={values.quantityKg}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, quantityKg: e.target.value }))
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-forest-600 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-500 tabular-nums">
                ≈ {estimatedBags} bags × 50 kg
              </p>
            </div>
          </div>

          {/* Live Moisture Validation Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="moisturePercent"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Moisture Reading (%)
                </label>
                <input
                  id="moisturePercent"
                  type="number"
                  step="0.1"
                  min="1"
                  max="30"
                  required
                  value={values.moisturePercent}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      moisturePercent: e.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm font-semibold text-slate-900 tabular-nums focus:border-forest-600 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="purityPercent"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Purity (%)
                </label>
                <input
                  id="purityPercent"
                  type="number"
                  step="0.1"
                  min="50"
                  max="100"
                  required
                  value={values.purityPercent}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, purityPercent: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-forest-600 focus:outline-none"
                />
                {foreignMatterPercent !== null && (
                  <p className="mt-1 text-[11px] text-slate-500 tabular-nums">
                    {foreignMatterPercent}% chaff / foreign matter
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="aromaGrade"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Volatile Oil / Aroma Grade
                </label>
                <input
                  id="aromaGrade"
                  type="text"
                  list="aroma-suggestions"
                  required
                  value={values.aromaGrade}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, aromaGrade: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-forest-600 focus:outline-none"
                />
                <datalist id="aroma-suggestions">
                  {AROMA_GRADE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Live Moisture Validation Banner */}
            {moistureEval ? (
              <div
                aria-live="polite"
                className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs ${
                  moistureEval.severity === 'pass'
                    ? 'border-emerald-200 bg-emerald-50 text-forest-800'
                    : moistureEval.severity === 'warning'
                      ? 'border-amber-200 bg-amber-50 text-amber-900'
                      : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {moistureEval.status === 'pass' ? (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-forest-700"
                    aria-hidden="true"
                  />
                ) : (
                  <AlertTriangle
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      moistureEval.severity === 'reject'
                        ? 'text-red-600'
                        : 'text-amber-600'
                    }`}
                    aria-hidden="true"
                  />
                )}
                <div>
                  <span className="font-semibold">
                    Live Moisture Validation: {moistureEval.label}
                  </span>
                  <span className="block mt-0.5 opacity-90">
                    {moistureEval.status === 'pass'
                      ? 'Below 9.0% threshold — automatically approved for farm-gate intake and 24-hour direct bank transfer.'
                      : 'At or above 9.0% threshold — automatically flagged Hold / Re-dry; payout held until sun-dried below 9.0%.'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-500">
                Enter a moisture reading (%) to evaluate Pass (&lt; 9.0%) or Hold (&ge; 9.0%)
                intake eligibility.
              </div>
            )}
          </div>

          {/* Pricing Inputs & Payout Preview */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="offeredPricePerKg"
                className="block text-xs font-semibold text-slate-700"
              >
                Offered Farm-Gate Price (₹/kg)
              </label>
              <input
                id="offeredPricePerKg"
                type="number"
                min="1"
                required
                value={values.offeredPricePerKg}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, offeredPricePerKg: e.target.value }))
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="mandiNetPricePerKg"
                className="block text-xs font-semibold text-slate-700"
              >
                Traditional Mandi Net Benchmark (₹/kg)
              </label>
              <input
                id="mandiNetPricePerKg"
                type="number"
                min="0"
                value={values.mandiNetPricePerKg}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    mandiNetPricePerKg: e.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-forest-600 focus:outline-none"
              />
            </div>
          </div>

          {previewGross !== null && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
              <div>
                <span className="text-slate-500">Estimated Gross Payout: </span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatINR(previewGross)}
                </span>
              </div>
              {previewGain !== null && moistureEval?.status === 'pass' && (
                <div>
                  <span className="text-slate-500">Farmer Gain vs. Mandi: </span>
                  <span className="font-mono font-bold text-turmeric-700 tabular-nums">
                    +{formatINR(previewGain)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-forest-700 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 cursor-pointer"
            >
              Save &amp; Log Assay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
