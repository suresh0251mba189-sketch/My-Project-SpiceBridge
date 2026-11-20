import { useMemo, useState } from 'react';
import { OperatorMfaGate } from './components/auth/OperatorMfaGate';
import { BattlefieldMapWorkspace } from './components/battlefield/BattlefieldMapWorkspace';
import { AIChallengeWorkspace } from './components/challenge/AIChallengeWorkspace';
import { CompetitionLabWorkspace } from './components/competition/CompetitionLabWorkspace';
import { DatabaseSettingsModal } from './components/database/DatabaseSettingsModal';
import { FirestoreErrorBoundary } from './components/layout/FirestoreErrorBoundary';
import { ResetDemoDataModal } from './components/layout/ResetDemoDataModal';
import { TopHeader } from './components/layout/TopHeader';
import { PositioningStatementWorkspace } from './components/positioning/PositioningStatementWorkspace';
import { FarmGateAssayWorkspace } from './components/stage1/FarmGateAssayWorkspace';
import { LogAssayModal } from './components/stage1/LogAssayModal';
import { useSpiceBridgeStorage } from './hooks/useSpiceBridgeStorage';
import {
  computeCompetitionSummary,
  computePositioningProgress,
  getNextLotId,
  hasAnyAlternativeEntry,
  isAIChallengeComplete,
  isPositioningStatementComplete,
} from './utils/formatters';

