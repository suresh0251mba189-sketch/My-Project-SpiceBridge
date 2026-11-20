import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { useEffect } from 'react';

interface ResetDemoDataModalProps {
  isOpen: boolean;
  onConfirmReset: () => void;
  onCancel: () => void;
}

export function ResetDemoDataModal({
  isOpen,
  onConfirmReset,
  onCancel,
}: ResetDemoDataModalProps) {
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
      aria-labelledby="reset-demo-data-title"
    >
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            </div>
            <h2
              id="reset-demo-data-title"
              className="font-display text-base font-bold text-slate-900"
            >
              Reset All Demo Data?
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close confirmation dialog"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-turmeric-50/80 p-3.5 text-xs leading-relaxed text-amber-950">
            This will clear saved browser <span className="font-mono font-semibold">localStorage</span>{' '}
            data and restore the original <strong>8 sample farmer lots</strong> (SB-101 through
            SB-108). Any custom farmer lots and assay records will be reset to defaults.
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Want to return to the MFA login screen without clearing your saved work? Use{' '}
            <span className="font-semibold text-slate-800">Restart From Start Page</span>{' '}
            in Demo Controls instead.
          </p>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmReset}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Yes, Reset All Demo Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
