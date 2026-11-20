import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  AIChallengeFeedback,
  AIChallengeFinalReview,
  AIChallengeQuestion,
  AIChallengeState,
  CompetitorAlternative,
  FarmerLot,
  PositioningMapState,
  PositioningStatementState,
} from '../../types/spicebridge';
import {
  buildStrategyChallengePayload,
  computeCompetitionSummary,
  computePositioningProgress,
  formatDateShort,
  formatINR,
  formatNumberIN,
  hasAnyAlternativeEntry,
  isAIChallengeComplete,
  isPositioningStatementComplete,
} from '../../utils/formatters';
import { ProgressionRoadmapSection } from '../competition/ProgressionRoadmapSection';
import { SwitchLotModal } from '../competition/SwitchLotModal';

interface AIChallengeWorkspaceProps {
  lots: FarmerLot[];
  selectedLot: FarmerLot | undefined;
  alternatives: CompetitorAlternative[];
  positioningState: PositioningMapState;
  statementState: PositioningStatementState;
  challengeState: AIChallengeState;
  onBackToPositioningStatement: () => void;
  onBackToBattlefieldMap: () => void;
  onBackToCompetitionLab: () => void;
  onBackToLotBank: () => void;
  onSwitchSelectedLot: (lotId: string) => void;
  onStartNewChallenge: (questions: AIChallengeQuestion[]) => void;
  onUpdateResponse: (index: number, text: string) => void;
  onSetFeedback: (index: number, feedback: AIChallengeFeedback) => void;
  onSetCurrentIndex: (index: number) => void;
  onCompleteWithReview: (review: AIChallengeFinalReview) => void;
}

