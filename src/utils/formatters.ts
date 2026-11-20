import {
  AIChallengeState,
  CompetitorAlternative,
  CropType,
  EvidenceQuality,
  FarmerLot,
  PositioningAxes,
  PositioningMapState,
  PositioningScore,
  PositioningStatementState,
  QualityStatus,
} from '../types/spicebridge';

export const MOISTURE_PASS_THRESHOLD = 9.0;
export const BAG_WEIGHT_KG = 50;

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatNumberIN(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(value);
}

export function calculateBagCount(quantityKg: number): number {
  if (!Number.isFinite(quantityKg) || quantityKg <= 0) return 0;
  return Math.round(quantityKg / BAG_WEIGHT_KG);
}

export function evaluateMoisture(moisturePercent: number): {
  status: QualityStatus;
  label: string;
  note: string;
  severity: 'pass' | 'warning' | 'reject';
} {
  if (moisturePercent < MOISTURE_PASS_THRESHOLD) {
    return {
      status: 'pass',
      label: 'Pass (< 9.0%)',
      note: 'Pass: < 9.0%',
      severity: 'pass',
    };
  }

  if (moisturePercent < 10.0) {
    return {
      status: 'hold',
      label: 'Hold / Re-dry',
      note: 'Hold: Needs sun-drying < 9.0%',
      severity: 'warning',
    };
  }

  return {
    status: 'hold',
    label: 'Hold / Re-dry',
    note: 'Reject / Re-dry Required',
    severity: 'reject',
  };
}

export function getCropDisplayName(crop: CropType): string {
  return crop === 'Fennel' ? 'Fennel (Saunf)' : 'Cumin (Jeera)';
}

export function calculateLotFinancials(lot: FarmerLot): {
  grossPayout: number;
  mandiGrossBenchmark: number | null;
  extraFarmerGain: number | null;
  gainPerKg: number | null;
  gainPercent: number | null;
} {
  const grossPayout = lot.quantityKg * lot.offeredPricePerKg;

  if (lot.mandiNetPricePerKg === null || lot.mandiNetPricePerKg <= 0) {
    return {
      grossPayout,
      mandiGrossBenchmark: null,
      extraFarmerGain: null,
      gainPerKg: null,
      gainPercent: null,
    };
  }

  const mandiGrossBenchmark = lot.quantityKg * lot.mandiNetPricePerKg;
  const gainPerKg = lot.offeredPricePerKg - lot.mandiNetPricePerKg;
  const extraFarmerGain = lot.quantityKg * gainPerKg;
  const gainPercent = (gainPerKg / lot.mandiNetPricePerKg) * 100;

  return {
    grossPayout,
    mandiGrossBenchmark,
    extraFarmerGain,
    gainPerKg,
    gainPercent,
  };
}

export function getNextLotId(lots: FarmerLot[]): string {
  let maxNumber = 100;
  for (const lot of lots) {
    const match = lot.id.match(/SB-(\d+)/i);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (parsed > maxNumber) {
        maxNumber = parsed;
      }
    }
  }
  return `SB-${maxNumber + 1}`;
}

export const BATCH_TARGET_KG = 3000;
export const CLEANING_CAPACITY_KG_PER_HR = 500;
export const HOURS_PER_FULL_BATCH = BATCH_TARGET_KG / CLEANING_CAPACITY_KG_PER_HR; // 6 hours
export const DAILY_HUB_BOTTLENECK_BATCHES = 1.33;
export const DAILY_HUB_BOTTLENECK_KG = BATCH_TARGET_KG * DAILY_HUB_BOTTLENECK_BATCHES; // 3,990 kg/day

export function calculateCleaningTimeHours(totalKg: number): number {
  if (!Number.isFinite(totalKg) || totalKg <= 0) return 0;
  return totalKg / CLEANING_CAPACITY_KG_PER_HR;
}

export function formatDurationHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '0.0 hrs (0h 00m)';
  const wholeHours = Math.floor(hours);
  const mins = Math.round((hours - wholeHours) * 60);
  const adjustedHours = mins === 60 ? wholeHours + 1 : wholeHours;
  const adjustedMins = mins === 60 ? 0 : mins;
  return `${hours.toFixed(2).replace(/\.00$/, '.0')} hrs (${adjustedHours}h ${String(adjustedMins).padStart(2, '0')}m)`;
}

export function calculateBatchMetrics(lots: FarmerLot[]): {
  totalKg: number;
  totalBags: number;
  fillPercent: number;
  remainingKg: number;
  overCapacityKg: number;
  isOverCapacity: boolean;
  isOptimalFull: boolean;
  cleaningHours: number;
  batchEquivalent: number;
  weightedMoisture: number;
  weightedPurity: number;
  cropSummary: string;
  isMixedCrop: boolean;
} {
  if (lots.length === 0) {
    return {
      totalKg: 0,
      totalBags: 0,
      fillPercent: 0,
      remainingKg: BATCH_TARGET_KG,
      overCapacityKg: 0,
      isOverCapacity: false,
      isOptimalFull: false,
      cleaningHours: 0,
      batchEquivalent: 0,
      weightedMoisture: 0,
      weightedPurity: 0,
      cropSummary: 'No lots pooled',
      isMixedCrop: false,
    };
  }

  const totalKg = lots.reduce((sum, lot) => sum + lot.quantityKg, 0);
  const totalBags = lots.reduce((sum, lot) => sum + lot.bagCount, 0);
  const fillPercent = (totalKg / BATCH_TARGET_KG) * 100;
  const remainingKg = Math.max(0, BATCH_TARGET_KG - totalKg);
  const overCapacityKg = Math.max(0, totalKg - BATCH_TARGET_KG);
  const isOverCapacity = totalKg > BATCH_TARGET_KG;
  const isOptimalFull = totalKg === BATCH_TARGET_KG;
  const cleaningHours = calculateCleaningTimeHours(totalKg);
  const batchEquivalent = totalKg / BATCH_TARGET_KG;

  const weightedMoisture =
    lots.reduce((sum, lot) => sum + lot.moisturePercent * lot.quantityKg, 0) / totalKg;
  const weightedPurity =
    lots.reduce((sum, lot) => sum + lot.purityPercent * lot.quantityKg, 0) / totalKg;

  const uniqueCrops = Array.from(new Set(lots.map((l) => l.crop)));
  const isMixedCrop = uniqueCrops.length > 1;
  const cropSummary = isMixedCrop
    ? 'Mixed (Fennel & Cumin)'
    : getCropDisplayName(uniqueCrops[0]);

  return {
    totalKg,
    totalBags,
    fillPercent,
    remainingKg,
    overCapacityKg,
    isOverCapacity,
    isOptimalFull,
    cleaningHours,
    batchEquivalent,
    weightedMoisture,
    weightedPurity,
    cropSummary,
    isMixedCrop,
  };
}

