import { Lock, LogOut, Plus, RotateCcw, ShieldCheck, Sprout } from 'lucide-react';
import { OPERATIONAL_STAGES } from '../../data/seedLots';
import { OperatorSession } from '../../types/spicebridge';

interface TopHeaderProps {
  operatorSession: OperatorSession;
  onSignOut: () => void;
  onRequestRestart: () => void;
  onOpenLogModal: () => void;
}

export function TopHeader({
  operatorSession,
  onSignOut,
  onRequestRestart,
  onOpenLogModal,
}: TopHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-[1360px] px-4 py-3.5 sm:px-6 lg:px-8 space-y-3">
        {/* Single Main SpiceBridge Header Row */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-700 text-amber-300 shadow-xs">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 16c4-6 12-6 16 0" />
                <path d="M12 11V4" />
                <path d="M12 4c2.5 0 4.5 1.5 5 4-2.5.5-4.5-1-5-4Z" />
                <path d="M12 7c-2.5 0-4.5 1.5-5 4 2.5.5 4.5-1 5-4Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
                  SpiceBridge
                </h1>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                  Gujarat &amp; Rajasthan Spice Supply Chain
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600 max-w-2xl leading-relaxed sm:text-sm">
                Eliminate mandi middlemen through transparent farm-gate quality grading, fair
                spot pricing, and direct-to-processor traceability.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Verified Operator Session Indicator */}
            <div
              aria-label="Verified Operator Session"
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-forest-50/80 px-2.5 py-1.5"
            >
              <ShieldCheck
                className="h-4 w-4 shrink-0 text-forest-700"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs leading-tight">
                  <span className="font-semibold text-slate-900 truncate max-w-[130px]">
                    {operatorSession.name}
                  </span>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-semibold text-forest-800 whitespace-nowrap">
                    MFA Verified
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 truncate max-w-[195px]">
                  {operatorSession.email} · {operatorSession.role}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onRequestRestart}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
              <span>Start Over</span>
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
              <span>Lock / Sign Out</span>
            </button>

            <button
              type="button"
              onClick={onOpenLogModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-forest-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 whitespace-nowrap shrink-0 cursor-pointer sm:text-sm"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Log New Farm-Gate Assay</span>
            </button>
          </div>
        </div>

        {/* Four Operational Stages Shown Once at Top */}
        <nav
          aria-label="Operational supply chain stages"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
        >
          {OPERATIONAL_STAGES.map((stage) => {
            if (stage.active) {
              return (
                <div
                  key={stage.id}
                  aria-current="step"
                  className="flex items-center justify-between gap-2 rounded-lg border border-forest-600/30 bg-forest-50/90 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-forest-700 text-white">
                      <Sprout className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        {stage.stepNumber}. {stage.title}
                      </p>
                    </div>
                  </div>
                  <span className="rounded bg-forest-700 px-2 py-0.5 text-[11px] font-semibold text-white whitespace-nowrap shrink-0">
                    Active
                  </span>
                </div>
              );
            }

            return (
              <div
                key={stage.id}
                aria-disabled="true"
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 opacity-80"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-200/80 text-slate-500">
                    <Lock className="h-3 w-3" aria-hidden="true" />
                  </div>
                  <p className="truncate text-xs font-medium text-slate-600">
                    {stage.stepNumber}. {stage.title}
                  </p>
                </div>
                <span className="rounded bg-amber-100/90 px-2 py-0.5 text-[11px] font-semibold text-amber-800 whitespace-nowrap shrink-0">
                  Coming Next
                </span>
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