export function AIChallengeWorkspace({
  lots,
  selectedLot,
  alternatives,
  positioningState,
  statementState,
  challengeState,
  onBackToPositioningStatement,
  onBackToBattlefieldMap,
  onBackToCompetitionLab,
  onBackToLotBank,
  onSwitchSelectedLot,
  onStartNewChallenge,
  onUpdateResponse,
  onSetFeedback,
  onSetCurrentIndex,
  onCompleteWithReview,
}: AIChallengeWorkspaceProps) {
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const competitionSummary = useMemo(
    () => computeCompetitionSummary(alternatives),
    [alternatives],
  );

  const positioningProgress = useMemo(
    () => computePositioningProgress(positioningState, alternatives),
    [positioningState, alternatives],
  );

  const aiChallengeUnlocked = useMemo(
    () =>
      Boolean(statementState.savedAt) &&
      isPositioningStatementComplete(statementState, alternatives),
    [statementState, alternatives],
  );

  const challengeComplete = isAIChallengeComplete(challengeState);
  const warRoomUnlocked = challengeComplete;

  const contextPayload = useMemo(
    () =>
      buildStrategyChallengePayload({
        selectedLot,
        lots,
        alternatives,
        positioningState,
        statementState,
      }),
    [selectedLot, lots, alternatives, positioningState, statementState],
  );

  const enteredAlternativesCount = useMemo(
    () => alternatives.filter(hasAnyAlternativeEntry).length,
    [alternatives],
  );

  const hasQuestions = challengeState.questions.length === 3;
  const activeIndex = challengeState.currentIndex;
  const activeQuestion = challengeState.questions[activeIndex];
  const activeResponse = challengeState.responses[activeIndex] ?? '';
  const activeFeedback = challengeState.feedbacks[activeIndex] ?? null;

  const handleGenerateQuestions = async () => {
    setErrorMessage(null);
    setLoadingQuestions(true);
    try {
      const res = await fetch('/api/strategy-challenge/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: contextPayload }),
      });
      const data = (await res.json()) as {
        questions?: AIChallengeQuestion[];
        error?: string;
      };
      if (!res.ok || !Array.isArray(data.questions) || data.questions.length < 3) {
        throw new Error(
          data.error || 'Could not generate 3 strategy challenge questions.',
        );
      }
      onStartNewChallenge(data.questions);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to generate challenge questions.',
      );
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSubmitDefence = async () => {
    if (!activeQuestion || !activeResponse.trim()) return;
    setErrorMessage(null);
    setLoadingFeedback(true);
    try {
      const res = await fetch('/api/strategy-challenge/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: contextPayload,
          question: activeQuestion,
          defence: activeResponse.trim(),
        }),
      });
      const data = (await res.json()) as {
        feedback?: AIChallengeFeedback;
        error?: string;
      };
      if (!res.ok || !data.feedback) {
        throw new Error(
          data.error || 'Could not evaluate your strategy defence.',
        );
      }
      onSetFeedback(activeIndex, data.feedback);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to evaluate defence.',
      );
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleNextChallenge = async () => {
    if (activeIndex < 2) {
      setErrorMessage(null);
      onSetCurrentIndex(activeIndex + 1);
      return;
    }

    // Complete Challenge 3 of 3 -> request Final Strategy Review from Gemini
    const challenges = challengeState.questions.map((q, idx) => ({
      focusArea: q.focusArea,
      question: q.question,
      defence: (challengeState.responses[idx] ?? '').trim(),
      feedback: challengeState.feedbacks[idx]!,
    }));

    setErrorMessage(null);
    setLoadingReview(true);
    try {
      const res = await fetch('/api/strategy-challenge/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: contextPayload,
          challenges,
        }),
      });
      const data = (await res.json()) as {
        review?: AIChallengeFinalReview;
        error?: string;
      };
      if (!res.ok || !data.review) {
        throw new Error(
          data.error || 'Could not generate Final Strategy Review.',
        );
      }
      onCompleteWithReview(data.review);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to generate Final Strategy Review.',
      );
    } finally {
      setLoadingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Venture Context */}
      <section
        aria-label="AI Strategy Challenge Navigation"
        className="rounded-xl border border-slate-200 bg-white px-5 py-4 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBackToPositioningStatement}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <span>← Back to Positioning Statement</span>
            </button>

            <button
              type="button"
              onClick={onBackToBattlefieldMap}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <span>← Battlefield Map</span>
            </button>

            <button
              type="button"
              onClick={onBackToCompetitionLab}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <span>← Competition Lab</span>
            </button>

            <button
              type="button"
              onClick={onBackToLotBank}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <span>← Lot Bank</span>
            </button>

            <button
              type="button"
              onClick={() => setSwitchModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-turmeric-50 px-3 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 cursor-pointer"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Switch Lot / Venture</span>
            </button>
          </div>

          <span className="font-display text-sm font-bold text-forest-700">
            AI Strategy Challenge
          </span>
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
        aria-label="AI Strategy Challenge Purpose"
        className="rounded-xl border border-slate-200 bg-white px-5 py-4"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert
            className="mt-0.5 h-4 w-4 shrink-0 text-forest-700"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <h1 className="font-display text-sm font-bold text-slate-900">
              AI Strategy Challenge
            </h1>
            <p className="text-xs text-slate-800 font-medium leading-relaxed">
              “The AI Strategy Challenge tests whether your competitive position is
              logically defensible and supported by evidence.”
            </p>
            <p className="text-xs text-slate-500">
              Gemini acts strictly as a challenger against the information already entered
              in your workspace—it will not provide answers for you or invent market
              facts.
            </p>
          </div>
        </div>
      </section>

      {/* Step 1 — Review Existing Information */}
      <section
        aria-label="Step 1: Review Existing Information"
        className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
      >
        <div className="border-b border-slate-100 pb-3">
          <h2 className="font-display text-base font-bold text-slate-900">
            Step 1 — Existing Workspace Evidence Reviewed by Challenger
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Only the facts below from your Lot Profile, Competitor Research, Matrix,
            Battlefield Map, and Positioning Statement will be used.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1">
            <p className="font-bold text-slate-800">Lot &amp; Venture Profile</p>
            <p className="text-slate-600">
              {selectedLot
                ? `${selectedLot.id} (${selectedLot.cropLabel}, ${selectedLot.moisturePercent.toFixed(1)}% moisture, ${selectedLot.purityPercent.toFixed(1)}% purity, ${formatINR(selectedLot.offeredPricePerKg)}/kg)`
                : 'No lot selected'}
              {' · '}
              <span className="font-mono tabular-nums">
                {lots.length} total lots ({contextPayload.lotBankSummary.passLots} Pass)
              </span>
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1">
            <p className="font-bold text-slate-800">
              Competitor Matrix &amp; Evidence
            </p>
            <p className="text-slate-600">
              <span className="font-mono tabular-nums">
                {enteredAlternativesCount} entered alternatives
              </span>{' '}
              · Overall evidence quality:{' '}
              <strong className="text-slate-900">
                {competitionSummary.overallEvidenceQuality}
              </strong>
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1">
            <p className="font-bold text-slate-800">Market Battlefield Map</p>
            <p className="text-slate-600">
              {positioningState.axes.xName.trim()} ({positioningState.spiceBridgeScore.x}
              /10) × {positioningState.axes.yName.trim()} (
              {positioningState.spiceBridgeScore.y}/10)
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1">
            <p className="font-bold text-slate-800">Saved Positioning Statement</p>
            <p className="text-slate-700 italic leading-relaxed">
              &ldquo;{statementState.finalStatement}&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* Error Banner (if Gemini / Server returns an error) */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step 2 — Launch / Restart Challenge */}
      {!hasQuestions && (
        <section
          aria-label="Step 2: Start AI Strategy Challenge"
          className="rounded-xl border border-forest-600/30 bg-white p-6 text-center space-y-4"
        >
          <div className="mx-auto max-w-xl space-y-1.5">
            <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
              Ready to Stress-Test Your Competitive Position?
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Click below to have Gemini generate 3 tough, evidence-grounded questions
              tailored specifically to your SpiceBridge lot profile, competitor research,
              Battlefield Map, and positioning statement.
            </p>
          </div>

          <button
            type="button"
            disabled={loadingQuestions}
            onClick={handleGenerateQuestions}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-forest-800 disabled:opacity-60 cursor-pointer"
          >
            {loadingQuestions ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Generating 3 Strategy Challenges...</span>
              </>
            ) : (
              <span>Challenge My Strategy</span>
            )}
          </button>
        </section>
      )}

      {/* Active Challenge Flow (Steps 2–5: One Question at a Time) */}
      {hasQuestions && !challengeComplete && activeQuestion && (
        <section
          aria-label={`Challenge ${activeIndex + 1} of 3`}
          className="rounded-xl border border-slate-200 bg-white p-5 space-y-5"
        >
          {/* Progress Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-forest-800 tabular-nums">
                Challenge {activeIndex + 1} of 3
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="text-xs font-semibold text-slate-600">
                {activeQuestion.focusArea}
              </span>
            </div>

            <button
              type="button"
              disabled={loadingQuestions || loadingFeedback || loadingReview}
              onClick={handleGenerateQuestions}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Challenge My Strategy (New Set)</span>
            </button>
          </div>

          {/* Challenge Progress Step Bar */}
          <div className="grid grid-cols-3 gap-2">
            {challengeState.questions.map((q, idx) => {
              const isCurrent = idx === activeIndex;
              const hasFb = challengeState.feedbacks[idx] !== null;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onSetCurrentIndex(idx)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                    isCurrent
                      ? 'border-forest-600 bg-forest-50 text-forest-900 font-bold'
                      : hasFb
                        ? 'border-emerald-200 bg-emerald-50/40 text-forest-800 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  Challenge {idx + 1} of 3 {hasFb ? '· Reviewed' : ''}
                </button>
              );
            })}
          </div>

          {/* Question Prompt */}
          <div className="rounded-xl border border-amber-200 bg-turmeric-50/70 p-4 space-y-1.5">
            <p className="text-[11px] font-bold tracking-wide text-amber-900 uppercase">
              Challenger Question {activeIndex + 1}
            </p>
            <p className="font-display text-sm font-bold text-slate-900 sm:text-base leading-relaxed">
              {activeQuestion.question}
            </p>
          </div>

          {/* Step 3 — User Defence Textbox */}
          <div className="space-y-3">
            <label
              htmlFor="strategy-defence-input"
              className="block text-xs font-bold text-slate-800"
            >
              Your Defence (Explain using evidence from your SpiceBridge work)
            </label>
            <textarea
              id="strategy-defence-input"
              rows={4}
              value={activeResponse}
              onChange={(e) => onUpdateResponse(activeIndex, e.target.value)}
              placeholder="Write your defence here. Reference specific lot numbers, moisture/purity data, competitor weaknesses, or Battlefield Map positions..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500">
                Gemini will inspect what is supported vs. assumed in your defence.
              </p>

              <button
                type="button"
                disabled={!activeResponse.trim() || loadingFeedback || loadingReview}
                onClick={handleSubmitDefence}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  activeResponse.trim() && !loadingFeedback && !loadingReview
                    ? 'bg-forest-700 text-white hover:bg-forest-800 shadow-xs cursor-pointer'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                {loadingFeedback ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    <span>Evaluating Defence...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {activeFeedback ? 'Re-submit My Defence' : 'Submit My Defence'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 4 — Gemini Feedback */}
          {activeFeedback && (
            <div className="space-y-4 border-t border-slate-200 pt-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-1.5">
                  <h3 className="text-xs font-bold tracking-wide text-forest-800">
                    SUPPORTED
                  </h3>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {activeFeedback.supported}
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-turmeric-50/60 p-4 space-y-1.5">
                  <h3 className="text-xs font-bold tracking-wide text-amber-900">
                    ASSUMPTION
                  </h3>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {activeFeedback.assumption}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                  <h3 className="text-xs font-bold tracking-wide text-slate-900">
                    NEXT EVIDENCE NEEDED
                  </h3>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {activeFeedback.nextEvidenceNeeded}
                  </p>
                </div>
              </div>

              {/* Step 5 — Move to Next Challenge */}
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  disabled={loadingReview}
                  onClick={handleNextChallenge}
                  className="inline-flex items-center gap-2 rounded-lg bg-forest-700 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-forest-800 disabled:opacity-60 cursor-pointer"
                >
                  {loadingReview ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      <span>Generating Final Strategy Review...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {activeIndex < 2
                          ? 'Next Challenge'
                          : 'Next Challenge — View Final Strategy Review'}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Step 6 — Final Strategy Review */}
      {challengeComplete && challengeState.finalReview && (
        <div className="space-y-6">
          <section
            aria-label="Strategy Challenge Complete"
            className="rounded-xl border border-emerald-200 bg-white p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-700 text-white">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
                    Strategy Challenge Complete
                  </h2>
                  <p className="text-xs text-slate-600">
                    Completed {formatDateShort(challengeState.completedAt!)} ·
                    Competition War Room is now unlocked.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={loadingQuestions}
                onClick={handleGenerateQuestions}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
              >
                {loadingQuestions ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    <span>Starting New Challenge...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Challenge My Strategy Again</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-1.5">
                <h3 className="text-xs font-bold tracking-wide text-forest-800">
                  STRONGEST PART OF MY STRATEGY
                </h3>
                <p className="text-xs text-slate-800 leading-relaxed">
                  {challengeState.finalReview.strongestPart}
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-turmeric-50/70 p-4 space-y-1.5">
                <h3 className="text-xs font-bold tracking-wide text-amber-900">
                  BIGGEST ASSUMPTION
                </h3>
                <p className="text-xs text-slate-800 leading-relaxed">
                  {challengeState.finalReview.biggestAssumption}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                <h3 className="text-xs font-bold tracking-wide text-slate-900">
                  NEXT VALIDATION PRIORITY
                </h3>
                <p className="text-xs text-slate-800 leading-relaxed">
                  {challengeState.finalReview.nextValidationPriority}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-[11px] text-slate-600">
              <AlertTriangle
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500"
                aria-hidden="true"
              />
              <span>
                This review evaluates logical defensibility and evidence sufficiency
                only; it does not predict venture success or failure.
              </span>
            </div>
          </section>

          {/* Completed Q&A Transcript (Persisted in localStorage) */}
          <section
            aria-label="Completed Challenge Responses and Feedback"
            className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
          >
            <h3 className="font-display text-sm font-bold text-slate-900">
              Recorded Challenge Questions, Defences &amp; Feedback
            </h3>
            <div className="space-y-4">
              {challengeState.questions.map((q, idx) => {
                const fb = challengeState.feedbacks[idx];
                return (
                  <div
                    key={q.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                  >
                    <div>
                      <p className="font-mono text-[11px] font-bold text-forest-700">
                        Challenge {idx + 1} of 3 · {q.focusArea}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-900">
                        {q.question}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800">
                      <span className="block text-[11px] font-bold text-slate-500 mb-1">
                        Your Defence
                      </span>
                      {challengeState.responses[idx]}
                    </div>

                    {fb && (
                      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3 text-xs">
                        <div className="rounded-lg border border-emerald-200 bg-white p-3">
                          <p className="text-[11px] font-bold text-forest-800 mb-1">
                            SUPPORTED
                          </p>
                          <p className="text-slate-700 leading-relaxed">
                            {fb.supported}
                          </p>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-white p-3">
                          <p className="text-[11px] font-bold text-amber-900 mb-1">
                            ASSUMPTION
                          </p>
                          <p className="text-slate-700 leading-relaxed">
                            {fb.assumption}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="text-[11px] font-bold text-slate-900 mb-1">
                            NEXT EVIDENCE NEEDED
                          </p>
                          <p className="text-slate-700 leading-relaxed">
                            {fb.nextEvidenceNeeded}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Progression Gates */}
      <ProgressionRoadmapSection
        completedCount={competitionSummary.completedCount}
        battlefieldUnlocked={competitionSummary.battlefieldUnlocked}
        positioningStatementUnlocked={positioningProgress.positioningStatementUnlocked}
        aiChallengeUnlocked={aiChallengeUnlocked}
        warRoomUnlocked={warRoomUnlocked}
        inAIChallengeView
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
