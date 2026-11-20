import { CheckCircle2, HelpCircle } from 'lucide-react';
import { PositioningAxes } from '../../types/spicebridge';
import { arePositioningAxesDefined } from '../../utils/formatters';

interface AxesDefinitionStepProps {
  axes: PositioningAxes;
  onChangeAxes: (patch: Partial<PositioningAxes>) => void;
}

const EXAMPLE_DIMENSIONS = [
  {
    name: 'Price / Cost Spread',
    low: 'Low Margin / Tight Spread',
    high: 'High Margin / High Markup',
  },
  {
    name: 'Quality & Traceability Assurance',
    low: 'Unverified / Spot Grade',
    high: 'Lab-Assayed / Batch Traceable',
  },
  {
    name: 'Payout & Settlement Speed',
    low: 'Delayed / Credit-Heavy',
    high: 'Fast / Transparent Settlement',
  },
  {
    name: 'Sourcing Reach',
    low: 'Local / Single Mandi',
    high: 'Multi-Cluster / Direct-to-Mill',
  },
];

export function AxesDefinitionStep({
  axes,
  onChangeAxes,
}: AxesDefinitionStepProps) {
  const isComplete = arePositioningAxesDefined(axes);

  return (
    <section
      aria-label="Step 1: Choose the Positioning Axes"
      className="rounded-xl border border-slate-200 bg-white p-5 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
            Step 1 — Choose the Positioning Axes
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Define the two dimensions that matter most to your target customers and
            spice-supply stakeholders before assigning any scores.
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
            isComplete
              ? 'border border-emerald-200 bg-emerald-50 text-forest-800'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {isComplete && (
            <CheckCircle2 className="h-3.5 w-3.5 text-forest-700" aria-hidden="true" />
          )}
          <span>{isComplete ? 'Both axes defined' : 'Define both axes to continue'}</span>
        </span>
      </div>

      {/* Reminder Callout */}
      <div className="rounded-lg border border-amber-200 bg-turmeric-50 px-4 py-3 text-xs text-amber-950">
        <p className="font-semibold">
          “Good positioning axes should matter to customers and meaningfully differentiate
          alternatives.”
        </p>
      </div>

      {/* Reference Examples & SpiceBridge Illustration (Read-Only) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <HelpCircle className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>Example Positioning Dimensions (Reference Only)</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-600">
            {EXAMPLE_DIMENSIONS.map((item) => (
              <li key={item.name}>
                <strong className="text-slate-800">{item.name}:</strong> {item.low}{' '}
                <span aria-hidden="true">→</span> {item.high}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-2">
          <p className="text-xs font-bold text-slate-800">
            SpiceBridge Illustration Only (Not Pre-Selected)
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs text-slate-600">
            <div className="space-y-1">
              <p className="font-semibold text-forest-800">
                X-axis = Quality &amp; Traceability Assurance
              </p>
              <p>1 = Unassayed / No Lot Traceability</p>
              <p>5 = Basic Visual / Informal Check</p>
              <p>10 = Moisture-Tested, Purity-Graded &amp; Batch-Traceable</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-forest-800">
                Y-axis = Payout &amp; Settlement Transparency
              </p>
              <p>1 = Slow / Opaque Deductions &amp; Delays</p>
              <p>5 = Moderate / Partial Clarity</p>
              <p>10 = Clear Pricing &amp; Fast Structured Settlement</p>
            </div>
          </div>
        </div>
      </div>

      {/* User Axis Definition Form */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Horizontal Axis (X-axis) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-display text-sm font-bold text-slate-900">
              Horizontal Axis (X-Axis)
            </h3>
            <p className="text-[11px] text-slate-500">
              Choose the first customer-relevant dimension and its 1 vs. 10 endpoints.
            </p>
          </div>

          <div>
            <label
              htmlFor="axis-x-name"
              className="block text-xs font-semibold text-slate-700"
            >
              X-axis dimension name
            </label>
            <input
              id="axis-x-name"
              type="text"
              value={axes.xName}
              onChange={(e) => onChangeAxes({ xName: e.target.value })}
              placeholder="Enter horizontal dimension name"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="axis-x-left"
                className="block text-xs font-semibold text-slate-700"
              >
                Left-side label (Score 1)
              </label>
              <input
                id="axis-x-left"
                type="text"
                value={axes.xLeftLabel}
                onChange={(e) => onChangeAxes({ xLeftLabel: e.target.value })}
                placeholder="Low / left endpoint label"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="axis-x-right"
                className="block text-xs font-semibold text-slate-700"
              >
                Right-side label (Score 10)
              </label>
              <input
                id="axis-x-right"
                type="text"
                value={axes.xRightLabel}
                onChange={(e) => onChangeAxes({ xRightLabel: e.target.value })}
                placeholder="High / right endpoint label"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Vertical Axis (Y-axis) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-display text-sm font-bold text-slate-900">
              Vertical Axis (Y-Axis)
            </h3>
            <p className="text-[11px] text-slate-500">
              Choose the second customer-relevant dimension and its 1 vs. 10 endpoints.
            </p>
          </div>

          <div>
            <label
              htmlFor="axis-y-name"
              className="block text-xs font-semibold text-slate-700"
            >
              Y-axis dimension name
            </label>
            <input
              id="axis-y-name"
              type="text"
              value={axes.yName}
              onChange={(e) => onChangeAxes({ yName: e.target.value })}
              placeholder="Enter vertical dimension name"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="axis-y-bottom"
                className="block text-xs font-semibold text-slate-700"
              >
                Bottom label (Score 1)
              </label>
              <input
                id="axis-y-bottom"
                type="text"
                value={axes.yBottomLabel}
                onChange={(e) => onChangeAxes({ yBottomLabel: e.target.value })}
                placeholder="Low / bottom endpoint label"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="axis-y-top"
                className="block text-xs font-semibold text-slate-700"
              >
                Top label (Score 10)
              </label>
              <input
                id="axis-y-top"
                type="text"
                value={axes.yTopLabel}
                onChange={(e) => onChangeAxes({ yTopLabel: e.target.value })}
                placeholder="High / top endpoint label"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
