import { RefreshCw } from 'lucide-react';
import {
  CompetitorAlternative,
  FarmerLot,
  PositioningMapState,
  PositioningStatementState,
} from '../../types/spicebridge';
import {
  deriveDefaultTargetCustomer,
  formatINR,
  isAlternativeCompleted,
} from '../../utils/formatters';

interface StatementBuilderStepProps {
  statement: PositioningStatementState;
  selectedLot: FarmerLot | undefined;
  alternatives: CompetitorAlternative[];
  positioningState: PositioningMapState;
  onChangeComponents: (
    patch: Partial<
      Pick<
        PositioningStatementState,
        | 'targetCustomer'
        | 'category'
        | 'primaryBenefit'
        | 'mainAlternativeId'
        | 'reasonToBelieve'
      >
    >,
  ) => void;
}

export function StatementBuilderStep({
  statement,
  selectedLot,
  alternatives,
  positioningState,
  onChangeComponents,
}: StatementBuilderStepProps) {
  const matrixAlternatives = alternatives.filter(
    (alt) => alt.name.trim().length > 0 && isAlternativeCompleted(alt),
  );
  const selectableAlternatives =
    matrixAlternatives.length > 0
      ? matrixAlternatives
      : alternatives.filter((alt) => alt.name.trim().length > 0);

  const selectedMainAlt = selectableAlternatives.find(
    (alt) => alt.id === statement.mainAlternativeId,
  );

  const sbScore = positioningState.spiceBridgeScore;
  const altScore = selectedMainAlt
    ? positioningState.alternativeScores[selectedMainAlt.id]
    : undefined;

  return (
    <section
      aria-label="Step 1: Build the Positioning Statement"
      className="rounded-xl border border-slate-200 bg-white p-5 space-y-5"
    >
      <div className="border-b border-slate-100 pb-3">
        <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
          Step 1 — Build the Statement (5 Editable Components)
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          Pre-filled only with customer/buyer context already stored in the app. Use
          your Lot Profile, Competitor Matrix, and Battlefield Map facts below to ground
          each field.
        </p>
      </div>

      {/* Stored App Context Reference (Strictly Existing Data) */}
      <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 lg:grid-cols-2 text-xs">
        <div className="space-y-1">
          <p className="font-bold text-slate-800">
            Stored Lot &amp; Venture Context
          </p>
          {selectedLot ? (
            <p className="text-slate-600 leading-relaxed">
              <strong className="text-slate-900">{selectedLot.id}</strong> (
              {selectedLot.cropLabel} · {selectedLot.variety}) —{' '}
              <span className="font-mono tabular-nums">
                {selectedLot.moisturePercent.toFixed(1)}% moisture ({selectedLot.moistureNote}
                ), {selectedLot.purityPercent.toFixed(1)}% purity
              </span>
              , {formatINR(selectedLot.offeredPricePerKg)}/kg ({selectedLot.priceNote}),{' '}
              {selectedLot.bankTransferStatus}.
            </p>
          ) : (
            <p className="text-slate-500">No lot selected.</p>
          )}
        </div>

        <div className="space-y-1">
          <p className="font-bold text-slate-800">
            Stored Battlefield Map Coordinates
          </p>
          <p className="text-slate-600 leading-relaxed">
            SpiceBridge:{' '}
            <span className="font-mono font-semibold text-forest-800 tabular-nums">
              {positioningState.axes.xName.trim()} {sbScore.x}/10 ·{' '}
              {positioningState.axes.yName.trim()} {sbScore.y}/10
            </span>
            {selectedMainAlt && altScore?.x && altScore?.y && (
              <>
                {' '}
                vs. <strong className="text-slate-900">{selectedMainAlt.name}</strong>:{' '}
                <span className="font-mono font-semibold text-slate-800 tabular-nums">
                  {altScore.x}/10 · {altScore.y}/10
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Five Editable Fields */}
      <div className="space-y-4">
        {/* 1. Target Customer */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="ps-target-customer"
              className="block text-xs font-bold tracking-wide text-slate-800"
            >
              1. TARGET CUSTOMER
            </label>
            <button
              type="button"
              onClick={() =>
                onChangeComponents({
                  targetCustomer: deriveDefaultTargetCustomer(selectedLot),
                })
              }
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700 hover:text-forest-900 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              <span>Use selected lot buyer context</span>
            </button>
          </div>
          <input
            id="ps-target-customer"
            type="text"
            value={statement.targetCustomer}
            onChange={(e) =>
              onChangeComponents({ targetCustomer: e.target.value })
            }
            placeholder="Describe the target buyer or customer segment from app context"
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
          />
        </div>

        {/* 2. Category / Type of Solution & 4. Main Alternative */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="ps-category"
              className="block text-xs font-bold tracking-wide text-slate-800"
            >
              2. CATEGORY / TYPE OF SOLUTION
            </label>
            <input
              id="ps-category"
              type="text"
              value={statement.category}
              onChange={(e) => onChangeComponents({ category: e.target.value })}
              placeholder="Describe what kind of solution SpiceBridge is"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="ps-main-alternative"
              className="block text-xs font-bold tracking-wide text-slate-800"
            >
              4. MAIN ALTERNATIVE (From Competitor Matrix)
            </label>
            <select
              id="ps-main-alternative"
              value={statement.mainAlternativeId}
              onChange={(e) =>
                onChangeComponents({ mainAlternativeId: e.target.value })
              }
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-forest-600 focus:outline-none"
            >
              <option value="">Select ONE alternative from your Competitor Matrix...</option>
              {selectableAlternatives.map((alt) => (
                <option key={alt.id} value={alt.id}>
                  {alt.name} ({alt.type || 'Unclassified'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedMainAlt && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 space-y-1">
            <p>
              <strong className="text-slate-900">{selectedMainAlt.name}</strong> (
              {selectedMainAlt.type} · Evidence Quality:{' '}
              <strong>{selectedMainAlt.evidenceQuality || 'Not set'}</strong>)
            </p>
            <p>
              <span className="text-slate-500">Entered Offer:</span>{' '}
              {selectedMainAlt.mainOffer || 'Evidence required'}
            </p>
            <p>
              <span className="text-slate-500">Entered Weakness:</span>{' '}
              {selectedMainAlt.mainWeakness || 'Evidence required'}
            </p>
            <p>
              <span className="text-slate-500">Entered Source:</span>{' '}
              {selectedMainAlt.evidenceSource || 'Evidence required'}
            </p>
          </div>
        )}

        {/* 3. Primary Benefit */}
        <div>
          <label
            htmlFor="ps-primary-benefit"
            className="block text-xs font-bold tracking-wide text-slate-800"
          >
            3. PRIMARY BENEFIT
          </label>
          <textarea
            id="ps-primary-benefit"
            rows={2}
            value={statement.primaryBenefit}
            onChange={(e) =>
              onChangeComponents({ primaryBenefit: e.target.value })
            }
            placeholder="State the single most important customer benefit"
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
          />
        </div>

        {/* 5. Reason to Believe */}
        <div>
          <label
            htmlFor="ps-reason-to-believe"
            className="block text-xs font-bold tracking-wide text-slate-800"
          >
            5. REASON TO BELIEVE (Must reference stored features, evidence, or capabilities)
          </label>
          <textarea
            id="ps-reason-to-believe"
            rows={3}
            value={statement.reasonToBelieve}
            onChange={(e) =>
              onChangeComponents({ reasonToBelieve: e.target.value })
            }
            placeholder="Explain why customers should believe the claimed benefit using actual lot metrics, assay rules, or Competitor Matrix evidence"
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
          />
        </div>
      </div>
    </section>
  );
}
