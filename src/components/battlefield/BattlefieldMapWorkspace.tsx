import { ArrowLeftRight, ArrowRight, Compass } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  CompetitorAlternative,
  FarmerLot,
  PositioningAxes,
  PositioningMapState,
  PositioningScore,
} from '../../types/spicebridge';
import {
  computeCompetitionSummary,
  computePositioningProgress,
  formatINR,
  formatNumberIN,
  isScoreComplete,
  PlottedAlternativePoint,
} from '../../utils/formatters';
import { ProgressionRoadmapSection } from '../competition/ProgressionRoadmapSection';
import { SwitchLotModal } from '../competition/SwitchLotModal';
import { AxesDefinitionStep } from './AxesDefinitionStep';
import { MapInterpretationSection } from './MapInterpretationSection';
import { PositioningMapChart } from './PositioningMapChart';
import { PositioningScoringStep } from './PositioningScoringStep';

interface BattlefieldMapWorkspaceProps {
  lots: FarmerLot[];
  selectedLot: FarmerLot | undefined;
  alternatives: CompetitorAlternative[];
  positioningState: PositioningMapState;
  aiChallengeUnlocked: boolean;
  warRoomUnlocked: boolean;
  onBackToCompetitionLab: () => void;
  onBackToLotBank: () => void;
  onOpenPositioningStatement: () => void;
  onOpenAIChallenge: () => void;
  onSwitchSelectedLot: (lotId: string) => void;
  onChangeAxes: (patch: Partial<PositioningAxes>) => void;
  onChangeSpiceBridgeScore: (patch: Partial<PositioningScore>) => void;
  onChangeAlternativeScore: (
    alternativeId: string,
    patch: Partial<PositioningScore>,
  ) => void;
}

export function BattlefieldMapWorkspace({
  lots,
  selectedLot,
  alternatives,
  positioningState,
  aiChallengeUnlocked,
  warRoomUnlocked,
  onBackToCompetitionLab,
  onBackToLotBank,
  onOpenPositioningStatement,
  onOpenAIChallenge,
  onSwitchSelectedLot,
  onChangeAxes,
  onChangeSpiceBridgeScore,
  onChangeAlternativeScore,
}: BattlefieldMapWorkspaceProps) {
  const [switchModalOpen, setSwitchModalOpen] = useState(false);

  const competitionSummary = useMemo(
    () => computeCompetitionSummary(alternatives),
    [alternatives],
  );

  const progress = useMemo(
    () => computePositioningProgress(positioningState, alternatives),
    [positioningState, alternatives],
  );

  const spiceBridgePoint = useMemo(() => {
    if (!isScoreComplete(positioningState.spiceBridgeScore)) return null;
    return {
      x: positioningState.spiceBridgeScore.x!,
      y: positioningState.spiceBridgeScore.y!,
    };
  }, [positioningState.spiceBridgeScore]);

  const { scoredAlternatives, unscoredNames } = useMemo(() => {
    const scored: PlottedAlternativePoint[] = [];
    const pending: string[] = [];

    if (!spiceBridgePoint) {
      pending.push('SpiceBridge');
    }

    progress.scorableAlternatives.forEach((alt, idx) => {
      const displayName = alt.name.trim() || `Alternative ${idx + 1}`;
      const score = positioningState.alternativeScores[alt.id];
      if (isScoreComplete(score)) {
        scored.push({
          id: alt.id,
          name: displayName,
          type: alt.type || 'Alternative',
          x: score.x!,
          y: score.y!,
        });
      } else {
        pending.push(displayName);
      }
    });

    return { scoredAlternatives: scored, unscoredNames: pending };
  }, [progress.scorableAlternatives, positioningState.alternativeScores, spiceBridgePoint]);

  return (
    <div className="space-y-6">
      {/* Top Navigation & Active Lot / Venture Context */}
      <section
        aria-label="Market Battlefield Map Navigation"
        className="rounded-xl border border-slate-200 bg-white px-5 py-4 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
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
            {progress.positioningStatementUnlocked && (
              <button
                type="button"
                onClick={onOpenPositioningStatement}
                className="inline-flex items-center gap-1.5 rounded-lg bg-forest-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-forest-800 cursor-pointer"
              >
                <span>Open Positioning Statement</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <span className="font-display text-sm font-bold text-forest-700">
              Market Battlefield Map
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

      {/* Purpose Explanation */}
      <section
        aria-label="Positioning Map Purpose"
        className="rounded-xl border border-slate-200 bg-white px-5 py-4"
      >
        <div className="flex items-start gap-3">
          <Compass
            className="mt-0.5 h-4 w-4 shrink-0 text-forest-700"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <h1 className="font-display text-sm font-bold text-slate-900">
              Why Build a Market Battlefield Map?
            </h1>
            <p className="text-xs text-slate-700 leading-relaxed">
              “A positioning map compares how customers and spice-supply stakeholders
              perceive competing alternatives on two dimensions that matter to them.”
            </p>
            <p className="text-xs text-slate-500">
              Use your Competition Lab research to decide how SpiceBridge is positioned
              relative to existing alternatives.
            </p>
          </div>
        </div>
      </section>

      {/* Step 1: Choose the Positioning Axes */}
      <AxesDefinitionStep axes={positioningState.axes} onChangeAxes={onChangeAxes} />

      {/* Step 2: Score SpiceBridge & Each Alternative */}
      <PositioningScoringStep
        axes={positioningState.axes}
        spiceBridgeScore={positioningState.spiceBridgeScore}
        scorableAlternatives={progress.scorableAlternatives}
        alternativeScores={positioningState.alternativeScores}
        onChangeSpiceBridgeScore={onChangeSpiceBridgeScore}
        onChangeAlternativeScore={onChangeAlternativeScore}
      />

      {/* Step 3: Interactive 2x2 Positioning Map */}
      <PositioningMapChart
        axes={positioningState.axes}
        axesDefined={progress.axesDefined}
        spiceBridgePoint={spiceBridgePoint}
        scoredAlternatives={scoredAlternatives}
        unscoredNames={unscoredNames}
      />

      {/* Step 4: Interpret the Map */}
      <MapInterpretationSection
        axes={positioningState.axes}
        mapVisible={progress.mapVisible}
        spiceBridgePoint={spiceBridgePoint}
        scoredAlternatives={scoredAlternatives}
      />

      {/* Progression Gates */}
      <ProgressionRoadmapSection
        completedCount={competitionSummary.completedCount}
        battlefieldUnlocked={competitionSummary.battlefieldUnlocked}
        positioningStatementUnlocked={progress.positioningStatementUnlocked}
        aiChallengeUnlocked={aiChallengeUnlocked}
        warRoomUnlocked={warRoomUnlocked}
        onOpenPositioningStatement={onOpenPositioningStatement}
        onOpenAIChallenge={onOpenAIChallenge}
        inBattlefieldView
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