export function getNextBatchId(batches: { id: string }[]): string {
  let maxNumber = 0;
  for (const batch of batches) {
    const match = batch.id.match(/SB-B(\d+)/i);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (parsed > maxNumber) {
        maxNumber = parsed;
      }
    }
  }
  return `SB-B${String(maxNumber + 1).padStart(2, '0')}`;
}

export interface ClusterContribution {
  clusterKey: string;
  regionLabel: string;
  farmerCount: number;
  farmerPercent: number;
  totalKg: number;
  weightPercent: number;
  lotIds: string[];
  farmerNames: string[];
}

export function classifyClusterHub(clusterGeography: string): {
  clusterKey: string;
  regionLabel: string;
} {
  const lower = clusterGeography.toLowerCase();
  if (lower.includes('unjha')) {
    return { clusterKey: 'Unjha', regionLabel: 'Unjha Belt (Gujarat)' };
  }
  if (lower.includes('sirohi') || lower.includes('abu') || lower.includes('reodar')) {
    return { clusterKey: 'Sirohi', regionLabel: 'Sirohi Belt (Rajasthan)' };
  }
  if (lower.includes('visnagar')) {
    return { clusterKey: 'Visnagar', regionLabel: 'Visnagar, Mehsana (Gujarat)' };
  }
  if (lower.includes('patan')) {
    return { clusterKey: 'Patan', regionLabel: 'Patan Cluster (Gujarat)' };
  }
  if (lower.includes('palanpur') || lower.includes('banaskantha')) {
    return { clusterKey: 'Palanpur', regionLabel: 'Palanpur, Banaskantha (Gujarat)' };
  }
  const shortName = clusterGeography.split(',')[0].trim() || clusterGeography;
  return { clusterKey: shortName, regionLabel: clusterGeography };
}

export function computeBatchOriginBreakdown(
  batchLotIds: string[],
  allLots: FarmerLot[],
): {
  contributingLots: FarmerLot[];
  clusters: ClusterContribution[];
  unjhaFarmerPercent: number;
  sirohiFarmerPercent: number;
  otherFarmerPercent: number;
  unjhaWeightPercent: number;
  sirohiWeightPercent: number;
} {
  const contributingLots = batchLotIds
    .map((id) => allLots.find((lot) => lot.id === id))
    .filter((lot): lot is FarmerLot => Boolean(lot));

  const totalFarmers = contributingLots.length;
  const totalKg = contributingLots.reduce((sum, lot) => sum + lot.quantityKg, 0);

  const grouped = new Map<
    string,
    {
      regionLabel: string;
      farmerCount: number;
      totalKg: number;
      lotIds: string[];
      farmerNames: string[];
    }
  >();

  for (const lot of contributingLots) {
    const { clusterKey, regionLabel } = classifyClusterHub(lot.clusterGeography);
    const existing = grouped.get(clusterKey);
    if (existing) {
      existing.farmerCount += 1;
      existing.totalKg += lot.quantityKg;
      existing.lotIds.push(lot.id);
      existing.farmerNames.push(lot.farmerName);
    } else {
      grouped.set(clusterKey, {
        regionLabel,
        farmerCount: 1,
        totalKg: lot.quantityKg,
        lotIds: [lot.id],
        farmerNames: [lot.farmerName],
      });
    }
  }

  const clusters: ClusterContribution[] = Array.from(grouped.entries())
    .map(([clusterKey, data]) => ({
      clusterKey,
      regionLabel: data.regionLabel,
      farmerCount: data.farmerCount,
      farmerPercent: totalFarmers > 0 ? (data.farmerCount / totalFarmers) * 100 : 0,
      totalKg: data.totalKg,
      weightPercent: totalKg > 0 ? (data.totalKg / totalKg) * 100 : 0,
      lotIds: data.lotIds,
      farmerNames: data.farmerNames,
    }))
    .sort((a, b) => b.farmerPercent - a.farmerPercent || b.weightPercent - a.weightPercent);

  const unjha = clusters.find((c) => c.clusterKey === 'Unjha');
  const sirohi = clusters.find((c) => c.clusterKey === 'Sirohi');

  const unjhaFarmerPercent = unjha?.farmerPercent ?? 0;
  const sirohiFarmerPercent = sirohi?.farmerPercent ?? 0;
  const otherFarmerPercent = Math.max(
    0,
    100 - unjhaFarmerPercent - sirohiFarmerPercent,
  );

  return {
    contributingLots,
    clusters,
    unjhaFarmerPercent,
    sirohiFarmerPercent,
    otherFarmerPercent,
    unjhaWeightPercent: unjha?.weightPercent ?? 0,
    sirohiWeightPercent: sirohi?.weightPercent ?? 0,
  };
}

/**
 * Computes post-cleaning lab purity (> 99.0%) after Stage 2 vibro-destoning,
 * gravity separation, and Sortex color sorting remove ~80% of raw chaff/dust.
 */
export function computePostCleanLabPurity(preCleanWeightedPurity: number): number {
  if (!Number.isFinite(preCleanWeightedPurity) || preCleanWeightedPurity <= 0) {
    return 99.4;
  }
  const remainingForeignMatter = Math.max(0, 100 - preCleanWeightedPurity);
  const postCleanForeignMatter = Math.min(0.8, Math.max(0.2, remainingForeignMatter * 0.22));
  return Number((100 - postCleanForeignMatter).toFixed(2));
}

export function generatePassportHash(seed: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b);
  }
  const p1 = (h1 >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `${p1.slice(0, 4)}-${p2.slice(0, 4)}-${p1.slice(4, 8)}`;
}

export const MILL_SELLING_PRICE_PER_KG = 200; // ₹6,00,000 per 3,000 kg (3 MT)
export const BATCH_VARIABLE_COST_PER_KG = 184; // ₹5,52,000 per 3,000 kg (3 MT)
export const NET_CONTRIBUTION_PER_KG = 16; // ₹48,000 per 3,000 kg (3 MT)
export const INVOICE_SETTLEMENT_DAYS = 14;

export function calculateMillEconomics(totalKg: number): {
  grossRevenue: number;
  variableCost: number;
  netContribution: number;
  marginPercent: number;
  procurementCostShare: number;
  cleaningLogisticsCostShare: number;
} {
  const safeKg = Number.isFinite(totalKg) && totalKg > 0 ? totalKg : 0;
  const grossRevenue = safeKg * MILL_SELLING_PRICE_PER_KG;
  const variableCost = safeKg * BATCH_VARIABLE_COST_PER_KG;
  const netContribution = grossRevenue - variableCost;
  const marginPercent = grossRevenue > 0 ? (netContribution / grossRevenue) * 100 : 0;

  // Transparent breakdown of ₹184/kg variable cost: ₹172/kg farm-gate procurement + ₹12/kg hub cleaning, packaging & freight
  const procurementCostShare = safeKg * 172;
  const cleaningLogisticsCostShare = variableCost - procurementCostShare;

  return {
    grossRevenue,
    variableCost,
    netContribution,
    marginPercent,
    procurementCostShare,
    cleaningLogisticsCostShare,
  };
}

