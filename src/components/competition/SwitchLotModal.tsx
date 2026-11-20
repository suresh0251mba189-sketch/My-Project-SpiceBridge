import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FarmerLot } from '../../types/spicebridge';
import { formatNumberIN } from '../../utils/formatters';

interface SwitchLotModalProps {
  isOpen: boolean;
  lots: FarmerLot[];
  currentLotId: string;
  onConfirmSwitch: (nextLotId: string) => void;
  onCancel: () => void;
}

export function SwitchLotModal({
  isOpen,
  lots,
  currentLotId,
  onConfirmSwitch,
  onCancel,
}: SwitchLotModalProps) {
  const [targetLotId, setTargetLotId] = useState<string>(currentLotId);

  useEffect(() => {
    if (!isOpen) return;
    const otherLot = lots.find((l) => l.id !== currentLotId) ?? lots[0];
    setTargetLotId(otherLot?.id ?? currentLotId);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, lots, currentLotId, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="switch-lot-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2
            id="switch-lot-modal-title"
            className="font-display text-base font-bold text-slate-900"
          >
            Switch Lot / Venture
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close warning dialog"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
              aria-hidden="true"
            />
            <p className="font-semibold leading-relaxed">
              Changing lot/venture may make the existing competitor research irrelevant.
              Continue?
            </p>
          </div>

          <div>
            <label
              htmlFor="targetLotSelect"
              className="block text-xs font-semibold text-slate-700"
            >
              Select Lot / Venture to Switch To
            </label>
            <select
              id="targetLotSelect"
              value={targetLotId}
              onChange={(e) => setTargetLotId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-forest-600 focus:outline-none"
            >
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.id} — {lot.farmerName} ({lot.cropLabel} ·{' '}
                  {formatNumberIN(lot.quantityKg)} kg)
                  {lot.id === currentLotId ? ' [Current]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirmSwitch(targetLotId)}
              className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 cursor-pointer"
            >
              Continue &amp; Switch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
