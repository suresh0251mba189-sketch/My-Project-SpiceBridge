import { AlertTriangle, Lock, RotateCcw, X } from 'lucide-react';
import { useEffect } from 'react';

interface RestartFromStartModalProps {
  isOpen: boolean;
  onRestartKeepData: () => void;
  onFullResetFromStart: () => void;
  onCancel: () => void;
}

export function RestartFromStartModal({
  isOpen,
  onRestartKeepData,
  onFullResetFromStart,
  onCancel,
}: RestartFromStartModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restart-app-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2
            id="restart-app-modal-title"
            className="font-display text-base font-bold text-slate-900"
          >
            Start App from Beginning
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs leading-relaxed text-slate-600">
            Choose whether to lock the session and return to the beginning while keeping
            your saved research, or clear all saved browser data for a completely fresh
            start.
          </p>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={onRestartKeepData}
              className="flex w-full items-start gap-3 rounded-lg border border-forest-600/30 bg-forest-50/70 p-3.5 text-left transition-colors hover:bg-forest-50 cursor-pointer"
            >
              <Lock
                className="mt-0.5 h-4 w-4 shrink-0 text-forest-700"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Lock &amp; Start at Step 1 (Keep Saved Data)
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600 leading-relaxed">
                  Returns to the Operator MFA Gate and sets the workspace back to Stage
                  1 (Lot Bank). Preserves all entered competitor research, map scores,
                  positioning statement, and AI strategy challenge records.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={onFullResetFromStart}
              className="flex w-full items-start gap-3 rounded-lg border border-amber-200 bg-turmeric-50/70 p-3.5 text-left transition-colors hover:bg-amber-50 cursor-pointer"
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-bold text-amber-950">
                  Full Reset to Initial Defaults (Clears Saved Work)
                </p>
                <p className="mt-0.5 text-[11px] text-amber-900/80 leading-relaxed">
                  Clears session authentication, competitor research, Battlefield Map,
                  positioning statement, and AI challenge progress back to the 8 initial
                  farmer lots.
                </p>
              </div>
            </button>
          </div>

          <div className="flex items-center justify-end border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 hidden" aria-hidden="true" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