export function addDaysIso(baseIso: string, days: number): string {
  const date = new Date(baseIso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function formatDateShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getDaysRemaining(dueIso: string): number {
  const now = new Date();
  const due = new Date(dueIso);
  const diffMs = due.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function getNextMillOrderId(orders: { id: string }[]): string {
  let maxNumber = 0;
  for (const order of orders) {
    const match = order.id.match(/SB-INV-(\d+)/i);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (parsed > maxNumber) {
        maxNumber = parsed;
      }
    }
  }
  return `SB-INV-${String(maxNumber + 1).padStart(2, '0')}`;
}

export function createBlankAlternative(index: number): CompetitorAlternative {
  return {
    id: `ALT-${index}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    type: '',
    priceCost: '',
    priceNotApplicable: false,
    mainOffer: '',
    mainStrength: '',
    mainWeakness: '',
    evidenceSource: '',
    evidenceQuality: '',
  };
}

export function isAlternativeCompleted(alt: CompetitorAlternative): boolean {
  return (
    alt.name.trim().length > 0 &&
    alt.type !== '' &&
    alt.mainOffer.trim().length > 0 &&
    alt.mainStrength.trim().length > 0 &&
    alt.mainWeakness.trim().length > 0 &&
    alt.evidenceSource.trim().length > 0 &&
    alt.evidenceQuality !== ''
  );
}

export function hasAnyAlternativeEntry(alt: CompetitorAlternative): boolean {
  return (
    alt.name.trim().length > 0 ||
    alt.type !== '' ||
    alt.priceCost.trim().length > 0 ||
    alt.priceNotApplicable ||
    alt.mainOffer.trim().length > 0 ||
    alt.mainStrength.trim().length > 0 ||
    alt.mainWeakness.trim().length > 0 ||
    alt.evidenceSource.trim().length > 0 ||
    alt.evidenceQuality !== ''
  );
}

export function computeCompetitionSummary(alternatives: CompetitorAlternative[]): {
  researchedCount: number;
  completedCount: number;
  directCount: number;
  indirectCount: number;
  substituteCount: number;
  doNothingCount: number;
  overallEvidenceQuality: EvidenceQuality | 'Evidence required';
  qualityBreakdown: { strong: number; moderate: number; weak: number };
  battlefieldUnlocked: boolean;
} {
  const researched = alternatives.filter(hasAnyAlternativeEntry);
  const completed = alternatives.filter(isAlternativeCompleted);

  const directCount = alternatives.filter((a) => a.type === 'Direct Competitor').length;
  const indirectCount = alternatives.filter((a) => a.type === 'Indirect Competitor').length;
  const substituteCount = alternatives.filter((a) => a.type === 'Substitute').length;
  const doNothingCount = alternatives.filter((a) => a.type === 'Do Nothing').length;

  let strong = 0;
  let moderate = 0;
  let weak = 0;

  for (const item of completed) {
    if (item.evidenceQuality === 'Strong') strong += 1;
    else if (item.evidenceQuality === 'Moderate') moderate += 1;
    else if (item.evidenceQuality === 'Weak') weak += 1;
  }

  let overallEvidenceQuality: EvidenceQuality | 'Evidence required' =
    'Evidence required';

  if (completed.length > 0) {
    const score = (strong * 3 + moderate * 2 + weak * 1) / completed.length;
    if (score >= 2.5) {
      overallEvidenceQuality = 'Strong';
    } else if (score >= 1.5) {
      overallEvidenceQuality = 'Moderate';
    } else {
      overallEvidenceQuality = 'Weak';
    }
  }

  return {
    researchedCount: researched.length,
    completedCount: completed.length,
    directCount,
    indirectCount,
    substituteCount,
    doNothingCount,
    overallEvidenceQuality,
    qualityBreakdown: { strong, moderate, weak },
    battlefieldUnlocked: completed.length >= 3,
  };
}

export function createInitialPositioningState(): PositioningMapState {
  return {
    axes: {
      xName: '',
      xLeftLabel: '',
      xRightLabel: '',
      yName: '',
      yBottomLabel: '',
      yTopLabel: '',
    },
    spiceBridgeScore: {
      x: null,
      y: null,
    },
    alternativeScores: {},
  };
}

export function arePositioningAxesDefined(axes: PositioningAxes): boolean {
  return (
    axes.xName.trim().length > 0 &&
    axes.xLeftLabel.trim().length > 0 &&
    axes.xRightLabel.trim().length > 0 &&
    axes.yName.trim().length > 0 &&
    axes.yBottomLabel.trim().length > 0 &&
    axes.yTopLabel.trim().length > 0
  );
}

export function isScoreComplete(score: PositioningScore | undefined): boolean {
  return (
    score !== undefined &&
    score.x !== null &&
    score.y !== null &&
    Number.isFinite(score.x) &&
    Number.isFinite(score.y) &&
    score.x >= 1 &&
    score.x <= 10 &&
    score.y >= 1 &&
    score.y <= 10
  );
}

export function computePositioningProgress(
  positioning: PositioningMapState,
  alternatives: CompetitorAlternative[],
): {
  axesDefined: boolean;
  spiceBridgeScored: boolean;
  scorableAlternatives: CompetitorAlternative[];
  completedAlternatives: CompetitorAlternative[];
  scoredCompletedCount: number;
  allCompletedScored: boolean;
  plottedAlternativesCount: number;
  mapVisible: boolean;
  positioningStatementUnlocked: boolean;
} {
  const axesDefined = arePositioningAxesDefined(positioning.axes);
  const spiceBridgeScored = isScoreComplete(positioning.spiceBridgeScore);

  const completedAlternatives = alternatives.filter(isAlternativeCompleted);
  const scorableAlternatives = alternatives.filter(
    (alt) => isAlternativeCompleted(alt) || hasAnyAlternativeEntry(alt),
  );

  const scoredCompletedCount = completedAlternatives.filter((alt) =>
    isScoreComplete(positioning.alternativeScores[alt.id]),
  ).length;

  const plottedAlternativesCount = scorableAlternatives.filter((alt) =>
    isScoreComplete(positioning.alternativeScores[alt.id]),
  ).length;

  const allCompletedScored =
    completedAlternatives.length >= 3 &&
    scoredCompletedCount === completedAlternatives.length;

  const mapVisible = axesDefined && (spiceBridgeScored || plottedAlternativesCount > 0);
  const positioningStatementUnlocked =
    mapVisible && spiceBridgeScored && allCompletedScored;

  return {
    axesDefined,
    spiceBridgeScored,
    scorableAlternatives,
    completedAlternatives,
    scoredCompletedCount,
    allCompletedScored,
    plottedAlternativesCount,
    mapVisible,
    positioningStatementUnlocked,
  };
}

export interface PlottedAlternativePoint {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
}

export interface QuadrantSummary {
  key: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  title: string;
  descriptor: string;
  totalCount: number;
  alternativeCount: number;
}

export interface PositioningMapAnalysis {
  closestAlternatives: Array<{ name: string; type: string; x: number; y: number; distance: number }>;
  clusters: Array<{ names: string[]; quadrantTitle: string; centerX: number; centerY: number }>;
  differentiation: {
    status: 'Differentiated' | 'Moderately differentiated' | 'Closely positioned' | 'Pending scores';
    detail: string;
  };
  lessCrowdedQuadrants: QuadrantSummary[];
  hasEmptyQuadrant: boolean;
}

const QUADRANT_SPLIT = 5.5;

function getQuadrantKey(
  x: number,
  y: number,
): 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' {
  if (x > QUADRANT_SPLIT && y > QUADRANT_SPLIT) return 'top-right';
  if (x <= QUADRANT_SPLIT && y > QUADRANT_SPLIT) return 'top-left';
  if (x > QUADRANT_SPLIT && y <= QUADRANT_SPLIT) return 'bottom-right';
  return 'bottom-left';
}

export function analyzePositioningMap(
  axes: PositioningAxes,
  spiceBridgePoint: { x: number; y: number } | null,
  scoredAlternatives: PlottedAlternativePoint[],
): PositioningMapAnalysis {
  const quadrantLabels: Record<QuadrantSummary['key'], { title: string; descriptor: string }> = {
    'top-right': {
      title: 'Top-Right Quadrant',
      descriptor: `${axes.xRightLabel} · ${axes.yTopLabel}`,
    },
    'top-left': {
      title: 'Top-Left Quadrant',
      descriptor: `${axes.xLeftLabel} · ${axes.yTopLabel}`,
    },
    'bottom-right': {
      title: 'Bottom-Right Quadrant',
      descriptor: `${axes.xRightLabel} · ${axes.yBottomLabel}`,
    },
    'bottom-left': {
      title: 'Bottom-Left Quadrant',
      descriptor: `${axes.xLeftLabel} · ${axes.yBottomLabel}`,
    },
  };

  // 1. Closest alternative(s) to SpiceBridge
  let closestAlternatives: PositioningMapAnalysis['closestAlternatives'] = [];
  if (spiceBridgePoint && scoredAlternatives.length > 0) {
    const withDist = scoredAlternatives.map((alt) => ({
      name: alt.name,
      type: alt.type,
      x: alt.x,
      y: alt.y,
      distance: Number(
        Math.hypot(alt.x - spiceBridgePoint.x, alt.y - spiceBridgePoint.y).toFixed(2),
      ),
    }));
    const minDist = Math.min(...withDist.map((item) => item.distance));
    closestAlternatives = withDist.filter(
      (item) => Math.abs(item.distance - minDist) < 0.01,
    );
  }

  // 2. Competitors clustered together (Euclidean distance <= 2.2)
  const CLUSTER_THRESHOLD = 2.2;
  const visited = new Set<number>();
  const clusters: PositioningMapAnalysis['clusters'] = [];

  for (let i = 0; i < scoredAlternatives.length; i++) {
    if (visited.has(i)) continue;
    const queue = [i];
    const component: number[] = [];
    visited.add(i);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      component.push(curr);
      for (let j = 0; j < scoredAlternatives.length; j++) {
        if (visited.has(j)) continue;
        const dist = Math.hypot(
          scoredAlternatives[curr].x - scoredAlternatives[j].x,
          scoredAlternatives[curr].y - scoredAlternatives[j].y,
        );
        if (dist <= CLUSTER_THRESHOLD) {
          visited.add(j);
          queue.push(j);
        }
      }
    }

    if (component.length >= 2) {
      const members = component.map((idx) => scoredAlternatives[idx]);
      const centerX = Number(
        (members.reduce((sum, m) => sum + m.x, 0) / members.length).toFixed(1),
      );
      const centerY = Number(
        (members.reduce((sum, m) => sum + m.y, 0) / members.length).toFixed(1),
      );
      const qKey = getQuadrantKey(centerX, centerY);
      clusters.push({
        names: members.map((m) => m.name),
        quadrantTitle: `${quadrantLabels[qKey].title} (${quadrantLabels[qKey].descriptor})`,
        centerX,
        centerY,
      });
    }
  }

  // 3. Differentiation check
  let differentiation: PositioningMapAnalysis['differentiation'];
  if (!spiceBridgePoint || scoredAlternatives.length === 0) {
    differentiation = {
      status: 'Pending scores',
      detail:
        'Assign scores to both SpiceBridge and your researched alternatives to evaluate spatial separation.',
    };
  } else {
    const minDist = closestAlternatives[0]?.distance ?? 0;
    const sbQuadrant = getQuadrantKey(spiceBridgePoint.x, spiceBridgePoint.y);
    const sameQuadrantCount = scoredAlternatives.filter(
      (alt) => getQuadrantKey(alt.x, alt.y) === sbQuadrant,
    ).length;

    if (minDist >= 2.5 || (sameQuadrantCount === 0 && minDist >= 1.8)) {
      differentiation = {
        status: 'Differentiated',
        detail:
          sameQuadrantCount === 0
            ? `SpiceBridge is the only plotted entity in the ${quadrantLabels[sbQuadrant].title} (${quadrantLabels[sbQuadrant].descriptor}) and sits ${minDist.toFixed(1)} scale units from the nearest alternative.`
            : `SpiceBridge is separated by ${minDist.toFixed(1)} scale units from the nearest alternative (${closestAlternatives.map((c) => c.name).join(', ')}).`,
      };
    } else if (minDist >= 1.5) {
      differentiation = {
        status: 'Moderately differentiated',
        detail: `SpiceBridge sits ${minDist.toFixed(1)} scale units from ${closestAlternatives.map((c) => c.name).join(', ')}, with ${sameQuadrantCount} alternative${sameQuadrantCount === 1 ? '' : 's'} in the same quadrant.`,
      };
    } else {
      differentiation = {
        status: 'Closely positioned',
        detail: `SpiceBridge is within ${minDist.toFixed(1)} scale units of ${closestAlternatives.map((c) => c.name).join(', ')}, indicating close overlap on these two dimensions.`,
      };
    }
  }

  // 4. Less-crowded quadrants
  const quadrantKeys: QuadrantSummary['key'][] = [
    'top-right',
    'top-left',
    'bottom-right',
    'bottom-left',
  ];

  const summaries: QuadrantSummary[] = quadrantKeys.map((key) => {
    const alternativeCount = scoredAlternatives.filter(
      (alt) => getQuadrantKey(alt.x, alt.y) === key,
    ).length;
    const hasSpiceBridge =
      spiceBridgePoint !== null && getQuadrantKey(spiceBridgePoint.x, spiceBridgePoint.y) === key;
    return {
      key,
      title: quadrantLabels[key].title,
      descriptor: quadrantLabels[key].descriptor,
      alternativeCount,
      totalCount: alternativeCount + (hasSpiceBridge ? 1 : 0),
    };
  });

  const emptyQuadrants = summaries.filter((q) => q.totalCount === 0);
  const minTotal = Math.min(...summaries.map((q) => q.totalCount));
  const lessCrowdedQuadrants =
    emptyQuadrants.length > 0
      ? emptyQuadrants
      : summaries.filter((q) => q.totalCount === minTotal);

  return {
    closestAlternatives,
    clusters,
    differentiation,
    lessCrowdedQuadrants,
    hasEmptyQuadrant: emptyQuadrants.length > 0,
  };
}

export function deriveDefaultTargetCustomer(lot: FarmerLot | undefined): string {
  if (!lot) {
    return 'Industrial spice grinding mills & B2B spice processors in Gujarat and Rajasthan';
  }
  return `Industrial spice grinding mills sourcing ${lot.cropLabel} (${lot.variety}) from ${lot.clusterGeography}`;
}

export function createInitialPositioningStatementState(
  lot: FarmerLot | undefined,
): PositioningStatementState {
  const targetCustomer = deriveDefaultTargetCustomer(lot);
  const initialState: PositioningStatementState = {
    targetCustomer,
    category: '',
    primaryBenefit: '',
    mainAlternativeId: '',
    reasonToBelieve: '',
    finalStatement: '',
    isManuallyEdited: false,
    savedAt: null,
  };
  initialState.finalStatement = composePositioningStatement(initialState, '');
  return initialState;
}

export function composePositioningStatement(
  state: Pick<
    PositioningStatementState,
    'targetCustomer' | 'category' | 'primaryBenefit' | 'reasonToBelieve'
  >,
  mainAlternativeName: string,
): string {
  const target = state.targetCustomer.trim() || '[Target Customer]';
  const category = state.category.trim() || '[Category / Type of Solution]';
  const benefit = state.primaryBenefit.trim() || '[Primary Benefit]';
  const alternative = mainAlternativeName.trim() || '[Main Alternative]';
  const rawReason = state.reasonToBelieve.trim().replace(/\.+$/, '');
  const reason = rawReason || '[Reason to Believe]';

  return `For ${target}, SpiceBridge is a ${category} that provides ${benefit}, unlike ${alternative}, because ${reason}.`;
}

export function isPositioningStatementComplete(
  state: PositioningStatementState,
  alternatives: CompetitorAlternative[],
): boolean {
  const altExists = alternatives.some(
    (alt) => alt.id === state.mainAlternativeId && alt.name.trim().length > 0,
  );
  return (
    state.targetCustomer.trim().length > 0 &&
    state.category.trim().length > 0 &&
    state.primaryBenefit.trim().length > 0 &&
    altExists &&
    state.reasonToBelieve.trim().length > 0 &&
    state.finalStatement.trim().length > 0
  );
}

export type PositioningRating = 'Strong' | 'Needs Improvement' | 'Weak';

export interface PositioningCheckDimension {
  key:
    | 'target-customer'
    | 'primary-benefit'
    | 'differentiation'
    | 'evidence-rtb'
    | 'map-consistency';
  title: string;
  rating: PositioningRating;
  explanation: string;
  improvementTip: string;
}

export interface PositioningEvaluationResult {
  dimensions: PositioningCheckDimension[];
  needsEvidence: boolean;
  assumptions: string[];
}

const COMMON_STOPWORDS = new Set([
  'with',
  'from',
  'that',
  'this',
  'they',
  'their',
  'them',
  'have',
  'more',
  'than',
  'only',
  'into',
  'over',
  'also',
  'will',
  'been',
  'were',
  'when',
  'what',
  'which',
  'where',
  'there',
  'through',
  'because',
  'unlike',
  'spicebridge',
  'provides',
  'provide',
  'using',
  'based',
  'direct',
  'better',
  'best',
  'high',
  'higher',
  'fast',
  'faster',
  'lower',
  'clear',
  'very',
  'real',
  'each',
  'every',
  'both',
  'most',
  'such',
]);

const UNVERIFIED_CAPABILITY_KEYWORDS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bblockchain\b/i, label: 'blockchain' },
  { pattern: /\bsatellite\b/i, label: 'satellite imaging/data' },
  { pattern: /\biots?\b|\bsensor\b/i, label: 'IoT sensor hardware' },
  { pattern: /\bfssai\b/i, label: 'FSSAI certification' },
  { pattern: /\biso\b|\biso-\d+/i, label: 'ISO certification' },
  { pattern: /\borganic\b/i, label: 'organic certification' },
  { pattern: /\bguarantee[ds]?\b/i, label: 'guaranteed outcome claim' },
  { pattern: /\bzero\s+(defect|waste|loss|middlemen)\b/i, label: 'zero-defect / absolute claim' },
  { pattern: /\b100%\b/i, label: '100% absolute claim' },
  { pattern: /\bai\b|\bmachine learning\b/i, label: 'AI / machine learning capability' },
  { pattern: /\bmobile app\b|\bsmartphone app\b/i, label: 'mobile app feature' },
  { pattern: /\bexport license\b|\bexporting\b/i, label: 'export capability' },
  { pattern: /\bwarehouse\b|\bcold storage\b/i, label: 'warehouse / cold storage infrastructure' },
  { pattern: /\bcredit\b|\bfinancing\b|\bloan\b/i, label: 'credit / financing capability' },
];

function tokenizeMeaningfulWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9.%₹-]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !COMMON_STOPWORDS.has(token));
}

export function evaluatePositioningStatement(params: {
  statement: PositioningStatementState;
  selectedLot: FarmerLot | undefined;
  lots: FarmerLot[];
  alternatives: CompetitorAlternative[];
  positioningState: PositioningMapState;
}): PositioningEvaluationResult {
  const { statement, selectedLot, lots, alternatives, positioningState } = params;

  const targetText = statement.targetCustomer.trim();
  const categoryText = statement.category.trim();
  const benefitText = statement.primaryBenefit.trim();
  const reasonText = statement.reasonToBelieve.trim();

  const mainAlt = alternatives.find(
    (alt) => alt.id === statement.mainAlternativeId && alt.name.trim().length > 0,
  );

  // Build corpus strictly from existing app data (Lot Profile, Competition Lab, Battlefield Map)
  const lotCorpusParts: string[] = [
    'spice',
    'fennel',
    'saunf',
    'cumin',
    'jeera',
    'mandi',
    'middlemen',
    'farm-gate',
    'assay',
    'assayed',
    'moisture',
    'purity',
    'foreign',
    'matter',
    'volatile',
    'oil',
    'aroma',
    'traceability',
    'spot',
    'pricing',
    'price',
    'transfer',
    'bank',
    'imps',
    'neft',
    '24h',
    '50',
    'kg',
    'bags',
    '9.0',
    '9%',
    'pass',
    'hold',
    're-dry',
    'grinding',
    'mills',
    'processors',
    'gujarat',
    'rajasthan',
    'unjha',
    'sirohi',
  ];

  for (const lot of lots) {
    lotCorpusParts.push(
      lot.id,
      lot.farmerName,
      lot.cropLabel,
      lot.variety,
      lot.clusterGeography,
      `${lot.moisturePercent}`,
      `${lot.purityPercent}`,
      lot.aromaGrade,
      lot.foreignMatterNote,
      `${lot.offeredPricePerKg}`,
      lot.mandiNetPricePerKg ? `${lot.mandiNetPricePerKg}` : '',
      lot.bankTransferStatus,
      lot.moistureNote,
    );
  }

  const competitionCorpusParts: string[] = [];
  for (const alt of alternatives) {
    competitionCorpusParts.push(
      alt.name,
      alt.type,
      alt.priceCost,
      alt.mainOffer,
      alt.mainStrength,
      alt.mainWeakness,
      alt.evidenceSource,
    );
  }

  const mapCorpusParts: string[] = [
    positioningState.axes.xName,
    positioningState.axes.xLeftLabel,
    positioningState.axes.xRightLabel,
    positioningState.axes.yName,
    positioningState.axes.yBottomLabel,
    positioningState.axes.yTopLabel,
  ];

  const fullAppCorpus = [
    ...lotCorpusParts,
    ...competitionCorpusParts,
    ...mapCorpusParts,
  ]
    .join(' ')
    .toLowerCase();

  // 1. Target Customer Clarity
  let targetDimension: PositioningCheckDimension;
  const targetWordCount = targetText ? targetText.split(/\s+/).length : 0;
  const genericTargetOnly =
    /^(farmers|customers|buyers|users|people|businesses|companies|mills|traders)$/i.test(
      targetText,
    );

  if (!targetText || targetWordCount < 2) {
    targetDimension = {
      key: 'target-customer',
      title: 'Target Customer Clarity',
      rating: 'Weak',
      explanation:
        'The target customer is missing or too short to identify a real segment.',
      improvementTip:
        'Name the specific buyer or supply-chain stakeholder (e.g., spice grinding mills or processors sourcing a specific crop/cluster).',
    };
  } else if (genericTargetOnly || targetWordCount < 4) {
    targetDimension = {
      key: 'target-customer',
      title: 'Target Customer Clarity',
      rating: 'Needs Improvement',
      explanation: `"${targetText}" is broad and does not specify crop, geography, or sourcing profile.`,
      improvementTip:
        'Narrow the segment with stored context such as crop (Fennel/Cumin), region (Unjha/Sirohi), or processing requirement.',
    };
  } else {
    targetDimension = {
      key: 'target-customer',
      title: 'Target Customer Clarity',
      rating: 'Strong',
      explanation:
        'Defines a specific target customer segment with actionable sourcing context.',
      improvementTip:
        'Confirm that this buyer profile matches the primary alternative you selected.',
    };
  }

  // 2. Primary Benefit Clarity
  let benefitDimension: PositioningCheckDimension;
  const benefitWordCount = benefitText ? benefitText.split(/\s+/).length : 0;
  const vagueBenefitOnly =
    /^(better quality|good service|best solution|more value|save money|faster service|better prices?)$/i.test(
      benefitText,
    );

  if (!benefitText || benefitWordCount < 3) {
    benefitDimension = {
      key: 'primary-benefit',
      title: 'Primary Benefit Clarity',
      rating: 'Weak',
      explanation:
        'Primary benefit is missing or too brief to show a concrete customer outcome.',
      improvementTip:
        'State one clear, verifiable outcome (for example, pre-assayed < 9% moisture lots or transparent spot pricing vs. mandi deductions).',
    };
  } else if (vagueBenefitOnly || benefitWordCount > 28) {
    benefitDimension = {
      key: 'primary-benefit',
      title: 'Primary Benefit Clarity',
      rating: 'Needs Improvement',
      explanation: vagueBenefitOnly
        ? `"${benefitText}" is generic and does not explain what concretely improves for the customer.`
        : 'The benefit packs in too many phrases at once, diluting the single primary takeaway.',
      improvementTip:
        'Focus on one concrete, measurable operational improvement grounded in your Lot Profile or Battlefield Map.',
    };
  } else {
    benefitDimension = {
      key: 'primary-benefit',
      title: 'Primary Benefit Clarity',
      rating: 'Strong',
      explanation:
        'States a clear, concrete customer benefit rather than vague filler.',
      improvementTip:
        'Ensure the claimed benefit directly solves a weakness documented for your Main Alternative.',
    };
  }

  // 3. Differentiation
  let diffDimension: PositioningCheckDimension;
  const sbScore = positioningState.spiceBridgeScore;
  const altScore = mainAlt ? positioningState.alternativeScores[mainAlt.id] : undefined;
  const bothScored = isScoreComplete(sbScore) && isScoreComplete(altScore);
  const mapDistance = bothScored
    ? Math.hypot(sbScore.x! - altScore!.x!, sbScore.y! - altScore!.y!)
    : null;

  if (!mainAlt) {
    diffDimension = {
      key: 'differentiation',
      title: 'Differentiation',
      rating: 'Weak',
      explanation:
        'No Main Alternative from the Competitor Matrix has been selected yet.',
      improvementTip:
        'Select one competing alternative from your Competitor Matrix to anchor your differentiation.',
    };
  } else {
    const weaknessTokens = tokenizeMeaningfulWords(mainAlt.mainWeakness);
    const statementTokens = new Set(
      tokenizeMeaningfulWords(`${categoryText} ${benefitText} ${reasonText}`),
    );
    const addressesWeakness = weaknessTokens.some((tok) =>
      statementTokens.has(tok),
    );

    if (mapDistance !== null && mapDistance < 1.5) {
      diffDimension = {
        key: 'differentiation',
        title: 'Differentiation',
        rating: 'Weak',
        explanation: `On your Battlefield Map, SpiceBridge sits only ${mapDistance.toFixed(1)} scale units from ${mainAlt.name}, indicating close overlap.`,
        improvementTip: `Clarify how SpiceBridge meaningfully separates itself from ${mainAlt.name}'s offer (${mainAlt.mainOffer || 'entered offer'}) or review your positioning.`,
      };
    } else if (!categoryText || (!addressesWeakness && (mapDistance === null || mapDistance < 2.2))) {
      diffDimension = {
        key: 'differentiation',
        title: 'Differentiation',
        rating: 'Needs Improvement',
        explanation: `Compared against ${mainAlt.name}, the statement does not yet clearly contrast against their documented weakness ("${mainAlt.mainWeakness}").`,
        improvementTip: `Sharpen your Category or Primary Benefit so it directly addresses ${mainAlt.name}'s gap.`,
      };
    } else {
      diffDimension = {
        key: 'differentiation',
        title: 'Differentiation',
        rating: 'Strong',
        explanation: `Contrasts SpiceBridge clearly against ${mainAlt.name}${mapDistance !== null ? ` (${mapDistance.toFixed(1)} scale units apart on your Battlefield Map)` : ''}.`,
        improvementTip:
          'Verify that the target customer actually values this difference over switching costs.',
      };
    }
  }

  // 4. Evidence / Reason to Believe + IMPORTANT EVIDENCE RULE (Assumption Detection)
  const assumptions: string[] = [];

  for (const check of UNVERIFIED_CAPABILITY_KEYWORDS) {
    const appearsInStatement =
      check.pattern.test(reasonText) || check.pattern.test(benefitText);
    const appearsInApp = check.pattern.test(fullAppCorpus);
    if (appearsInStatement && !appearsInApp) {
      assumptions.push(
        `Claimed "${check.label}" does not appear in your Lot Profile, Competition Lab research, or Battlefield Map.`,
      );
    }
  }

  // Check numeric/percentage claims entered in Reason to Believe against stored app numbers
  const numberMatches = reasonText.match(/\b\d+(?:\.\d+)?%?/g) ?? [];
  for (const numToken of numberMatches) {
    const cleanNum = numToken.replace('%', '');
    if (!fullAppCorpus.includes(cleanNum.toLowerCase())) {
      assumptions.push(
        `Numeric claim "${numToken}" in Reason to Believe is not found in your stored Lot Profile or Competition Lab evidence.`,
      );
    }
  }

  const rtbTokens = tokenizeMeaningfulWords(reasonText);
  const matchedAppTokens = rtbTokens.filter((tok) => fullAppCorpus.includes(tok));

  let needsEvidence = false;
  let evidenceDimension: PositioningCheckDimension;

  if (!reasonText) {
    needsEvidence = true;
    evidenceDimension = {
      key: 'evidence-rtb',
      title: 'Evidence / Reason to Believe',
      rating: 'Weak',
      explanation:
        'No Reason to Believe has been entered yet to substantiate the claimed benefit.',
      improvementTip:
        'Ground your Reason to Believe in actual lot assay rules (< 9.0% moisture, purity %), spot pricing, 24h transfer, or verified Competition Lab evidence.',
    };
  } else if (assumptions.length > 0) {
    needsEvidence = true;
    evidenceDimension = {
      key: 'evidence-rtb',
      title: 'Evidence / Reason to Believe',
      rating: 'Weak',
      explanation:
        'Your Reason to Believe includes claims or numbers not backed by data currently entered in the app.',
      improvementTip:
        'Remove unsupported assumptions or add verifiable sources in Competition Lab / Lot Profile before relying on this claim.',
    };
  } else if (matchedAppTokens.length === 0 || reasonText.split(/\s+/).length < 4) {
    needsEvidence = true;
    assumptions.push(
      'Reason to Believe does not reference concrete capabilities, metrics, or competitor evidence stored in the app.',
    );
    evidenceDimension = {
      key: 'evidence-rtb',
      title: 'Evidence / Reason to Believe',
      rating: 'Weak',
      explanation:
        'The stated Reason to Believe is too general and lacks traceable links to your Lot Profile or Competition Lab records.',
      improvementTip:
        selectedLot
          ? `Cite actual stored data—for example, ${selectedLot.id}'s ${selectedLot.moisturePercent.toFixed(1)}% moisture (< 9.0% threshold), ${selectedLot.purityPercent.toFixed(1)}% purity, or documented competitor gaps.`
          : 'Cite concrete metrics from your Lot Profile or sources from your Competition Lab.',
    };
  } else if (mainAlt && mainAlt.evidenceQuality === 'Weak') {
    needsEvidence = true;
    assumptions.push(
      `Selected alternative "${mainAlt.name}" has Weak evidence quality in your Competitor Matrix (${mainAlt.evidenceSource || 'unvalidated note'}).`,
    );
    evidenceDimension = {
      key: 'evidence-rtb',
      title: 'Evidence / Reason to Believe',
      rating: 'Needs Improvement',
      explanation: `Your Reason to Believe connects to stored facts, but the evidence supporting ${mainAlt.name} in your Competitor Matrix is rated Weak.`,
      improvementTip: `Strengthen your source for ${mainAlt.name} in Competition Lab with a price board, quote note, or verified observation.`,
    };
  } else if (mainAlt && mainAlt.evidenceQuality === 'Moderate') {
    evidenceDimension = {
      key: 'evidence-rtb',
      title: 'Evidence / Reason to Believe',
      rating: 'Needs Improvement',
      explanation: `Grounded in stored app data (${matchedAppTokens.slice(0, 3).join(', ')}), though ${mainAlt.name}'s competitor evidence is rated Moderate (indirect or incomplete).`,
      improvementTip:
        'Where possible, upgrade indirect competitor evidence to direct primary sources.',
    };
  } else {
    evidenceDimension = {
      key: 'evidence-rtb',
      title: 'Evidence / Reason to Believe',
      rating: 'Strong',
      explanation:
        'Supported by verifiable lot/assay facts and Strong competitor research already stored in the app.',
      improvementTip:
        'Keep lot assay records and competitor sources up to date as new harvests arrive.',
    };
  }

  // 5. Consistency with the Positioning Map
  let mapDimension: PositioningCheckDimension;
  const xAxisName = positioningState.axes.xName.trim();
  const yAxisName = positioningState.axes.yName.trim();

  if (!xAxisName || !yAxisName || !mainAlt || !bothScored) {
    mapDimension = {
      key: 'map-consistency',
      title: 'Consistency with the Positioning Map',
      rating: 'Needs Improvement',
      explanation: !mainAlt
        ? 'Select a Main Alternative to compare statement claims against your Market Battlefield Map.'
        : `Both SpiceBridge and ${mainAlt.name} must have scores on ${xAxisName || 'X-axis'} and ${yAxisName || 'Y-axis'} to check consistency.`,
      improvementTip:
        'Ensure your selected Main Alternative is scored on the Market Battlefield Map.',
    };
  } else {
    const xDiff = sbScore.x! - altScore!.x!;
    const yDiff = sbScore.y! - altScore!.y!;

    const leadsOnX = xDiff > 0;
    const leadsOnY = yDiff > 0;
    const axisTokens = tokenizeMeaningfulWords(
      `${xAxisName} ${positioningState.axes.xRightLabel} ${yAxisName} ${positioningState.axes.yTopLabel}`,
    );
    const statementText = `${categoryText} ${benefitText} ${reasonText}`.toLowerCase();
    const mentionsAxisTheme = axisTokens.some((tok) => statementText.includes(tok));

    if (!leadsOnX && !leadsOnY) {
      mapDimension = {
        key: 'map-consistency',
        title: 'Consistency with the Positioning Map',
        rating: 'Weak',
        explanation: `On your Battlefield Map, SpiceBridge (${sbScore.x}, ${sbScore.y}) does not outscore ${mainAlt.name} (${altScore!.x}, ${altScore!.y}) on either "${xAxisName}" or "${yAxisName}".`,
        improvementTip: `Align your statement's differentiation with a dimension where SpiceBridge genuinely outperforms ${mainAlt.name}, or revisit your map scores.`,
      };
    } else if (!mentionsAxisTheme) {
      const leadAxes: string[] = [];
      if (leadsOnX) leadAxes.push(`${xAxisName} (+${xDiff})`);
      if (leadsOnY) leadAxes.push(`${yAxisName} (+${yDiff})`);

      mapDimension = {
        key: 'map-consistency',
        title: 'Consistency with the Positioning Map',
        rating: 'Needs Improvement',
        explanation: `SpiceBridge leads ${mainAlt.name} on ${leadAxes.join(' and ')}, but your Benefit / Reason to Believe does not clearly echo those map dimensions.`,
        improvementTip: `Reference the customer value behind ${leadAxes.join(' / ')} directly in your Primary Benefit or Reason to Believe.`,
      };
    } else {
      const leadAxes: string[] = [];
      if (leadsOnX) leadAxes.push(`${xAxisName}: ${sbScore.x} vs ${altScore!.x}`);
      if (leadsOnY) leadAxes.push(`${yAxisName}: ${sbScore.y} vs ${altScore!.y}`);

      mapDimension = {
        key: 'map-consistency',
        title: 'Consistency with the Positioning Map',
        rating: 'Strong',
        explanation: `Consistent with your Battlefield Map, where SpiceBridge leads ${mainAlt.name} on ${leadAxes.join(' and ')}.`,
        improvementTip:
          'Your verbal positioning matches your visual map coordinates.',
      };
    }
  }

  return {
    dimensions: [
      targetDimension,
      benefitDimension,
      diffDimension,
      evidenceDimension,
      mapDimension,
    ],
    needsEvidence,
    assumptions,
  };
}

