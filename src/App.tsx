import { useMemo, useState } from 'react';
import { OperatorMfaGate } from './components/auth/OperatorMfaGate';
import { DatabaseSettingsModal } from './components/database/DatabaseSettingsModal';
import { FirestoreErrorBoundary } from './components/layout/FirestoreErrorBoundary';
import { ResetDemoDataModal } from './components/layout/ResetDemoDataModal';
import { TopHeader } from './components/layout/TopHeader';
import { FarmGateAssayWorkspace } from './components/stage1/FarmGateAssayWorkspace';
import { LogAssayModal } from './components/stage1/LogAssayModal';
import { useSpiceBridgeStorage } from './hooks/useSpiceBridgeStorage';
import { getNextLotId } from './utils/formatters';

export default function App() {
  const {
    lots,
    selectedLotId,
    setSelectedLotId,
    addLot,
    batches,
    passports,
    millOrders,
    activeStageId,
    setActiveStageId,
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
          activeStageId={activeStageId}
          onSelectStage={setActiveStageId}
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
            <FarmGateAssayWorkspace
              lots={lots}
              selectedLotId={selectedLotId}
              onSelectLot={setSelectedLotId}
              onRestoreSampleLots={resetToSampleLots}
            />
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
