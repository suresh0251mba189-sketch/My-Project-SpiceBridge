import { Lock, ShieldCheck, Sparkles, Sprout, Truck, X } from 'lucide-react';
import { OPERATIONAL_STAGES } from '../../data/seedLots';
import { StageId } from '../../types/spicebridge';

interface SidebarNavProps {
  activeStageId: StageId;
  onSelectStage: (stageId: StageId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onResetSampleBank: () => void;
  totalLotsCount: number;
  totalBatchesCount: number;
  totalMillOrdersCount: number;
}

const STAGE_ICONS: Record<StageId, typeof Sprout> = {
  'stage-1-assay': Sprout,
  'stage-2-cleaning': Sparkles,
  'stage-3-passport': ShieldCheck,
  'stage-4-settlement': Truck,
};

export function SidebarNav({
  activeStageId,
  onSelectStage,
  mobileOpen,
  onCloseMobile,
  onResetSampleBank,
  totalLotsCount,
  totalBatchesCount,
  totalMillOrdersCount,
}: SidebarNavProps) {
  const handleStageClick = (stageId: StageId, active: boolean) => {
    if (!active) return;
    onSelectStage(stageId);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200">
      <div>
        {/* Brand Block */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-700 text-amber-300 shadow-xs">
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
            <div>
              <span className="block font-display text-lg font-bold tracking-tight text-slate-900">
                SpiceBridge
              </span>
              <span className="block text-xs text-slate-500">
                Gujarat &amp; Rajasthan Belt
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Operational Pipeline Stages */}
        <div className="px-4 py-5">
          <p className="px-2 pb-3 text-xs font-semibold text-slate-500">
            Supply Chain Stages
          </p>
          <nav aria-label="Operational stages" className="space-y-2">
            {OPERATIONAL_STAGES.map((stage) => {
              const Icon = STAGE_ICONS[stage.id];
              const isSelected = stage.id === activeStageId;

              if (stage.active) {
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => handleStageClick(stage.id, stage.active)}
                    aria-current={isSelected ? 'step' : undefined}
                    className={`w-full rounded-xl border p-3.5 text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 ${
                      isSelected
                        ? 'border-forest-600/30 bg-forest-50/85'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                          isSelected
                            ? 'bg-forest-700 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-mono text-xs font-semibold tabular-nums ${
                              isSelected ? 'text-forest-700' : 'text-slate-500'
                            }`}
                          >
                            Stage 0{stage.stepNumber}
                          </span>
                          <span
                            className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                              isSelected ? 'text-forest-700' : 'text-emerald-700'
                            }`}
                          >
                            {isSelected ? 'Active' : 'Open'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900 leading-snug">
                          {stage.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              }

              return (
                <button
                  key={stage.id}
                  type="button"
                  disabled
                  aria-disabled="true"
                  title={`${stage.title} — Coming Next`}
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-left opacity-75"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-200/80 text-slate-500">
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-medium text-slate-500 tabular-nums">
                          Stage 0{stage.stepNumber}
                        </span>
                        <span className="rounded-md bg-amber-100/80 px-2 py-0.5 text-[11px] font-semibold text-amber-800 whitespace-nowrap shrink-0">
                          Coming Next
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm font-medium text-slate-600 leading-snug">
                        {stage.title}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sourcing Belt Footer Context */}
      <div className="border-t border-slate-200 p-4 space-y-3">
        <div className="text-xs text-slate-500 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">Assayed Lots</span>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {totalLotsCount} lots
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">3 MT Batches</span>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {totalBatchesCount} batches
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">Mill Orders</span>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {totalMillOrdersCount} orders
            </span>
          </div>
          <p className="pt-1 text-slate-500 leading-relaxed">
            Clusters: Unjha · Visnagar · Patan · Palanpur · Sirohi · Abu Road
          </p>
        </div>

        <button
          type="button"
          onClick={onResetSampleBank}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 cursor-pointer"
        >
          Restore Default Sample Data
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block lg:w-72 lg:shrink-0">
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {/* Mobile Slide-Over Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full shadow-xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