export default function App() {
  const {
    lots,
    selectedLotId,
    setSelectedLotId,
    addLot,
    batches,
    passports,
    millOrders,
    activeView,
    setActiveView,
    alternatives,
    updateAlternative,
    addAlternative,
    removeAlternative,
    positioningState,
    updatePositioningAxes,
    updateSpiceBridgeScore,
    updateAlternativeScore,
    positioningStatement,
    updatePositioningStatementComponents,
    updateFinalStatementText,
    resetStatementToTemplate,
    savePositioningStatement,
    aiChallengeState,
    startNewAIChallenge,
    updateAIChallengeResponse,
    setAIChallengeFeedback,
    setAIChallengeCurrentIndex,
    completeAIChallengeWithReview,
    operatorSession,
    completeOperatorSignIn,
    restartFromBeginning,
    resetAppFromStart,
    resetAllDemoData,
    resetToSampleLots,
    dbConfig,
    updateDbConfig,
    syncStatus,
    syncStatusLabel,
    lastSyncedAt,
    hasPendingChanges,
    isNavigatorOnline,
    syncError,
    firebaseUserEmail,
    firebaseUserUid,
    connectFirebaseGoogle,
    disconnectFirebaseGoogle,
    testDbConnection,
    syncNow,
  } = useSpiceBridgeStorage();

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [resetDemoModalOpen, setResetDemoModalOpen] = useState(false);
  const [dbModalOpen, setDbModalOpen] = useState(false);

  const nextLotId = useMemo(() => getNextLotId(lots), [lots]);
  const selectedLot = useMemo(
    () => lots.find((lot) => lot.id === selectedLotId) ?? lots[0],
    [lots, selectedLotId],
  );

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
      Boolean(positioningStatement.savedAt) &&
      isPositioningStatementComplete(positioningStatement, alternatives),
    [positioningStatement, alternatives],
  );

  const warRoomUnlocked = useMemo(
    () => isAIChallengeComplete(aiChallengeState),
    [aiChallengeState],
  );

  const resolvedView =
    activeView === 'ai-challenge' && !aiChallengeUnlocked
      ? positioningProgress.positioningStatementUnlocked
        ? 'positioning-statement'
        : competitionSummary.battlefieldUnlocked
          ? 'battlefield-map'
          : 'competition-lab'
      : activeView === 'positioning-statement' &&
          !positioningProgress.positioningStatementUnlocked
        ? competitionSummary.battlefieldUnlocked
          ? 'battlefield-map'
          : 'competition-lab'
        : activeView === 'battlefield-map' && !competitionSummary.battlefieldUnlocked
          ? 'competition-lab'
          : activeView;

  const alternativesEnteredCount = useMemo(
    () => alternatives.filter(hasAnyAlternativeEntry).length,
    [alternatives],
  );

  if (!operatorSession || !operatorSession.mfaVerified) {
    return (
      <FirestoreErrorBoundary>
        <OperatorMfaGate
          onVerified={completeOperatorSignIn}
          onResetWorkspace={resetAppFromStart}
        />
      </FirestoreErrorBoundary>
    );
  }

  return (
    <FirestoreErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <TopHeader
          operatorSession={operatorSession}
          syncStatus={syncStatus}
          syncStatusLabel={syncStatusLabel}
          activeView={resolvedView}
          battlefieldUnlocked={competitionSummary.battlefieldUnlocked}
          positioningStatementUnlocked={
            positioningProgress.positioningStatementUnlocked
          }
          aiChallengeUnlocked={aiChallengeUnlocked}
          warRoomUnlocked={warRoomUnlocked}
          onSelectView={setActiveView}
          onOpenDatabaseSettings={() => setDbModalOpen(true)}
          onRestartFromStartPage={() => {
            setLogModalOpen(false);
            setResetDemoModalOpen(false);
            setDbModalOpen(false);
            restartFromBeginning();
          }}
          onRequestResetDemoData={() => setResetDemoModalOpen(true)}
          onOpenLogModal={() => setLogModalOpen(true)}
        />

      <main className="flex-1">
        <div className="mx-auto max-w-[1360px] px-4 py-4 sm:px-6 lg:px-8">
          {resolvedView === 'lot-bank' && (
            <FarmGateAssayWorkspace
              lots={lots}
              selectedLotId={selectedLotId}
              onSelectLot={setSelectedLotId}
              onRestoreSampleLots={resetToSampleLots}
              onOpenCompetitionLab={() => setActiveView('competition-lab')}
            />
          )}

          {resolvedView === 'competition-lab' && (
            <CompetitionLabWorkspace
              lots={lots}
              selectedLot={selectedLot}
              alternatives={alternatives}
              positioningStatementUnlocked={
                positioningProgress.positioningStatementUnlocked
              }
              aiChallengeUnlocked={aiChallengeUnlocked}
              warRoomUnlocked={warRoomUnlocked}
              onBackToLotBank={() => setActiveView('lot-bank')}
              onOpenBattlefieldMap={() => setActiveView('battlefield-map')}
              onOpenPositioningStatement={() =>
                setActiveView('positioning-statement')
              }
              onOpenAIChallenge={() => setActiveView('ai-challenge')}
              onSwitchSelectedLot={setSelectedLotId}
              onUpdateAlternative={updateAlternative}
              onAddAlternative={addAlternative}
              onRemoveAlternative={removeAlternative}
            />
          )}

          {resolvedView === 'battlefield-map' && (
            <BattlefieldMapWorkspace
              lots={lots}
              selectedLot={selectedLot}
              alternatives={alternatives}
              positioningState={positioningState}
              aiChallengeUnlocked={aiChallengeUnlocked}
              warRoomUnlocked={warRoomUnlocked}
              onBackToCompetitionLab={() => setActiveView('competition-lab')}
              onBackToLotBank={() => setActiveView('lot-bank')}
              onOpenPositioningStatement={() =>
                setActiveView('positioning-statement')
              }
              onOpenAIChallenge={() => setActiveView('ai-challenge')}
              onSwitchSelectedLot={setSelectedLotId}
              onChangeAxes={updatePositioningAxes}
              onChangeSpiceBridgeScore={updateSpiceBridgeScore}
              onChangeAlternativeScore={updateAlternativeScore}
            />
          )}

          {resolvedView === 'positioning-statement' && (
            <PositioningStatementWorkspace
              lots={lots}
              selectedLot={selectedLot}
              alternatives={alternatives}
              positioningState={positioningState}
              statementState={positioningStatement}
              warRoomUnlocked={warRoomUnlocked}
              onBackToBattlefieldMap={() => setActiveView('battlefield-map')}
              onBackToCompetitionLab={() => setActiveView('competition-lab')}
              onBackToLotBank={() => setActiveView('lot-bank')}
              onOpenAIChallenge={() => setActiveView('ai-challenge')}
              onSwitchSelectedLot={setSelectedLotId}
              onChangeComponents={updatePositioningStatementComponents}
              onChangeManualStatement={updateFinalStatementText}
              onResetStatementToTemplate={resetStatementToTemplate}
              onSavePositioningStatement={savePositioningStatement}
            />
          )}

          {resolvedView === 'ai-challenge' && (
            <AIChallengeWorkspace
              lots={lots}
              selectedLot={selectedLot}
              alternatives={alternatives}
              positioningState={positioningState}
              statementState={positioningStatement}
              challengeState={aiChallengeState}
              onBackToPositioningStatement={() =>
                setActiveView('positioning-statement')
              }
              onBackToBattlefieldMap={() => setActiveView('battlefield-map')}
              onBackToCompetitionLab={() => setActiveView('competition-lab')}
              onBackToLotBank={() => setActiveView('lot-bank')}
              onSwitchSelectedLot={setSelectedLotId}
              onStartNewChallenge={startNewAIChallenge}
              onUpdateResponse={updateAIChallengeResponse}
              onSetFeedback={setAIChallengeFeedback}
              onSetCurrentIndex={setAIChallengeCurrentIndex}
              onCompleteWithReview={completeAIChallengeWithReview}
            />
          )}
        </div>
      </main>

      <LogAssayModal
        isOpen={logModalOpen}
        nextLotId={nextLotId}
        onClose={() => setLogModalOpen(false)}
        onSubmitLot={addLot}
      />

      <ResetDemoDataModal
        isOpen={resetDemoModalOpen}
        onConfirmReset={() => {
          setResetDemoModalOpen(false);
          setLogModalOpen(false);
          setDbModalOpen(false);
          resetAllDemoData();
        }}
        onCancel={() => setResetDemoModalOpen(false)}
      />

      <DatabaseSettingsModal
        isOpen={dbModalOpen}
        dbConfig={dbConfig}
        syncStatus={syncStatus}
        syncStatusLabel={syncStatusLabel}
        lastSyncedAt={lastSyncedAt}
        hasPendingChanges={hasPendingChanges}
        isNavigatorOnline={isNavigatorOnline}
        firebaseUserEmail={firebaseUserEmail}
        firebaseUserUid={firebaseUserUid}
        syncError={syncError}
        recordCounts={{
          lots: lots.length,
          batches: batches.length,
          passports: passports.length,
          millOrders: millOrders.length,
          alternativesEntered: alternativesEnteredCount,
        }}
        onClose={() => setDbModalOpen(false)}
        onUpdateConfig={updateDbConfig}
        onConnectFirebaseGoogle={connectFirebaseGoogle}
        onDisconnectFirebaseGoogle={disconnectFirebaseGoogle}
        onTestConnection={testDbConnection}
        onSyncNow={syncNow}
      />
      </div>
    </FirestoreErrorBoundary>
  );
}



