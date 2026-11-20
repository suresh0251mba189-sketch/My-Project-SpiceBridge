import { ArrowRight, QrCode, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  CropFilter,
  FarmerLot,
  ProcessingBatch,
  StageId,
} from '../../types/spicebridge';
import {
  computeBatchOriginBreakdown,
  computePostCleanLabPurity,
  formatNumberIN,
} from '../../utils/formatters';
import { DigitalPassportCard } from './DigitalPassportCard';
import { QrScanPreviewModal } from './QrScanPreviewModal';

interface TraceabilityPassportWorkspaceProps {
  lots: FarmerLot[];
  batches: ProcessingBatch[];
  onSelectStage: (stageId: StageId) => void;
}

const CROP_FILTERS: { value: CropFilter; label: string }[] = [
  { value: 'All', label: 'All Passports' },
  { value: 'Fennel', label: 'Fennel' },
  { value: 'Cumin', label: 'Cumin' },
];

export function TraceabilityPassportWorkspace({
  lots,
  batches,
  onSelectStage,
}: TraceabilityPassportWorkspaceProps) {
  const [cropFilter, setCropFilter] = useState<CropFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedBatch, setInspectedBatch] = useState<ProcessingBatch | null>(
    null,
  );

  const filteredBatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return batches.filter((batch) => {
      if (cropFilter === 'Fennel' && !batch.cropSummary.toLowerCase().includes('fennel')) {
        return false;
      }
      if (cropFilter === 'Cumin' && !batch.cropSummary.toLowerCase().includes('cumin')) {
        return false;
      }
      if (query) {
        const haystack = [
          batch.id,
          batch.cropSummary,
          batch.hubLine,
          batch.lotIds.join(' '),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [batches, cropFilter, searchQuery]);

  const totalTraceableKg = batches.reduce((sum, b) => sum + b.totalKg, 0);
  const avgLabPurity =
    batches.length > 0
      ? batches.reduce(
          (sum, b) => sum + computePostCleanLabPurity(b.weightedPurity),
          0,
        ) / batches.length
      : 0;

  const uniqueContributingFarmers = useMemo(() => {
    const set = new Set<string>();
    for (const batch of batches) {
      const origin = computeBatchOriginBreakdown(batch.lotIds, lots);
      for (const lot of origin.contributingLots) {
        set.add(lot.id);
      }
    }
    return set.size;
  }, [batches, lots]);

  if (batches.length === 0) {
    return (
      <div className="space-y-6">
        <section
          aria-label="Digital Passport Empty State"
          className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-forest-50 text-forest-700 border border-forest-600/20">
            <QrCode className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-display text-lg font-bold text-slate-900">
            No 3 MT Processing Batches Ready for Passporting Yet
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Every commercial processing batch committed in Stage 2 automatically receives a
            scannable Digital Batch Passport with Unjha/Sirohi origin splits, composite
            moisture (&lt;9%), lab purity (&gt;99%), and FSSAI/APMC verification.
          </p>
          <button
            type="button"
            onClick={() => onSelectStage('stage-2-cleaning')}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-forest-800 transition-colors cursor-pointer"
          >
            <span>Go to Stage 2: Create 3 MT Batch</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stage 3 Summary Strip */}
      <section
        aria-label="Traceability Passport Summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium text-slate-500">
            Active Batch Passports
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {batches.length} {batches.length === 1 ? 'passport' : 'passports'}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            1:1 QR linkage to Stage 2 batches
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium text-slate-500">
            Verified Traceable Volume
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-forest-700 tabular-nums">
            {formatNumberIN(totalTraceableKg)} kg
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {(totalTraceableKg / 1000).toFixed(2)} MT · {uniqueContributingFarmers} farm
            lots traced
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium text-slate-500">
            Avg Post-Sortex Lab Purity
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {avgLabPurity.toFixed(2)}%
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Exceeds &gt; 99.0% B2B mill specification
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium text-slate-500">
            FSSAI &amp; APMC Verification
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-turmeric-600 tabular-nums">
            100% Verified
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Direct farm-gate procurement &amp; CoA ready
          </p>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Filter digital passports by crop"
          className="inline-flex items-center rounded-lg bg-slate-100 p-1 self-start"
        >
          {CROP_FILTERS.map((tab) => {
            const active = cropFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setCropFilter(tab.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-forest-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by Batch ID or Lot ID..."
            aria-label="Filter passports by Batch ID or Lot ID"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:bg-white focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear passport search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </section>

      {/* Scannable Digital Batch Passports Grid */}
      {filteredBatches.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-900">
            No passports match your current filter
          </p>
          <button
            type="button"
            onClick={() => {
              setCropFilter('All');
              setSearchQuery('');
            }}
            className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Reset Passport Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {filteredBatches.map((batch) => (
            <DigitalPassportCard
              key={batch.id}
              batch={batch}
              lots={lots}
              onInspectQr={setInspectedBatch}
            />
          ))}
        </div>
      )}

      <QrScanPreviewModal
        batch={inspectedBatch}
        lots={lots}
        onClose={() => setInspectedBatch(null)}
      />
    </div>
  );
}
