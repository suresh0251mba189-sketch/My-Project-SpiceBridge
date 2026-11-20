import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import {
  CompetitorAlternative,
  PositioningAxes,
  PositioningScore,
} from '../../types/spicebridge';
import {
  arePositioningAxesDefined,
  isAlternativeCompleted,
  isScoreComplete,
} from '../../utils/formatters';

interface PositioningScoringStepProps {
  axes: PositioningAxes;
  spiceBridgeScore: PositioningScore;
  scorableAlternatives: CompetitorAlternative[];
  alternativeScores: Record<string, PositioningScore>;
  onChangeSpiceBridgeScore: (patch: Partial<PositioningScore>) => void;
  onChangeAlternativeScore: (
    alternativeId: string,
    patch: Partial<PositioningScore>,
  ) => void;
}

const SCALE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface DimensionControlProps {
  inputId: string;
  dimensionLabel: string;
  lowLabel: string;
  highLabel: string;
  value: number | null;
  accent?: 'forest' | 'slate';
  onChange: (next: number | null) => void;
}

function DimensionScaleControl({
  inputId,
  dimensionLabel,
  lowLabel,
  highLabel,
  value,
  accent = 'slate',
  onChange,
}: DimensionControlProps) {
  const isAssigned = value !== null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-slate-800 truncate"
        >
          {dimensionLabel}
        </label>
        <div className="flex items-center gap-2 shrink-0">
          {isAssigned ? (
            <>
              <span
                className={`font-mono text-xs font-bold tabular-nums ${
                  accent === 'forest' ? 'text-forest-800' : 'text-slate-900'
                }`}
              >
                {value} / 10
              </span>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Clear
              </button>
            </>
          ) : (
            <span className="text-[11px] font-medium text-amber-700">
              Not scored yet
            </span>
          )}
        </div>
      </div>

      {/* Range Slider */}
      <input
        id={inputId}
        type="range"
        min={1}
        max={10}
        step={1}
        value={value ?? 5}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${dimensionLabel} score`}
        className={`w-full cursor-pointer accent-forest-700 ${
          isAssigned ? 'opacity-100' : 'opacity-45'
        }`}
      />

      {/* Explicit 1-10 Numeric Selector Buttons */}
      <div
        role="group"
        aria-label={`${dimensionLabel} 1 to 10 selector`}
        className="grid grid-cols-10 gap-1"
      >
        {SCALE_VALUES.map((num) => {
          const active = value === num;
          return (
            <button
              key={num}
              type="button"
              onClick={() => onChange(num)}
              className={`rounded py-1 font-mono text-[11px] font-semibold tabular-nums transition-colors cursor-pointer ${
                active
                  ? accent === 'forest'
                    ? 'bg-forest-700 text-white'
                    : 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {num}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="truncate">1 = {lowLabel}</span>
        <span className="truncate text-right">10 = {highLabel}</span>
      </div>
    </div>
  );
}

