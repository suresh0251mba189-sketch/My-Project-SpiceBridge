import { CheckCircle2, CircleDashed, Trash2 } from 'lucide-react';
import {
  CompetitorAlternative,
  CompetitorType,
  EvidenceQuality,
} from '../../types/spicebridge';
import { isAlternativeCompleted } from '../../utils/formatters';

interface AlternativeResearchCardProps {
  index: number;
  alternative: CompetitorAlternative;
  canRemove: boolean;
  onChange: (id: string, patch: Partial<CompetitorAlternative>) => void;
  onRemove: (id: string) => void;
}

const COMPETITOR_TYPES: CompetitorType[] = [
  'Direct Competitor',
  'Indirect Competitor',
  'Substitute',
  'Do Nothing',
];

const EVIDENCE_QUALITIES: EvidenceQuality[] = ['Strong', 'Moderate', 'Weak'];

export function AlternativeResearchCard({
  index,
  alternative,
  canRemove,
  onChange,
  onRemove,
}: AlternativeResearchCardProps) {
  const completed = isAlternativeCompleted(alternative);

  return (
    <article
      aria-label={`Alternative ${index + 1} research entry`}
      className={`rounded-xl border bg-white p-5 space-y-4 ${
        completed ? 'border-forest-600/35' : 'border-slate-200'
      }`}
    >
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold text-slate-700">
            Alternative {index + 1}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
              completed
                ? 'bg-emerald-50 text-forest-800 border border-emerald-200'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {completed ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-forest-700" aria-hidden="true" />
                <span>Complete</span>
              </>
            ) : (
              <>
                <CircleDashed className="h-3 w-3 text-slate-500" aria-hidden="true" />
                <span>Incomplete</span>
              </>
            )}
          </span>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(alternative.id)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Remove</span>
          </button>
        )}
      </div>

      {/* Row 1: Name, Type, Price/Cost */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label
            htmlFor={`${alternative.id}-name`}
            className="block text-xs font-semibold text-slate-700"
          >
            1. Competitor / Alternative Name
          </label>
          <input
            id={`${alternative.id}-name`}
            type="text"
            value={alternative.name}
            onChange={(e) => onChange(alternative.id, { name: e.target.value })}
            placeholder="Enter competitor or alternative name"
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor={`${alternative.id}-type`}
            className="block text-xs font-semibold text-slate-700"
          >
            2. Type
          </label>
          <select
            id={`${alternative.id}-type`}
            value={alternative.type}
            onChange={(e) =>
              onChange(alternative.id, {
                type: e.target.value as CompetitorType | '',
              })
            }
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
          >
            <option value="">Select type...</option>
            {COMPETITOR_TYPES.map((typeOption) => (
              <option key={typeOption} value={typeOption}>
                {typeOption}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={`${alternative.id}-price`}
              className="block text-xs font-semibold text-slate-700"
            >
              3. Approximate Price / Cost
            </label>
            <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={alternative.priceNotApplicable}
                onChange={(e) =>
                  onChange(alternative.id, {
                    priceNotApplicable: e.target.checked,
                    priceCost: e.target.checked ? '' : alternative.priceCost,
                  })
                }
                className="rounded border-slate-300 text-forest-700 focus:ring-forest-600"
              />
              <span>Not applicable</span>
            </label>
          </div>
          <input
            id={`${alternative.id}-price`}
            type="text"
            disabled={alternative.priceNotApplicable}
            value={
              alternative.priceNotApplicable
                ? 'Not applicable'
                : alternative.priceCost
            }
            onChange={(e) =>
              onChange(alternative.id, { priceCost: e.target.value })
            }
            placeholder="Enter ₹/kg, fee %, or spread"
            className={`mt-1.5 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none ${
              alternative.priceNotApplicable
                ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-forest-600'
            }`}
          />
        </div>
      </div>

      {/* Row 2: Main Offer, Main Strength, Main Weakness */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label
            htmlFor={`${alternative.id}-offer`}
            className="block text-xs font-semibold text-slate-700"
          >
            4. Main Offer
          </label>
          <textarea
            id={`${alternative.id}-offer`}
            rows={2}
            value={alternative.mainOffer}
            onChange={(e) =>
              onChange(alternative.id, { mainOffer: e.target.value })
            }
            placeholder="Describe core offer or option"
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor={`${alternative.id}-strength`}
            className="block text-xs font-semibold text-slate-700"
          >
            5. Main Strength
          </label>
          <textarea
            id={`${alternative.id}-strength`}
            rows={2}
            value={alternative.mainStrength}
            onChange={(e) =>
              onChange(alternative.id, { mainStrength: e.target.value })
            }
            placeholder="Describe key advantage"
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor={`${alternative.id}-weakness`}
            className="block text-xs font-semibold text-slate-700"
          >
            6. Main Weakness
          </label>
          <textarea
            id={`${alternative.id}-weakness`}
            rows={2}
            value={alternative.mainWeakness}
            onChange={(e) =>
              onChange(alternative.id, { mainWeakness: e.target.value })
            }
            placeholder="Describe key limitation or gap"
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Row 3: Evidence / Source & Evidence Quality */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label
            htmlFor={`${alternative.id}-evidence`}
            className="block text-xs font-semibold text-slate-700"
          >
            7. Evidence / Source
          </label>
          <input
            id={`${alternative.id}-evidence`}
            type="text"
            value={alternative.evidenceSource}
            onChange={(e) =>
              onChange(alternative.id, { evidenceSource: e.target.value })
            }
            placeholder="Enter URL, price board ref, quote note, directory listing, or field observation"
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Accepts website URL, mandi/price board reference, supplier/mill quote note,
            trade directory listing, review/field observation note, or other evidence.
          </p>
        </div>

        <div>
          <span className="block text-xs font-semibold text-slate-700">
            8. Evidence Quality
          </span>
          <div
            role="group"
            aria-label={`Evidence quality for alternative ${index + 1}`}
            className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1"
          >
            {EVIDENCE_QUALITIES.map((quality) => {
              const active = alternative.evidenceQuality === quality;
              return (
                <button
                  key={quality}
                  type="button"
                  onClick={() =>
                    onChange(alternative.id, { evidenceQuality: quality })
                  }
                  className={`rounded-md py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? quality === 'Strong'
                        ? 'bg-forest-700 text-white shadow-xs'
                        : quality === 'Moderate'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {quality}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
}
