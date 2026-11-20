import { ArrowLeftRight, ArrowRight, CheckCircle2, FileText, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  CompetitorAlternative,
  FarmerLot,
  PositioningMapState,
  PositioningStatementState,
} from '../../types/spicebridge';
import {
  computeCompetitionSummary,
  computePositioningProgress,
  evaluatePositioningStatement,
  formatDateShort,
  formatINR,
  formatNumberIN,
  isPositioningStatementComplete,
} from '../../utils/formatters';
import { ProgressionRoadmapSection } from '../competition/ProgressionRoadmapSection';
import { SwitchLotModal } from '../competition/SwitchLotModal';
import { StatementBuilderStep } from './StatementBuilderStep';
import { StatementEvaluationStep } from './StatementEvaluationStep';
import { StatementPreviewStep } from './StatementPreviewStep';

interface PositioningStatementWorkspaceProps {
  lots: FarmerLot[];
  selectedLot: FarmerLot | undefined;
  alternatives: CompetitorAlternative[];
  positioningState: PositioningMapState;
  statementState: PositioningStatementState;
  warRoomUnlocked: boolean;
  onBackToBattlefieldMap: () => void;
  onBackToCompetitionLab: () => void;
  onBackToLotBank: () => void;
  onOpenAIChallenge: () => void;
  onSwitchSelectedLot: (lotId: string) => void;
  onChangeComponents: (
    patch: Partial<
      Pick<
        PositioningStatementState,
        | 'targetCustomer'
        | 'category'
        | 'primaryBenefit'
        | 'mainAlternativeId'
        | 'reasonToBelieve'
      >
    >,
  ) => void;
  onChangeManualStatement: (nextText: string) => void;
  onResetStatementToTemplate: () => void;
  onSavePositioningStatement: () => void;
}

