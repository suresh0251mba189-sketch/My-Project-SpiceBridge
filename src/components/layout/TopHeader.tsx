import {
  Cloud,
  CloudOff,
  HardDrive,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sprout,
  Trash2,
} from 'lucide-react';
import { OPERATIONAL_STAGES } from '../../data/seedLots';
import { OperatorSession, StageId, SyncStatus } from '../../types/spicebridge';

interface TopHeaderProps {
  operatorSession: OperatorSession;
  syncStatus: SyncStatus;
  syncStatusLabel: string;
  activeStageId: StageId;
  onSelectStage: (stageId: StageId) => void;
  onOpenDatabaseSettings: () => void;
  onRestartFromStartPage: () => void;
  onRequestResetDemoData: () => void;
  onOpenLogModal: () => void;
}

const OPERATIONAL_LOCK_TOOLTIPS: Record<string, string> = {
  'stage-2-cleaning':
    'Locked: Complete Stage 1 Farm-Gate Assaying & Intake first — 3 MT Micro-Hub Cleaning & Batching opens in the next operational rollout.',
  'stage-3-passport':
    'Locked: Complete Stage 2 Micro-Hub Cleaning & Batching before generating origin Traceability QR & Digital Passports.',
  'stage-4-settlement':
    'Locked: Complete Stage 3 Traceability Passports before assigning batches to B2B Mill Orders & 14-day settlement.',
};

export function TopHeader({
  operatorSession,
  syncStatus,
  syncStatusLabel,
  activeStageId,
  onSelectStage,
  onOpenDatabaseSettings,
  onRestartFromStartPage,
  onRequestResetDemoData,
  onOpenLogModal,
}: TopHeaderProps) {
  const dbBadgeStyles =
    syncStatus === 'connected' || syncStatus === 'saved'
      ? 'border-emerald-200 bg-emerald-50/80 text-forest-800 hover:bg-emerald-100/70'
      : syncStatus === 'queued_offline' || syncStatus === 'error'
        ? 'border-amber-200 bg-turmeric-50 text-amber-900 hover:bg-amber-100/70'
        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100';

  const handleStageSelect = (stageId: StageId) => {
    onSelectStage(stageId);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-[1360px] px-4 py-3.5 sm:px-6 lg:px-8 space-y-3">
        {/* Single Main SpiceBridge Header Row */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-5">
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
              <p className="mt-0.5 text-xs text-slate-600 max-w-xl leading-relaxed sm:text-sm">
                Eliminate mandi middlemen through transparent farm-gate quality grading, fair
                spot pricing, and direct-to-processor traceability.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end shrink-0">
            {/* Top-right Utility Row: DB Status, Operator Session, Primary CTA */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenDatabaseSettings}
                aria-label={`Database connection status: ${syncStatusLabel}. Click to open Database Settings.`}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${dbBadgeStyles}`}
              >
                {syncStatus === 'syncing' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden="true" />
                ) : syncStatus === 'connected' || syncStatus === 'saved' ? (
                  <Cloud className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : syncStatus === 'queued_offline' || syncStatus === 'error' ? (
                  <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <HardDrive className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>{syncStatusLabel}</span>
              </button>

              <div
                aria-label="Verified Operator Session"
                className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-forest-50/80 px-2.5 py-1"
              >
                <ShieldCheck
                  className="h-3.5 w-3.5 shrink-0 text-forest-700"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs leading-tight">
                    <span className="font-semibold text-slate-900 truncate max-w-[110px]">
                      {operatorSession.name}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-semibold text-forest-800 whitespace-nowrap">
                      MFA Verified
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 truncate max-w-[175px]">
                    {operatorSession.email} · {operatorSession.role}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenLogModal}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-forest-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 whitespace-nowrap shrink-0 cursor-pointer sm:text-sm"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Log New Farm-Gate Assay</span>
              </button>
            </div>

            {/* Compact Demo Controls Bar */}
            <div
              role="region"
              aria-label="Demo Controls"
              className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/90 px-2.5 py-1"
            >
              <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                Demo Controls
              </span>
              <button
                type="button"
                onClick={onRestartFromStartPage}
                title="Sign out to the MFA login screen without deleting your saved lots"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3 text-slate-600" aria-hidden="true" />
                <span>Restart From Start Page</span>
              </button>
              <button
                type="button"
                onClick={onRequestResetDemoData}
                title="Clear localStorage and restore the original 8 sample farmer lots"
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-turmeric-50 px-2.5 py-1 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-100/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trash2 className="h-3 w-3 text-amber-700" aria-hidden="true" />
                <span>Reset All Demo Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Four Operational Stages Shown Once at Top */}
        <nav
          aria-label="Operational supply chain stages"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
        >
          {OPERATIONAL_STAGES.map((stage, index) => {
            if (stage.active) {
              const isSelected = activeStageId === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => handleStageSelect(stage.id)}
                  aria-current={isSelected ? 'step' : undefined}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-forest-600/50 bg-forest-50 ring-1 ring-forest-600/20'
                      : 'border-forest-600/30 bg-forest-50/70 hover:bg-forest-50'
                  }`}
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
                </button>
              );
            }

            const tooltipText =
              OPERATIONAL_LOCK_TOOLTIPS[stage.id] ??
              'Complete the prior operational stage to unlock.';
            const tooltipAlignClass =
              index === OPERATIONAL_STAGES.length - 1 ? 'right-0' : 'left-0';

            return (
              <div key={stage.id} className="group relative">
                <div
                  tabIndex={0}
                  aria-disabled="true"
                  title={tooltipText}
                  aria-describedby={`tooltip-${stage.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 cursor-not-allowed"
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

                {/* Subtle Tooltip on Hover / Focus */}
                <div
                  id={`tooltip-${stage.id}`}
                  role="tooltip"
                  className={`pointer-events-none absolute top-full ${tooltipAlignClass} z-40 mt-1.5 w-64 rounded-lg border border-slate-700/80 bg-slate-900 px-3 py-2 text-[11px] leading-snug text-slate-100 shadow-lg opacity-0 translate-y-0.5 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0`}
                >
                  {tooltipText}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

