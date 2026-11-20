import { useMemo, useState } from 'react';
import { FarmerLot, LotFilterState } from '../../types/spicebridge';
import { AssayProfilePanel } from './AssayProfilePanel';
import { LotBankPanel } from './LotBankPanel';

interface FarmGateAssayWorkspaceProps {
  lots: FarmerLot[];
  selectedLotId: string;
  onSelectLot: (lotId: string) => void;
  onRestoreSampleLots: () => void;
  onOpenCompetitionLab: () => void;
}

const DEFAULT_FILTERS: LotFilterState = {
  crop: 'All',
  status: 'All',
  searchQuery: '',
};

export function FarmGateAssayWorkspace({
  lots,
  selectedLotId,
  onSelectLot,
  onRestoreSampleLots,
  onOpenCompetitionLab,
}: FarmGateAssayWorkspaceProps) {
  const [filters, setFilters] = useState<LotFilterState>(DEFAULT_FILTERS);

  const filteredLots = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();

    return lots.filter((lot) => {
      if (filters.crop !== 'All' && lot.crop !== filters.crop) {
        return false;
      }
      if (filters.status === 'Pass' && lot.qualityStatus !== 'pass') {
        return false;
      }
      if (filters.status === 'Hold' && lot.qualityStatus !== 'hold') {
        return false;
      }
      if (query) {
        const haystack = [
          lot.id,
          lot.farmerName,
          lot.cropLabel,
          lot.variety,
          lot.clusterGeography,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [lots, filters]);

  const selectedLot = useMemo(() => {
    return (
      lots.find((lot) => lot.id === selectedLotId) ??
      filteredLots[0] ??
      lots[0]
    );
  }, [lots, filteredLots, selectedLotId]);

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="space-y-4">
      <LotBankPanel
        lots={filteredLots}
        totalLotsCount={lots.length}
        selectedLotId={selectedLot?.id ?? ''}
        filters={filters}
        onSelectLot={onSelectLot}
        onChangeFilters={setFilters}
        onResetFilters={handleResetFilters}
        onRestoreSampleLots={onRestoreSampleLots}
      />

      <AssayProfilePanel
        lot={selectedLot}
        onOpenCompetitionLab={onOpenCompetitionLab}
      />
    </div>
  );
}