export function PositioningStatementWorkspace({
  lots,
  selectedLot,
  alternatives,
  positioningState,
  statementState,
  warRoomUnlocked,
  onBackToBattlefieldMap,
  onBackToCompetitionLab,
  onBackToLotBank,
  onOpenAIChallenge,
  onSwitchSelectedLot,
  onChangeComponents,
  onChangeManualStatement,
  onResetStatementToTemplate,
  onSavePositioningStatement,
}: PositioningStatementWorkspaceProps) {
  const [switchModalOpen, setSwitchModalOpen] = useState(false);

  const competitionSummary = useMemo(
    () => computeCompetitionSummary(alternatives),
    [alternatives],
  );

  const positioningProgress = useMemo(
    () => computePositioningProgress(positioningState, alternatives),
    [positioningState, alternatives],
  );

  const evaluation = useMemo(
    () =>
      evaluatePositioningStatement({
        statement: statementState,
        selectedLot,
        lots,
        alternatives,
        positioningState,
      }),
    [statementState, selectedLot, lots, alternatives, positioningState],
  );

  const isComplete = isPositioningStatementComplete(statementState, alternatives);
  const aiChallengeUnlocked = Boolean(statementState.savedAt) && isComplete;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Active Venture Context */}
      <section
        aria-label="Positioning Statement Navigation"
        className="rounded-xl border border-slate-200 bg-white px-5 py-4 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onBackToBattlefieldMap}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <span>← Back to Market Battlefield Map</span>
            </button>

            <button
              type="button"
              onClick={onBackToCompetitionLab}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <span>← Back to Competition Lab</span>
            </button>

            <button
              type="button"
              onClick={onBackToLotBank}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <span>← Back to Lot &amp; Venture Bank</span>
            </button>

            <button
              type="button"
              onClick={() => setSwitchModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-turmeric-50 px-3.5 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 cursor-pointer"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Switch Lot / Venture</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {aiChallengeUnlocked && (
              <button
                type="button"
                onClick={onOpenAIChallenge}
                className="inline-flex items-center gap-1.5 rounded-lg bg-forest-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-forest-800 cursor-pointer"
              >
                <span>Open AI Strategy Challenge</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <span className="font-display text-sm font-bold text-forest-700">
              Positioning Statement
            </span>
          </div>
        </div>

        {selectedLot && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-forest-600/20 bg-forest-50/70 px-4 py-3 text-xs">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-bold text-forest-800">ACTIVE LOT / VENTURE:</span>
              <span className="font-mono font-bold text-slate-900">
                {selectedLot.id}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="font-semibold text-slate-900">
                {selectedLot.cropLabel} — {selectedLot.variety}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-700">{selectedLot.farmerName}</span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-600">{selectedLot.clusterGeography}</span>
            </div>
            <span className="font-mono font-semibold text-slate-800 tabular-nums">
              {formatNumberIN(selectedLot.quantityKg)} kg ·{' '}
              {formatINR(selectedLot.offeredPricePerKg)}/kg
            </span>
          </div>
        )}
      </section>

      {/* Purpose & Structure Guide */}
      <section
        aria-label="Positioning Statement Purpose"
        className="rounded-xl border border-slate-200 bg-white px-5 py-4 space-y-3"
      >
        <div className="flex items-start gap-3">
          <FileText
            className="mt-0.5 h-4 w-4 shrink-0 text-forest-700"
            aria-hidden="true"
          />
          <div className="space-y-1.5">
            <h1 className="font-display text-sm font-bold text-slate-900">
              Positioning Statement Framework
            </h1>
            <p className="text-xs text-slate-700 leading-relaxed">
              “A positioning statement defines how the venture should be understood by its
              target customer relative to competing alternatives.”
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 font-mono leading-relaxed">
              For <strong>[Target Customer]</strong>, SpiceBridge is a{' '}
              <strong>[Category / Type of Solution]</strong> that provides{' '}
              <strong>[Primary Benefit]</strong>, unlike{' '}
              <strong>[Main Alternative]</strong>, because{' '}
              <strong>[Reason to Believe]</strong>.
            </div>
          </div>
        </div>
      </section>

      {/* Step 1 — Build the Statement */}
      <StatementBuilderStep
        statement={statementState}
        selectedLot={selectedLot}
        alternatives={alternatives}
        positioningState={positioningState}
        onChangeComponents={onChangeComponents}
      />

      {/* Step 2 — Generate & Manually Edit Positioning Statement */}
      <StatementPreviewStep
        finalStatement={statementState.finalStatement}
        isManuallyEdited={statementState.isManuallyEdited}
        onChangeManualStatement={onChangeManualStatement}
        onResetToTemplate={onResetStatementToTemplate}
      />

      {/* Step 3 — Check the Positioning */}
      <StatementEvaluationStep evaluation={evaluation} />

      {/* Step 4 — Revision & Save */}
      <section
        aria-label="Step 4: Revision and Save"
        className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="space-y-1">
          <h2 className="font-display text-base font-bold text-slate-900">
            Step 4 — Revision &amp; Save
          </h2>
          <p className="text-xs text-slate-600">
            Revise any of the five components above at any time—the statement updates
            automatically. Save your completed statement to unlock the AI Strategy
            Challenge.
          </p>
          {statementState.savedAt && isComplete && (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest-800 pt-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-forest-700" aria-hidden="true" />
              <span>
                Positioning Statement saved ({formatDateShort(statementState.savedAt)}) —
                AI Strategy Challenge is now unlocked.
              </span>
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={!isComplete}
          onClick={onSavePositioningStatement}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
            isComplete
              ? 'bg-forest-700 text-white hover:bg-forest-800 shadow-xs cursor-pointer'
              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          <span>Save Positioning Statement</span>
        </button>
      </section>

      {/* Progression Gates */}
      <ProgressionRoadmapSection
        completedCount={competitionSummary.completedCount}
        battlefieldUnlocked={competitionSummary.battlefieldUnlocked}
        positioningStatementUnlocked={positioningProgress.positioningStatementUnlocked}
        aiChallengeUnlocked={aiChallengeUnlocked}
        warRoomUnlocked={warRoomUnlocked}
        onOpenAIChallenge={onOpenAIChallenge}
        inPositioningView
      />

      <SwitchLotModal
        isOpen={switchModalOpen}
        lots={lots}
        currentLotId={selectedLot?.id ?? ''}
        onConfirmSwitch={(nextLotId) => {
          onSwitchSelectedLot(nextLotId);
          setSwitchModalOpen(false);
        }}
        onCancel={() => setSwitchModalOpen(false)}
      />
    </div>
  );
}
