import { ArrowRight, CheckCircle2, Lock } from 'lucide-react';

interface ProgressionRoadmapSectionProps {
  completedCount: number;
  battlefieldUnlocked: boolean;
  positioningStatementUnlocked?: boolean;
  aiChallengeUnlocked?: boolean;
  warRoomUnlocked?: boolean;
  inBattlefieldView?: boolean;
  inPositioningView?: boolean;
  inAIChallengeView?: boolean;
  onOpenBattlefieldMap?: () => void;
  onOpenPositioningStatement?: () => void;
  onOpenAIChallenge?: () => void;
}

export function ProgressionRoadmapSection({
  completedCount,
  battlefieldUnlocked,
  positioningStatementUnlocked = false,
  aiChallengeUnlocked = false,
  warRoomUnlocked = false,
  inBattlefieldView = false,
  inPositioningView = false,
  inAIChallengeView = false,
  onOpenBattlefieldMap,
  onOpenPositioningStatement,
  onOpenAIChallenge,
}: ProgressionRoadmapSectionProps) {
  return (
    <section
      aria-label="Strategy Lab Progression Gates"
      className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            Next Strategy Stages
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {inAIChallengeView
              ? 'Complete all 3 challenge questions and the Final Strategy Review to unlock the Competition War Room.'
              : inPositioningView
                ? 'Save a complete positioning statement above to unlock the AI Strategy Challenge.'
                : inBattlefieldView
                  ? 'Complete both axes and assign scores for SpiceBridge and all completed alternatives to unlock Positioning Statement.'
                  : 'Complete at least 3 alternatives with all required fields and evidence to unlock the Market Battlefield Map.'}
          </p>
        </div>
        <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
          {Math.min(3, completedCount)} / 3 completed alternatives
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Gate 1: Market Battlefield Map */}
        <div
          className={`flex flex-col justify-between gap-3 rounded-xl border p-4 ${
            battlefieldUnlocked
              ? 'border-emerald-200 bg-emerald-50/70'
              : 'border-slate-200 bg-slate-50/80 opacity-85'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                  battlefieldUnlocked
                    ? 'bg-forest-700 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {battlefieldUnlocked ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Market Battlefield Map
                </p>
                <p
                  className={`mt-0.5 text-xs ${
                    battlefieldUnlocked ? 'text-forest-800 font-medium' : 'text-slate-500'
                  }`}
                >
                  {battlefieldUnlocked
                    ? inBattlefieldView
                      ? 'Active — build and interpret your 2×2 map above'
                      : 'Unlocked (3+ completed alternatives verified)'
                    : 'Complete competitor research first'}
                </p>
              </div>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                battlefieldUnlocked
                  ? 'bg-forest-700 text-white'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {battlefieldUnlocked ? (inBattlefieldView ? 'Active' : 'Unlocked') : 'Locked'}
            </span>
          </div>

          {battlefieldUnlocked && !inBattlefieldView && onOpenBattlefieldMap && (
            <button
              type="button"
              onClick={onOpenBattlefieldMap}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-forest-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-forest-800 cursor-pointer"
            >
              <span>Open Market Battlefield Map</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Gate 2: Positioning Statement */}
        <div
          className={`flex flex-col justify-between gap-3 rounded-xl border p-4 ${
            positioningStatementUnlocked
              ? 'border-emerald-200 bg-emerald-50/70'
              : 'border-slate-200 bg-slate-50/80 opacity-80'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                  positioningStatementUnlocked
                    ? 'bg-forest-700 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {positioningStatementUnlocked ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Positioning Statement
                </p>
                <p
                  className={`mt-0.5 text-xs ${
                    positioningStatementUnlocked
                      ? 'text-forest-800 font-medium'
                      : 'text-slate-500'
                  }`}
                >
                  {positioningStatementUnlocked
                    ? inPositioningView
                      ? 'Active — build, evaluate, and save your statement above'
                      : 'Unlocked (2×2 map complete)'
                    : 'Complete positioning map first'}
                </p>
              </div>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                positioningStatementUnlocked
                  ? 'bg-forest-700 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {positioningStatementUnlocked
                ? inPositioningView
                  ? 'Active'
                  : 'Unlocked'
                : 'Locked'}
            </span>
          </div>

          {positioningStatementUnlocked &&
            !inPositioningView &&
            onOpenPositioningStatement && (
              <button
                type="button"
                onClick={onOpenPositioningStatement}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-forest-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-forest-800 cursor-pointer"
              >
                <span>Open Positioning Statement</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
        </div>

        {/* Gate 3: AI Strategy Challenge */}
        <div
          className={`flex flex-col justify-between gap-3 rounded-xl border p-4 ${
            aiChallengeUnlocked
              ? 'border-emerald-200 bg-emerald-50/70'
              : 'border-slate-200 bg-slate-50/80 opacity-80'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                  aiChallengeUnlocked
                    ? 'bg-forest-700 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {aiChallengeUnlocked ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  AI Strategy Challenge
                </p>
                <p
                  className={`mt-0.5 text-xs ${
                    aiChallengeUnlocked ? 'text-forest-800 font-medium' : 'text-slate-500'
                  }`}
                >
                  {aiChallengeUnlocked
                    ? inAIChallengeView
                      ? 'Active — defend your competitive position above'
                      : 'Unlocked (Positioning statement saved)'
                    : 'Complete positioning statement first'}
                </p>
              </div>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                aiChallengeUnlocked
                  ? 'bg-forest-700 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {aiChallengeUnlocked
                ? inAIChallengeView
                  ? 'Active'
                  : 'Unlocked'
                : 'Locked'}
            </span>
          </div>

          {aiChallengeUnlocked && !inAIChallengeView && onOpenAIChallenge && (
            <button
              type="button"
              onClick={onOpenAIChallenge}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-forest-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-forest-800 cursor-pointer"
            >
              <span>Open AI Strategy Challenge</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Gate 4: Competition War Room */}
        <div
          className={`flex items-start justify-between gap-3 rounded-xl border p-4 ${
            warRoomUnlocked
              ? 'border-emerald-200 bg-emerald-50/70'
              : 'border-slate-200 bg-slate-50/80 opacity-80'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                warRoomUnlocked
                  ? 'bg-forest-700 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {warRoomUnlocked ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Competition War Room
              </p>
              <p
                className={`mt-0.5 text-xs ${
                  warRoomUnlocked ? 'text-forest-800 font-medium' : 'text-slate-500'
                }`}
              >
                {warRoomUnlocked
                  ? 'Unlocked (AI Strategy Challenge complete — ready for next phase)'
                  : 'Complete AI Strategy Challenge first'}
              </p>
            </div>
          </div>
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap shrink-0 ${
              warRoomUnlocked
                ? 'bg-forest-700 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {warRoomUnlocked ? 'Unlocked' : 'Locked'}
          </span>
        </div>
      </div>
    </section>
  );
}

