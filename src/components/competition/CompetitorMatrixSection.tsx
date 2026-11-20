import { CompetitorAlternative } from '../../types/spicebridge';
import {
  computeCompetitionSummary,
  isAlternativeCompleted,
} from '../../utils/formatters';

interface CompetitorMatrixSectionProps {
  alternatives: CompetitorAlternative[];
}

function renderCellText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return (
      <span className="font-medium text-amber-700">Evidence required</span>
    );
  }
  return <span className="text-slate-800">{trimmed}</span>;
}

export function CompetitorMatrixSection({
  alternatives,
}: CompetitorMatrixSectionProps) {
  const summary = computeCompetitionSummary(alternatives);

  return (
    <section
      aria-label="Competitor Matrix"
      className="space-y-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
            Competitor Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generated strictly from your entered evidence. Missing fields display
            &ldquo;Evidence required&rdquo;.
          </p>
        </div>
        <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
          {summary.completedCount} / 3 completed alternatives required to unlock map
        </span>
      </div>

      {/* 6 Summary Metrics Above Matrix */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-medium text-slate-500">
            Alternatives researched
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {summary.researchedCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-medium text-slate-500">
            Direct competitors
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {summary.directCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-medium text-slate-500">
            Indirect competitors
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {summary.indirectCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-medium text-slate-500">Substitutes</p>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {summary.substituteCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-medium text-slate-500">
            Do-Nothing alternatives
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {summary.doNothingCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-medium text-slate-500">
            Overall evidence quality
          </p>
          <p
            className={`mt-1 font-display text-base font-bold ${
              summary.overallEvidenceQuality === 'Strong'
                ? 'text-forest-700'
                : summary.overallEvidenceQuality === 'Moderate'
                  ? 'text-amber-700'
                  : summary.overallEvidenceQuality === 'Weak'
                    ? 'text-red-600'
                    : 'text-amber-700'
            }`}
          >
            {summary.overallEvidenceQuality}
          </p>
          {summary.completedCount > 0 && (
            <p className="mt-0.5 text-[10px] text-slate-500 tabular-nums">
              {summary.qualityBreakdown.strong}S · {summary.qualityBreakdown.moderate}M ·{' '}
              {summary.qualityBreakdown.weak}W
            </p>
          )}
        </div>
      </div>

      {/* Competitor Matrix Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-semibold text-slate-600">
                <th className="py-3 pl-5 pr-3 whitespace-nowrap">Alternative</th>
                <th className="py-3 px-3 whitespace-nowrap">Type</th>
                <th className="py-3 px-3 whitespace-nowrap">Price / Cost</th>
                <th className="py-3 px-3 whitespace-nowrap">Main Offer</th>
                <th className="py-3 px-3 whitespace-nowrap">Main Strength</th>
                <th className="py-3 px-3 whitespace-nowrap">Main Weakness</th>
                <th className="py-3 px-3 whitespace-nowrap">Evidence / Source</th>
                <th className="py-3 pl-3 pr-5 whitespace-nowrap">Evidence Quality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs">
              {alternatives.map((alt, idx) => {
                const completed = isAlternativeCompleted(alt);
                return (
                  <tr
                    key={alt.id}
                    className={completed ? 'bg-white' : 'bg-slate-50/40'}
                  >
                    <td className="py-3 pl-5 pr-3 align-top font-semibold">
                      <span className="block text-[10px] font-mono text-slate-400">
                        #{idx + 1}
                      </span>
                      {renderCellText(alt.name)}
                    </td>

                    <td className="py-3 px-3 align-top whitespace-nowrap">
                      {alt.type ? (
                        <span className="font-medium text-slate-800">{alt.type}</span>
                      ) : (
                        <span className="font-medium text-amber-700">
                          Evidence required
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 align-top">
                      {alt.priceNotApplicable ? (
                        <span className="font-medium text-slate-500">
                          Not applicable
                        </span>
                      ) : (
                        renderCellText(alt.priceCost)
                      )}
                    </td>

                    <td className="py-3 px-3 align-top max-w-[200px]">
                      {renderCellText(alt.mainOffer)}
                    </td>

                    <td className="py-3 px-3 align-top max-w-[200px]">
                      {renderCellText(alt.mainStrength)}
                    </td>

                    <td className="py-3 px-3 align-top max-w-[200px]">
                      {renderCellText(alt.mainWeakness)}
                    </td>

                    <td className="py-3 px-3 align-top max-w-[220px] break-words">
                      {renderCellText(alt.evidenceSource)}
                    </td>

                    <td className="py-3 pl-3 pr-5 align-top whitespace-nowrap">
                      {alt.evidenceQuality ? (
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${
                            alt.evidenceQuality === 'Strong'
                              ? 'bg-emerald-50 text-forest-800 border border-emerald-200'
                              : alt.evidenceQuality === 'Moderate'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {alt.evidenceQuality}
                        </span>
                      ) : (
                        <span className="font-medium text-amber-700">
                          Evidence required
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
