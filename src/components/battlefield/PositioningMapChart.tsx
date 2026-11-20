import { Lock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PositioningAxes } from '../../types/spicebridge';
import { PlottedAlternativePoint } from '../../utils/formatters';

interface PositioningMapChartProps {
  axes: PositioningAxes;
  axesDefined: boolean;
  spiceBridgePoint: { x: number; y: number } | null;
  scoredAlternatives: PlottedAlternativePoint[];
  unscoredNames: string[];
}

interface ChartPoint {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  isSpiceBridge: boolean;
  svgX: number;
  svgY: number;
  labelDy: number;
}

const SVG_WIDTH = 760;
const SVG_HEIGHT = 500;
const PAD_LEFT = 92;
const PAD_RIGHT = 48;
const PAD_TOP = 54;
const PAD_BOTTOM = 76;
const PLOT_W = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;

function toSvgX(scoreX: number): number {
  return PAD_LEFT + ((scoreX - 1) / 9) * PLOT_W;
}

function toSvgY(scoreY: number): number {
  return PAD_TOP + PLOT_H - ((scoreY - 1) / 9) * PLOT_H;
}

function getAlternativeColor(type: string): {
  fill: string;
  stroke: string;
} {
  switch (type) {
    case 'Direct Competitor':
      return { fill: '#b45309', stroke: '#78350f' };
    case 'Indirect Competitor':
      return { fill: '#0369a1', stroke: '#0c4a6e' };
    case 'Substitute':
      return { fill: '#6d28d9', stroke: '#4c1d95' };
    case 'Do Nothing':
      return { fill: '#475569', stroke: '#1e293b' };
    default:
      return { fill: '#334155', stroke: '#0f172a' };
  }
}

