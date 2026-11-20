import {
  ArrowLeftRight,
  ArrowRight,
  Info,
  Plus,
} from 'lucide-react';
import { useState } from 'react';
import { CompetitorAlternative, FarmerLot } from '../../types/spicebridge';
import {
  computeCompetitionSummary,
  formatINR,
  formatNumberIN,
} from '../../utils/formatters';
import { AlternativeResearchCard } from './AlternativeResearchCard';
import { CompetitorMatrixSection } from './CompetitorMatrixSection';
import { ProgressionRoadmapSection } from './ProgressionRoadmapSection';
import { SwitchLotModal } from './SwitchLotModal';

interface CompetitionLabWorkspaceProps {
  lots: FarmerLot[];
  selectedLot: FarmerLot | undefined;
  alternatives: CompetitorAlternative[];
  positioningStatementUnlocked: boolean;
  aiChallengeUnlocked: boolean;
  warRoomUnlocked: boolean;
  onBackToLotBank: () => void;
  onOpenBattlefieldMap: () => void;
  onOpenPositioningStatement: () => void;
  onOpenAIChallenge: () => void;
  onSwitchSelectedLot: (lotId: string) => void;
  onUpdateAlternative: (id: string, patch: Partial<CompetitorAlternative>) => void;
  onAddAlternative: () => void;
  onRemoveAlternative: (id: string) => void;
}

export function CompetitionLabWorkspace({
  lots,
  selectedLot,
  alternatives,
  positioningStatementUnlocked,
  aiChallengeUnlocked,
  warRoomUnlocked,
  onBackToLotBank,
  onOpenBattlefieldMap,
  onOpenPositioningStatement,
  onOpenAIChallenge,
  onSwitchSelectedLot,
  onUpdateAlternative,
  onAddAlternative,
  onRemoveAlternative,
}: CompetitionLabWorkspaceProps) {
  const [switchModalOpen, setSwitchModalOpen] = useState(false);

  const summary = computeCompetitionSummary(alternatives);

  return (
    <div className="space-y-6">
      {/* Competition Lab Top Navigation & Selected Lot Context */}
      <section
        aria-label="Competition Lab Navigation and Venture Context"
        className="rounded-xl border border-slate-200 bg-white px-5 py-4 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
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
            {summary.battlefieldUnlocked && (
              <button
                type="button"
                onClick={onOpenBattlefieldMap}
                className="inline-flex items-center gap-1.5 rounded-lg bg-forest-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-forest-800 cursor-pointer"
              >
                <span>Open Market Battlefield Map</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <span className="font-display text-sm font-bold text-forest-700">
              Evidence-Based Competition Lab
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

      {/* Evidence Quality Definitions Guide */}
      <section
        aria-label="Evidence Quality Guide"
        className="rounded-xl border border-slate-200 bg-white px-5 py-4"
      >
        <div className="flex items-start gap-2.5">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-forest-700"
            aria-hidden="true"
          />
          <div className="space-y-1.5">
            <h2 className="font-display text-xs font-bold text-slate-900">
              Evidence Quality Grading Guide
            </h2>
            <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 md:grid-cols-3">
              <p>
                <strong className="text-forest-700">Strong</strong> = directly supported by
                a reliable current source
              </p>
              <p>
                <strong className="text-amber-700">Moderate</strong> = supported, but the
                evidence is indirect or incomplete
              </p>
              <p>
                <strong className="text-slate-800">Weak</strong> = assumption, informal
                observation, or evidence that still needs validation
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Blank Editable Competitor Research Workspace (3 to 6 Alternatives) */}
      <section aria-label="Competitor Research Workspace" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
              Competitor Research Workspace
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Research real spice-sourcing, mandi, or procurement alternatives and enter
              verified evidence below ({alternatives.length} of 6 maximum slots).
            </p>
          </div>

          <button
            type="button"
            disabled={alternatives.length >= 6}
            onClick={onAddAlternative}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              alternatives.length >= 6
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-forest-700 text-white hover:bg-forest-800 shadow-xs cursor-pointer'
            }`}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add Alternative ({alternatives.length}/6)</span>
          </button>
        </div>

        <div className="space-y-4">
          {alternatives.map((alt, idx) => (
            <AlternativeResearchCard
              key={alt.id}
              index={idx}
              alternative={alt}
              canRemove={alternatives.length > 3}
              onChange={onUpdateAlternative}
              onRemove={onRemoveAlternative}
            />
          ))}
        </div>
      </section>

      {/* Competitor Matrix */}
      <CompetitorMatrixSection alternatives={alternatives} />

      {/* Progression Gates */}
      <ProgressionRoadmapSection
        completedCount={summary.completedCount}
        battlefieldUnlocked={summary.battlefieldUnlocked}
        positioningStatementUnlocked={positioningStatementUnlocked}
        aiChallengeUnlocked={aiChallengeUnlocked}
        warRoomUnlocked={warRoomUnlocked}
        onOpenBattlefieldMap={onOpenBattlefieldMap}
        onOpenPositioningStatement={onOpenPositioningStatement}
        onOpenAIChallenge={onOpenAIChallenge}
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