export function createInitialAIChallengeState(): AIChallengeState {
  return {
    questions: [],
    responses: ['', '', ''],
    feedbacks: [null, null, null],
    currentIndex: 0,
    finalReview: null,
    completedAt: null,
  };
}

export function isAIChallengeComplete(state: AIChallengeState): boolean {
  return (
    state.questions.length === 3 &&
    state.responses.length >= 3 &&
    state.responses.slice(0, 3).every((r) => r.trim().length > 0) &&
    state.feedbacks.length >= 3 &&
    state.feedbacks.slice(0, 3).every((fb) => fb !== null) &&
    state.finalReview !== null &&
    Boolean(state.completedAt)
  );
}

export function buildStrategyChallengePayload(params: {
  selectedLot: FarmerLot | undefined;
  lots: FarmerLot[];
  alternatives: CompetitorAlternative[];
  positioningState: PositioningMapState;
  statementState: PositioningStatementState;
}) {
  const { selectedLot, lots, alternatives, positioningState, statementState } =
    params;

  const enteredAlternatives = alternatives.filter(hasAnyAlternativeEntry);
  const mainAlt = alternatives.find((a) => a.id === statementState.mainAlternativeId);

  return {
    ventureMission:
      'Eliminate mandi middlemen through transparent farm-gate quality grading, fair spot pricing, and direct-to-processor traceability.',
    selectedLot: selectedLot
      ? {
          id: selectedLot.id,
          farmerName: selectedLot.farmerName,
          cropLabel: selectedLot.cropLabel,
          variety: selectedLot.variety,
          clusterGeography: selectedLot.clusterGeography,
          quantityKg: selectedLot.quantityKg,
          bagCount: selectedLot.bagCount,
          moisturePercent: selectedLot.moisturePercent,
          moistureNote: selectedLot.moistureNote,
          qualityStatus: selectedLot.qualityStatus,
          purityPercent: selectedLot.purityPercent,
          foreignMatterNote: selectedLot.foreignMatterNote,
          aromaGrade: selectedLot.aromaGrade,
          offeredPricePerKg: selectedLot.offeredPricePerKg,
          mandiNetPricePerKg: selectedLot.mandiNetPricePerKg,
          priceNote: selectedLot.priceNote,
          bankTransferStatus: selectedLot.bankTransferStatus,
        }
      : null,
    lotBankSummary: {
      totalLots: lots.length,
      passLots: lots.filter((l) => l.qualityStatus === 'pass').length,
      holdLots: lots.filter((l) => l.qualityStatus === 'hold').length,
      clusters: Array.from(new Set(lots.map((l) => l.clusterGeography))),
      crops: Array.from(new Set(lots.map((l) => l.cropLabel))),
    },
    alternatives: enteredAlternatives.map((alt) => ({
      name: alt.name.trim() || 'Unnamed Alternative',
      type: alt.type || 'Unclassified',
      priceCost: alt.priceNotApplicable
        ? 'Not applicable'
        : alt.priceCost.trim() || 'Evidence required',
      mainOffer: alt.mainOffer.trim() || 'Evidence required',
      mainStrength: alt.mainStrength.trim() || 'Evidence required',
      mainWeakness: alt.mainWeakness.trim() || 'Evidence required',
      evidenceSource: alt.evidenceSource.trim() || 'Evidence required',
      evidenceQuality: alt.evidenceQuality || 'Not set',
    })),
    battlefieldMap: {
      xAxisName: positioningState.axes.xName.trim(),
      xLeftLabel: positioningState.axes.xLeftLabel.trim(),
      xRightLabel: positioningState.axes.xRightLabel.trim(),
      yAxisName: positioningState.axes.yName.trim(),
      yBottomLabel: positioningState.axes.yBottomLabel.trim(),
      yTopLabel: positioningState.axes.yTopLabel.trim(),
      spiceBridgeScore: positioningState.spiceBridgeScore,
      alternativeScores: enteredAlternatives.map((alt) => {
        const s = positioningState.alternativeScores[alt.id];
        return {
          name: alt.name.trim() || 'Unnamed Alternative',
          type: alt.type || 'Unclassified',
          x: s?.x ?? null,
          y: s?.y ?? null,
        };
      }),
    },
    positioningStatement: {
      targetCustomer: statementState.targetCustomer.trim(),
      category: statementState.category.trim(),
      primaryBenefit: statementState.primaryBenefit.trim(),
      mainAlternativeName: mainAlt?.name.trim() || '',
      reasonToBelieve: statementState.reasonToBelieve.trim(),
      finalStatement: statementState.finalStatement.trim(),
    },
  };
}
