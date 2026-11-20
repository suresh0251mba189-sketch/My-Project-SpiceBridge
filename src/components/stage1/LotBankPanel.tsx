import { Check, MapPin, Search, X } from 'lucide-react';
import {
  CropFilter,
  FarmerLot,
  LotFilterState,
  StatusFilter,
} from '../../types/spicebridge';
import { formatNumberIN } from '../../utils/formatters';

interface LotBankPanelProps {
  lots: FarmerLot[];
  totalLotsCount: number;
  selectedLotId: string;
  filters: LotFilterState;
  onSelectLot: (lotId: string) => void;
  onChangeFilters: (next: LotFilterState) => void;
  onResetFilters: () => void;
  onRestoreSampleLots: () => void;
}

const CROP_TABS: { value: CropFilter; label: string }[] = [
  { value: 'All', label: 'All Crops' },
  { value: 'Fennel', label: 'Fennel' },
  { value: 'Cumin', label: 'Cumin' },
];

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Pass', label: 'Pass <9%' },
  { value: 'Hold', label: 'Hold / Re-dry' },
];

export function LotBankPanel({
  lots,
  totalLotsCount,
  selectedLotId,
  filters,
  onSelectLot,
  onChangeFilters,
  onResetFilters,
  onRestoreSampleLots,
}: LotBankPanelProps) {
  const hasActiveFilters =
    filters.crop !== 'All' ||
    filters.status !== 'All' ||
    filters.searchQuery.trim() !== '';

  return (
    <section
      aria-label="Cluster and Farmer Lot Bank"
      className="space-y-3.5"
    >
      {/* Compact Toolbar: Title + Filters + Search */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-display text-base font-bold text-slate-900">
            Cluster &amp; Farmer Lot Bank
          </h2>
          <span className="font-mono text-xs font-medium text-slate-500 tabular-nums">
            Showing {lots.length} of {totalLotsCount} lots
          </span>
          {totalLotsCount > 8 && (
            <button
              type="button"
              onClick={onRestoreSampleLots}
              className="text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-800 cursor-pointer"
            >
              Reset to 8 sample lots
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Crop Filter */}
          <div
            role="group"
            aria-label="Filter by crop"
            className="inline-flex items-center rounded-lg bg-slate-100 p-1"
          >
            {CROP_TABS.map((tab) => {
              const active = filters.crop === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => onChangeFilters({ ...filters, crop: tab.value })}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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

          {/* Quality Status Filter */}
          <div
            role="group"
            aria-label="Filter by quality status"
            className="inline-flex items-center rounded-lg bg-slate-100 p-1"
          >
            {STATUS_TABS.map((tab) => {
              const active = filters.status === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => onChangeFilters({ ...filters, status: tab.value })}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-52">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) =>
                onChangeFilters({ ...filters, searchQuery: e.target.value })
              }
              placeholder="Search lot, farmer, cluster..."
              aria-label="Search lots by ID, farmer name, or cluster"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-forest-600 focus:bg-white focus:outline-none"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => onChangeFilters({ ...filters, searchQuery: '' })}
                aria-label="Clear search query"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Responsive Compact Lot Cards Grid (3-4 per row on laptop/desktop) */}
      {lots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-900">
            No farmer lots match the active filters
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Adjust the crop or moisture filters, or clear your search query.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-3 rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div
          aria-label="Farmer harvest lot cards"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {lots.map((lot) => {
            const isSelected = lot.id === selectedLotId;
            const isPass = lot.qualityStatus === 'pass';

            return (
              <article
                key={lot.id}
                onClick={() => onSelectLot(lot.id)}
                className={`flex flex-col justify-between rounded-xl border p-3.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-forest-700 bg-forest-50/75 ring-2 ring-forest-600/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="space-y-1.5">
                  {/* 1. Lot ID & Crop/Variety */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800 leading-snug">
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          isSelected ? 'text-forest-700' : 'text-slate-700'
                        }`}
                      >
                        {lot.id}
                      </span>
                      <span className="mx-1.5 text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span>
                        {lot.cropLabel} — {lot.variety}
                      </span>
                    </p>
                  </div>

                  {/* 2. Farmer Name */}
                  <h3 className="font-display text-sm font-bold text-slate-900 truncate">
                    {lot.farmerName}
                  </h3>

                  {/* 3. One-line Quality / Moisture Summary */}
                  <p
                    className={`text-xs font-medium tabular-nums truncate ${
                      isPass ? 'text-forest-700' : 'text-amber-700'
                    }`}
                  >
                    {lot.moisturePercent.toFixed(1)}% moisture —{' '}
                    {isPass ? 'Pass <9%' : 'Hold / Re-dry'} |{' '}
                    {formatNumberIN(lot.quantityKg)} kg
                  </p>

                  {/* 4. Cluster Geography */}
                  <p className="flex items-center gap-1 text-xs text-slate-500 truncate">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="truncate">{lot.clusterGeography}</span>
                  </p>
                </div>

                {/* 5. Select Lot Button */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/70">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectLot(lot.id);
                    }}
                    className={`w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-forest-700 text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-800 hover:border-forest-600/40 hover:bg-forest-50 hover:text-forest-800'
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span>{isSelected ? 'Selected' : 'Select Lot'}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