export function PositioningScoringStep({
  axes,
  spiceBridgeScore,
  scorableAlternatives,
  alternativeScores,
  onChangeSpiceBridgeScore,
  onChangeAlternativeScore,
}: PositioningScoringStepProps) {
  const axesDefined = arePositioningAxesDefined(axes);

  if (!axesDefined) {
    return (
      <section
        aria-label="Step 2: Score Venture and Alternatives"
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Step 2 — Score SpiceBridge and Each Alternative
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Complete Step 1 by entering both positioning dimension names and all four
              endpoint labels before assigning 1–10 scores.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const xLabel = axes.xName.trim();
  const yLabel = axes.yName.trim();
  const sbComplete = isScoreComplete(spiceBridgeScore);

  return (
    <section
      aria-label="Step 2: Score Venture and Alternatives"
      className="rounded-xl border border-slate-200 bg-white p-5 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
            Step 2 — Score SpiceBridge and Each Alternative
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Manually score SpiceBridge and every alternative from your Competition Lab on{' '}
            <strong className="text-slate-900">{xLabel}</strong> and{' '}
            <strong className="text-slate-900">{yLabel}</strong> (1 to 10).
          </p>
        </div>

        <div className="text-xs text-slate-600 font-mono tabular-nums">
          Axes: <strong className="text-slate-900">{xLabel}</strong> ×{' '}
          <strong className="text-slate-900">{yLabel}</strong>
        </div>
      </div>

      {/* Target Venture: SpiceBridge */}
      <div
        className={`rounded-xl border p-4 space-y-4 ${
          sbComplete
            ? 'border-forest-600/35 bg-forest-50/50'
            : 'border-amber-200 bg-turmeric-50/50'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
          <div>
            <p className="font-display text-sm font-bold text-forest-900">
              SpiceBridge (Your Venture)
            </p>
            <p className="text-xs text-slate-600">
              Assign your evidence-backed target position on both dimensions.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
              sbComplete
                ? 'border border-emerald-200 bg-white text-forest-800'
                : 'border border-amber-200 bg-white text-amber-800'
            }`}
          >
            {sbComplete ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-forest-700" aria-hidden="true" />
                <span>Scored</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                <span>Assign both scores</span>
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <DimensionScaleControl
            inputId="score-spicebridge-x"
            dimensionLabel={xLabel}
            lowLabel={axes.xLeftLabel.trim()}
            highLabel={axes.xRightLabel.trim()}
            value={spiceBridgeScore.x}
            accent="forest"
            onChange={(nextX) => onChangeSpiceBridgeScore({ x: nextX })}
          />

          <DimensionScaleControl
            inputId="score-spicebridge-y"
            dimensionLabel={yLabel}
            lowLabel={axes.yBottomLabel.trim()}
            highLabel={axes.yTopLabel.trim()}
            value={spiceBridgeScore.y}
            accent="forest"
            onChange={(nextY) => onChangeSpiceBridgeScore({ y: nextY })}
          />
        </div>
      </div>

      {/* Researched Alternatives from Competition Lab */}
      <div className="space-y-3">
        <h3 className="font-display text-sm font-bold text-slate-900">
          Competition Lab Alternatives ({scorableAlternatives.length})
        </h3>

        <div className="space-y-3">
          {scorableAlternatives.map((alt, idx) => {
            const score = alternativeScores[alt.id] ?? { x: null, y: null };
            const scored = isScoreComplete(score);
            const completedInLab = isAlternativeCompleted(alt);
            const displayName = alt.name.trim() || `Alternative ${idx + 1} (Unnamed)`;

            return (
              <div
                key={alt.id}
                className={`rounded-xl border p-4 space-y-4 ${
                  scored ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                    <span className="font-display text-sm font-bold text-slate-900">
                      {displayName}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-600">
                      {alt.type || 'Type not set'}
                    </span>
                    {!completedInLab && (
                      <>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-medium text-amber-700">
                          Incomplete in Competition Lab
                        </span>
                      </>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
                      scored
                        ? 'border border-emerald-200 bg-emerald-50 text-forest-800'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {scored ? (
                      <>
                        <CheckCircle2
                          className="h-3 w-3 text-forest-700"
                          aria-hidden="true"
                        />
                        <span>Scored</span>
                      </>
                    ) : (
                      <span>Needs both scores</span>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <DimensionScaleControl
                    inputId={`score-${alt.id}-x`}
                    dimensionLabel={xLabel}
                    lowLabel={axes.xLeftLabel.trim()}
                    highLabel={axes.xRightLabel.trim()}
                    value={score.x}
                    onChange={(nextX) =>
                      onChangeAlternativeScore(alt.id, { x: nextX })
                    }
                  />

                  <DimensionScaleControl
                    inputId={`score-${alt.id}-y`}
                    dimensionLabel={yLabel}
                    lowLabel={axes.yBottomLabel.trim()}
                    highLabel={axes.yTopLabel.trim()}
                    value={score.y}
                    onChange={(nextY) =>
                      onChangeAlternativeScore(alt.id, { y: nextY })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
