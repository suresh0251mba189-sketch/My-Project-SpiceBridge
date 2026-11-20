import { AlertTriangle } from 'lucide-react';
import { PositioningAxes } from '../../types/spicebridge';
import {
  analyzePositioningMap,
  PlottedAlternativePoint,
} from '../../utils/formatters';

interface MapInterpretationSectionProps {
  axes: PositioningAxes;
  mapVisible: boolean;
  spiceBridgePoint: { x: number; y: number } | null;
  scoredAlternatives: PlottedAlternativePoint[];
}

export function MapInterpretationSection({
  axes,
  mapVisible,
  spiceBridgePoint,
  scoredAlternatives,
}: MapInterpretationSectionProps) {
  if (!mapVisible) {
    return null;
  }

  const analysis = analyzePositioningMap(axes, spiceBridgePoint, scoredAlternatives);

  return (
    <section
      aria-label="Step 4: Interpret the Map"
      className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
    >
      <div className="border-b border-slate-100 pb-3">
        <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
          Step 4 — Interpret the Map
        </h2>
        <p className="mt-0.5 text-xs text-slate-600">
          Geometric breakdown calculated strictly from your plotted scores for{' '}
          <strong className="text-slate-900">{axes.xName.trim()}</strong> and{' '}
          <strong className="text-slate-900">{axes.yName.trim()}</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 1. Closest Alternative to SpiceBridge */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-1.5">
          <p className="text-xs font-bold text-slate-900">
            Closest alternative to SpiceBridge
          </p>
          {analysis.closestAlternatives.length > 0 ? (
            <div className="space-y-1 text-xs text-slate-700">
              {analysis.closestAlternatives.map((item) => (
                <p key={item.name}>
                  <strong className="text-slate-900">{item.name}</strong> ({item.type}) —
                  position{' '}
                  <span className="font-mono tabular-nums">
                    ({item.x}, {item.y})
                  </span>
                  , distance{' '}
                  <span className="font-mono font-semibold tabular-nums">
                    {item.distance.toFixed(2)}
                  </span>{' '}
                  units
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Score both SpiceBridge and at least one alternative to measure nearest
              distance.
            </p>
          )}
        </div>

        {/* 2. Competitors Appearing Clustered Together */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-1.5">
          <p className="text-xs font-bold text-slate-900">
            Competitors that appear clustered together
          </p>
          {scoredAlternatives.length < 2 ? (
            <p className="text-xs text-slate-500">
              Score at least two alternatives to check for clustering.
            </p>
          ) : analysis.clusters.length > 0 ? (
            <ul className="space-y-1 text-xs text-slate-700">
              {analysis.clusters.map((cluster, idx) => (
                <li key={`${cluster.names.join('-')}-${idx}`}>
                  <strong className="text-slate-900">{cluster.names.join(' + ')}</strong>{' '}
                  cluster near{' '}
                  <span className="font-mono tabular-nums">
                    ({cluster.centerX}, {cluster.centerY})
                  </span>{' '}
                  in the {cluster.quadrantTitle}.
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-600">
              No tight alternative clusters detected (scored alternatives are separated by
              more than 2.2 scale units).
            </p>
          )}
        </div>

        {/* 3. Differentiation Assessment */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-900">
              Does SpiceBridge appear differentiated?
            </p>
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                analysis.differentiation.status === 'Differentiated'
                  ? 'border border-emerald-200 bg-emerald-50 text-forest-800'
                  : analysis.differentiation.status === 'Moderately differentiated'
                    ? 'border border-amber-200 bg-amber-50 text-amber-800'
                    : analysis.differentiation.status === 'Closely positioned'
                      ? 'border border-red-200 bg-red-50 text-red-700'
                      : 'bg-slate-200 text-slate-600'
              }`}
            >
              {analysis.differentiation.status}
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            {analysis.differentiation.detail}
          </p>
        </div>

        {/* 4. Less-Crowded Areas of the Map */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-1.5">
          <p className="text-xs font-bold text-slate-900">
            Apparently less-crowded area{analysis.lessCrowdedQuadrants.length > 1 ? 's' : ''}{' '}
            of the map
          </p>
          <ul className="space-y-1 text-xs text-slate-700">
            {analysis.lessCrowdedQuadrants.map((quad) => (
              <li key={quad.key}>
                <strong className="text-slate-900">{quad.title}</strong> ({quad.descriptor}
                ) —{' '}
                <span className="font-mono tabular-nums">
                  {quad.totalCount} plotted {quad.totalCount === 1 ? 'point' : 'points'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Mandatory Validation Warning */}
      <div
        role="note"
        className="flex items-start gap-3 rounded-lg border border-amber-200 bg-turmeric-50 px-4 py-3 text-xs text-amber-950"
      >
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
          aria-hidden="true"
        />
        <p className="font-semibold leading-relaxed">
          “An empty position may represent an opportunity, or it may indicate weak
          customer demand. Validate before making a strategic decision.”
        </p>
      </div>
    </section>
  );
}
