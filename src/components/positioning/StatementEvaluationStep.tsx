import { AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PositioningEvaluationResult } from '../../utils/formatters';

interface StatementEvaluationStepProps {
  evaluation: PositioningEvaluationResult;
}

export function StatementEvaluationStep({
  evaluation,
}: StatementEvaluationStepProps) {
  return (
    <section
      aria-label="Step 3: Check the Positioning"
      className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
            Step 3 — Check the Positioning
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Diagnostic check across five strategy dimensions against your Lot Profile,
            Competitor Matrix, and Market Battlefield Map. Specific gaps are highlighted
            below for you to revise manually.
          </p>
        </div>

        {evaluation.needsEvidence && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 whitespace-nowrap">
            <AlertOctagon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>NEEDS EVIDENCE</span>
          </span>
        )}
      </div>

      {/* Prominent Assumption & Evidence Alert (Important Evidence Rule) */}
      {evaluation.needsEvidence && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50/80 p-4 space-y-2 text-xs text-red-900"
        >
          <div className="flex items-center gap-2 font-bold text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>NEEDS EVIDENCE — Unsupported Claims Flagged as Assumptions</span>
          </div>
          {evaluation.assumptions.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1 text-red-800">
              {evaluation.assumptions.map((assumption, idx) => (
                <li key={idx}>
                  <strong>Assumption:</strong> {assumption}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-red-800">
              The Reason to Believe is not yet backed by verifiable facts already entered
              in the app. Ground it in stored lot assay readings, spot prices, or
              verified Competition Lab evidence.
            </p>
          )}
        </div>
      )}

      {/* Five Evaluation Dimensions */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {evaluation.dimensions.map((dim) => {
          const isStrong = dim.rating === 'Strong';
          const isNeedsImp = dim.rating === 'Needs Improvement';

          return (
            <div
              key={dim.key}
              className={`rounded-xl border p-4 space-y-2 ${
                isStrong
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : isNeedsImp
                    ? 'border-amber-200 bg-turmeric-50/50'
                    : 'border-red-200 bg-red-50/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-900">{dim.title}</h3>
                <span
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                    isStrong
                      ? 'bg-forest-700 text-white'
                      : isNeedsImp
                        ? 'bg-amber-600 text-white'
                        : 'bg-red-600 text-white'
                  }`}
                >
                  {isStrong && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
                  <span>{dim.rating}</span>
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                {dim.explanation}
              </p>

              <p className="text-[11px] text-slate-600 border-t border-slate-200/70 pt-2">
                <strong className="text-slate-800">What to check / improve:</strong>{' '}
                {dim.improvementTip}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
