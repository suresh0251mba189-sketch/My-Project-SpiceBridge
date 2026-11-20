import { RotateCcw } from 'lucide-react';

interface StatementPreviewStepProps {
  finalStatement: string;
  isManuallyEdited: boolean;
  onChangeManualStatement: (nextText: string) => void;
  onResetToTemplate: () => void;
}

export function StatementPreviewStep({
  finalStatement,
  isManuallyEdited,
  onChangeManualStatement,
  onResetToTemplate,
}: StatementPreviewStepProps) {
  return (
    <section
      aria-label="Step 2: Generated Positioning Statement"
      className="rounded-xl border border-forest-600/35 bg-forest-50/70 p-5 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-bold text-forest-900 sm:text-lg">
            Step 2 — Generated Positioning Statement
          </h2>
          <p className="text-xs text-forest-800/80 mt-0.5">
            Automatically updates whenever you change any component in Step 1. You can
            also refine the wording manually below.
          </p>
        </div>

        {isManuallyEdited && (
          <button
            type="button"
            onClick={onResetToTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-forest-600/30 bg-white px-3 py-1.5 text-xs font-semibold text-forest-800 hover:bg-emerald-50 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sync from 5 components</span>
          </button>
        )}
      </div>

      <div className="rounded-xl border border-forest-600/25 bg-white p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="ps-final-statement"
            className="text-[11px] font-bold tracking-wide text-forest-800"
          >
            POSITIONING STATEMENT (EDITABLE)
          </label>
          {isManuallyEdited && (
            <span className="text-[11px] font-medium text-amber-700">
              Manually edited
            </span>
          )}
        </div>

        <textarea
          id="ps-final-statement"
          rows={3}
          value={finalStatement}
          onChange={(e) => onChangeManualStatement(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 font-display text-sm font-semibold text-slate-900 leading-relaxed focus:border-forest-600 focus:bg-white focus:outline-none"
        />
      </div>
    </section>
  );
}