export function PositioningMapChart({
  axes,
  axesDefined,
  spiceBridgePoint,
  scoredAlternatives,
  unscoredNames,
}: PositioningMapChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const chartPoints = useMemo<ChartPoint[]>(() => {
    const raw: Array<{
      id: string;
      name: string;
      type: string;
      x: number;
      y: number;
      isSpiceBridge: boolean;
    }> = [];

    for (const alt of scoredAlternatives) {
      raw.push({
        id: alt.id,
        name: alt.name,
        type: alt.type,
        x: alt.x,
        y: alt.y,
        isSpiceBridge: false,
      });
    }

    if (spiceBridgePoint) {
      raw.push({
        id: 'spicebridge-venture',
        name: 'SpiceBridge',
        type: 'Your Venture',
        x: spiceBridgePoint.x,
        y: spiceBridgePoint.y,
        isSpiceBridge: true,
      });
    }

    // Group exact or near-identical coordinates so stacked labels stay readable
    const coordSeenCount = new Map<string, number>();

    return raw.map((item) => {
      const coordKey = `${item.x}-${item.y}`;
      const seenIndex = coordSeenCount.get(coordKey) ?? 0;
      coordSeenCount.set(coordKey, seenIndex + 1);

      const svgX = toSvgX(item.x);
      const svgY = toSvgY(item.y);
      const defaultDy = item.y >= 9 ? 22 : item.isSpiceBridge ? -18 : -14;
      const labelDy =
        seenIndex === 0 ? defaultDy : defaultDy + seenIndex * (item.y >= 9 ? 15 : -15);

      return {
        ...item,
        svgX,
        svgY,
        labelDy,
      };
    });
  }, [scoredAlternatives, spiceBridgePoint]);

  const hoveredPoint = useMemo(
    () => chartPoints.find((pt) => pt.id === hoveredId) ?? null,
    [chartPoints, hoveredId],
  );

  if (!axesDefined) {
    return (
      <section
        aria-label="Step 3: Interactive 2x2 Positioning Map"
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Step 3 — 2×2 Positioning Map
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Your interactive 2×2 map will render once both positioning axes are defined
              in Step 1 and scores are assigned in Step 2.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const xName = axes.xName.trim();
  const yName = axes.yName.trim();
  const xLeft = axes.xLeftLabel.trim();
  const xRight = axes.xRightLabel.trim();
  const yBottom = axes.yBottomLabel.trim();
  const yTop = axes.yTopLabel.trim();

  const midSvgX = toSvgX(5.5);
  const midSvgY = toSvgY(5.5);
  const ticks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <section
      aria-label="Step 3: Interactive 2x2 Positioning Map"
      className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
            Step 3 — 2×2 Positioning Map
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Comparing <strong className="text-slate-900">{xName}</strong> (horizontal) vs.{' '}
            <strong className="text-slate-900">{yName}</strong> (vertical). Hover or focus
            any marker for full details.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1.5 font-semibold text-forest-800">
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border-2 border-amber-400 bg-forest-700"
              aria-hidden="true"
            />
            SpiceBridge
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full bg-amber-700"
              aria-hidden="true"
            />
            Direct Competitor
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full bg-sky-700"
              aria-hidden="true"
            />
            Indirect
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full bg-violet-700"
              aria-hidden="true"
            />
            Substitute
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full bg-slate-600"
              aria-hidden="true"
            />
            Do Nothing
          </span>
        </div>
      </div>

      {unscoredNames.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-turmeric-50 px-3.5 py-2 text-xs text-amber-900">
          Waiting for both {xName} and {yName} scores:{' '}
          <strong className="font-semibold">{unscoredNames.join(', ')}</strong>
        </div>
      )}

      <div className="relative rounded-xl border border-slate-200 bg-slate-50/40 p-2 sm:p-4">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto max-h-[540px] select-none"
          role="img"
          aria-label={`2x2 positioning map comparing ${xName} and ${yName}`}
        >
          {/* Plot Background */}
          <rect
            x={PAD_LEFT}
            y={PAD_TOP}
            width={PLOT_W}
            height={PLOT_H}
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth={1.25}
          />

          {/* Subtle Top-Right Highlight Tint */}
          <rect
            x={midSvgX}
            y={PAD_TOP}
            width={PAD_LEFT + PLOT_W - midSvgX}
            height={midSvgY - PAD_TOP}
            fill="#f0fdf4"
            opacity={0.55}
          />

          {/* Grid Lines & Numeric Ticks (1..10) */}
          {ticks.map((tick) => {
            const gx = toSvgX(tick);
            const gy = toSvgY(tick);
            return (
              <g key={tick}>
                <line
                  x1={gx}
                  y1={PAD_TOP}
                  x2={gx}
                  y2={PAD_TOP + PLOT_H}
                  stroke="#f1f5f9"
                  strokeWidth={1}
                />
                <line
                  x1={PAD_LEFT}
                  y1={gy}
                  x2={PAD_LEFT + PLOT_W}
                  y2={gy}
                  stroke="#f1f5f9"
                  strokeWidth={1}
                />
                <text
                  x={gx}
                  y={PAD_TOP + PLOT_H + 16}
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {tick}
                </text>
                <text
                  x={PAD_LEFT - 10}
                  y={gy + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Clear Quadrant Dividing Lines (midpoint 5.5) */}
          <line
            x1={midSvgX}
            y1={PAD_TOP}
            x2={midSvgX}
            y2={PAD_TOP + PLOT_H}
            stroke="#64748b"
            strokeWidth={1.25}
            strokeDasharray="5 4"
          />
          <line
            x1={PAD_LEFT}
            y1={midSvgY}
            x2={PAD_LEFT + PLOT_W}
            y2={midSvgY}
            stroke="#64748b"
            strokeWidth={1.25}
            strokeDasharray="5 4"
          />

          {/* Quadrant Corner Descriptors */}
          <text
            x={PAD_LEFT + 10}
            y={PAD_TOP + 18}
            textAnchor="start"
            className="fill-slate-400 text-[10px] font-medium"
          >
            {xLeft} · {yTop}
          </text>
          <text
            x={PAD_LEFT + PLOT_W - 10}
            y={PAD_TOP + 18}
            textAnchor="end"
            className="fill-forest-700 text-[10px] font-semibold"
          >
            {xRight} · {yTop}
          </text>
          <text
            x={PAD_LEFT + 10}
            y={PAD_TOP + PLOT_H - 10}
            textAnchor="start"
            className="fill-slate-400 text-[10px] font-medium"
          >
            {xLeft} · {yBottom}
          </text>
          <text
            x={PAD_LEFT + PLOT_W - 10}
            y={PAD_TOP + PLOT_H - 10}
            textAnchor="end"
            className="fill-slate-400 text-[10px] font-medium"
          >
            {xRight} · {yBottom}
          </text>

          {/* Y-Axis Top & Bottom Anchors + Dimension Title */}
          <text
            x={PAD_LEFT + PLOT_W / 2}
            y={18}
            textAnchor="middle"
            className="fill-slate-900 text-[12px] font-bold"
          >
            {yName}: {yTop} (10)
          </text>
          <text
            x={PAD_LEFT + PLOT_W / 2}
            y={34}
            textAnchor="middle"
            className="fill-slate-500 text-[10px]"
          >
            ↑ Higher {yName}
          </text>

          <text
            x={20}
            y={PAD_TOP + PLOT_H / 2}
            textAnchor="middle"
            transform={`rotate(-90, 20, ${PAD_TOP + PLOT_H / 2})`}
            className="fill-slate-800 text-[11px] font-bold"
          >
            {yName}
          </text>
          <text
            x={PAD_LEFT - 12}
            y={PAD_TOP + PLOT_H + 14}
            textAnchor="end"
            className="fill-slate-500 text-[10px] font-medium"
          >
            {yBottom} (1)
          </text>

          {/* X-Axis Anchors & Dimension Title */}
          <text
            x={PAD_LEFT}
            y={PAD_TOP + PLOT_H + 34}
            textAnchor="start"
            className="fill-slate-600 text-[11px] font-medium"
          >
            ← {xLeft} (1)
          </text>
          <text
            x={PAD_LEFT + PLOT_W}
            y={PAD_TOP + PLOT_H + 34}
            textAnchor="end"
            className="fill-slate-600 text-[11px] font-medium"
          >
            {xRight} (10) →
          </text>
          <text
            x={PAD_LEFT + PLOT_W / 2}
            y={SVG_HEIGHT - 16}
            textAnchor="middle"
            className="fill-slate-900 text-[12px] font-bold"
          >
            {xName}
          </text>

          {/* Plotted Alternatives & SpiceBridge */}
          {chartPoints.map((pt) => {
            const isHovered = hoveredId === pt.id;
            const colors = getAlternativeColor(pt.type);

            if (pt.isSpiceBridge) {
              return (
                <g
                  key={pt.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`SpiceBridge: ${xName} ${pt.x}/10, ${yName} ${pt.y}/10`}
                  onMouseEnter={() => setHoveredId(pt.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(pt.id)}
                  onBlur={() => setHoveredId(null)}
                  onClick={() =>
                    setHoveredId((prev) => (prev === pt.id ? null : pt.id))
                  }
                  className="cursor-pointer focus:outline-none"
                >
                  <circle
                    cx={pt.svgX}
                    cy={pt.svgY}
                    r={isHovered ? 19 : 16}
                    fill="#fbbf24"
                    opacity={0.3}
                  />
                  <circle
                    cx={pt.svgX}
                    cy={pt.svgY}
                    r={isHovered ? 13 : 11}
                    fill="#14532d"
                    stroke="#f59e0b"
                    strokeWidth={3}
                  />
                  <text
                    x={pt.svgX}
                    y={pt.svgY + pt.labelDy}
                    textAnchor="middle"
                    className="fill-forest-900 text-[12px] font-bold"
                  >
                    SpiceBridge ({pt.x}, {pt.y})
                  </text>
                </g>
              );
            }

            return (
              <g
                key={pt.id}
                tabIndex={0}
                role="button"
                aria-label={`${pt.name}: ${pt.type}, ${xName} ${pt.x}/10, ${yName} ${pt.y}/10`}
                onMouseEnter={() => setHoveredId(pt.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(pt.id)}
                onBlur={() => setHoveredId(null)}
                onClick={() =>
                  setHoveredId((prev) => (prev === pt.id ? null : pt.id))
                }
                className="cursor-pointer focus:outline-none"
              >
                <circle
                  cx={pt.svgX}
                  cy={pt.svgY}
                  r={isHovered ? 13 : 10}
                  fill={colors.fill}
                  opacity={0.18}
                />
                <circle
                  cx={pt.svgX}
                  cy={pt.svgY}
                  r={isHovered ? 8.5 : 7}
                  fill={colors.fill}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
                <text
                  x={pt.svgX}
                  y={pt.svgY + pt.labelDy}
                  textAnchor="middle"
                  className="fill-slate-800 text-[11px] font-semibold"
                >
                  {pt.name} ({pt.x}, {pt.y})
                </text>
              </g>
            );
          })}
        </svg>

        {/* Interactive Hover / Focus Tooltip Card */}
        {hoveredPoint && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none mt-2 sm:mt-0 sm:absolute sm:right-6 sm:top-6 w-full sm:w-64 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md text-xs space-y-1.5 backdrop-blur-[2px]"
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
              <p className="font-display font-bold text-slate-900">
                {hoveredPoint.name}
              </p>
              <span
                className={`text-[11px] font-semibold whitespace-nowrap ${
                  hoveredPoint.isSpiceBridge ? 'text-forest-700' : 'text-slate-500'
                }`}
              >
                {hoveredPoint.type}
              </span>
            </div>
            <div className="space-y-1 font-mono tabular-nums">
              <p className="flex items-center justify-between gap-2 text-slate-700">
                <span className="font-sans text-slate-500 truncate">{xName}:</span>
                <strong className="text-slate-900 shrink-0">{hoveredPoint.x} / 10</strong>
              </p>
              <p className="flex items-center justify-between gap-2 text-slate-700">
                <span className="font-sans text-slate-500 truncate">{yName}:</span>
                <strong className="text-slate-900 shrink-0">{hoveredPoint.y} / 10</strong>
              </p>
            </div>
          </div>
        )}

        {chartPoints.length === 0 && (
          <p className="py-3 text-center text-xs text-slate-500">
            Assign both {xName} and {yName} scores in Step 2 to plot SpiceBridge and your
            alternatives on this map.
          </p>
        )}
      </div>
    </section>
  );
}
