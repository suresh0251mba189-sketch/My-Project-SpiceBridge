import {
  AIChallengeState,
  AppView,
  CompetitorAlternative,
  FarmerLot,
  MillOrder,
  PositioningMapState,
  PositioningStatementState,
  ProcessingBatch,
  StageId,
  TraceabilityPassportRecord,
} from '../types/spicebridge';
import {
  DAILY_HUB_BOTTLENECK_BATCHES,
  computeBatchOriginBreakdown,
  computePostCleanLabPurity,
  generatePassportHash,
} from '../utils/formatters';

function clampString(value: unknown, maxLen: number, fallback = ''): string {
  const str = typeof value === 'string' ? value : fallback;
  return str.slice(0, maxLen);
}

function sanitizeId(value: string, fallback: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
  return cleaned.length > 0 ? cleaned : fallback;
}

export interface DbFarmerLotRow {
  lot_id: string;
  farmer_name: string;
  crop: 'Fennel' | 'Cumin';
  crop_label: string;
  variety: string;
  cluster_geography: string;
  quantity_kg: number;
  bags_50kg: number;
  moisture_pct: number;
  moisture_note: string;
  purity_pct: number;
  foreign_matter_note: string;
  aroma_grade: string;
  offered_price_per_kg: number;
  mandi_price_per_kg: number | null;
  price_note: string;
  bank_transfer_status: string;
  assay_status: 'pass' | 'hold';
  assayed_at: string;
}

export interface DbMicroHubBatchRow {
  batch_id: string;
  crop: string;
  total_kg: number;
  source_lot_ids: string[];
  cleaning_hours: number;
  bottleneck_utilisation_pct: number;
  status: 'queued' | 'cleaning' | 'cleaned';
  hub_line: string;
  shift_schedule: string;
  is_mixed_crop: boolean;
  total_bags: number;
  fill_percent: number;
  batch_equivalent: number;
  weighted_moisture: number;
  weighted_purity: number;
  created_at_iso: string;
}

export interface DbMillOrderRow {
  order_id: string;
  batch_id: string;
  mill_id: string;
  mill_name: string;
  mill_location: string;
  crop_summary: string;
  quantity_kg: number;
  price_per_kg: number;
  revenue_inr: number;
  variable_cost_inr: number;
  contribution_inr: number;
  settlement_status: 'invoiced_14d' | 'clearing' | 'settled';
  invoiced_at: string;
  due_date: string;
}

export interface DbStrategyStateRow {
  competitors_list: CompetitorAlternative[];
  positioning_axes: PositioningMapState['axes'];
  positioning_scores: {
    spiceBridgeScore: PositioningMapState['spiceBridgeScore'];
    alternativeScores: PositioningMapState['alternativeScores'];
  };
  positioning_statement: PositioningStatementState;
  strategy_challenge_history: AIChallengeState;
  selected_lot_id: string;
  active_stage_id: StageId;
  active_view: AppView;
}

export function deriveTraceabilityPassports(
  batches: ProcessingBatch[],
  lots: FarmerLot[],
): TraceabilityPassportRecord[] {
  return batches.map((batch) => {
    const origin = computeBatchOriginBreakdown(batch.lotIds, lots);
    const postCleanPurity = computePostCleanLabPurity(batch.weightedPurity);
    const passportHash = generatePassportHash(
      `${batch.id}-${batch.lotIds.join(',')}`,
    );
    const passportId = sanitizeId(`PASS-${batch.id}`, `PASS-${batch.id}`);
    const clusterSummary =
      origin.clusters.length > 0
        ? origin.clusters
            .map(
              (c) =>
                `${c.clusterKey} (${Math.round(c.farmerPercent)}% farmers / ${Math.round(c.weightPercent)}% wt)`,
            )
            .join('; ')
        : 'Pending cluster mapping';

    const complianceStatus =
      batch.weightedMoisture < 9.0 && postCleanPurity >= 99.0
        ? 'FSSAI & APMC Compliant (Pass)'
        : 'Pending Verification';

    const qrPayload = clampString(
      JSON.stringify({
        passportId,
        batchId: batch.id,
        hash: passportHash,
        crop: batch.cropSummary,
        totalKg: batch.totalKg,
        moisturePct: Number(batch.weightedMoisture.toFixed(2)),
        purityPct: postCleanPurity,
        compliance: complianceStatus,
      }),
      1000,
    );

    return {
      passport_id: passportId,
      batch_id: sanitizeId(batch.id, batch.id),
      qr_payload: qrPayload,
      cluster_breakdown: clampString(clusterSummary, 500, 'Pending'),
      composite_moisture_pct: Number(batch.weightedMoisture.toFixed(2)),
      purity_pct: postCleanPurity,
      compliance_status: clampString(complianceStatus, 120),
    };
  });
}

export function toDbFarmerLot(lot: FarmerLot): DbFarmerLotRow {
  return {
    lot_id: sanitizeId(lot.id, 'SB-100'),
    farmer_name: clampString(lot.farmerName.trim() || 'Unknown Farmer', 120),
    crop: lot.crop === 'Cumin' ? 'Cumin' : 'Fennel',
    crop_label: clampString(lot.cropLabel || lot.crop, 80),
    variety: clampString(lot.variety || 'Standard', 120),
    cluster_geography: clampString(lot.clusterGeography || 'Gujarat/Rajasthan', 160),
    quantity_kg: Math.max(0, Number(lot.quantityKg) || 0),
    bags_50kg: Math.max(0, Number(lot.bagCount) || 0),
    moisture_pct: Math.max(0, Number(lot.moisturePercent) || 0),
    moisture_note: clampString(lot.moistureNote, 160),
    purity_pct: Math.max(0, Number(lot.purityPercent) || 0),
    foreign_matter_note: clampString(lot.foreignMatterNote, 160),
    aroma_grade: clampString(lot.aromaGrade || 'Standard', 120),
    offered_price_per_kg: Math.max(0, Number(lot.offeredPricePerKg) || 0),
    mandi_price_per_kg:
      lot.mandiNetPricePerKg === null
        ? null
        : Math.max(0, Number(lot.mandiNetPricePerKg) || 0),
    price_note: clampString(lot.priceNote, 160),
    bank_transfer_status: clampString(lot.bankTransferStatus, 180),
    assay_status: lot.qualityStatus === 'hold' ? 'hold' : 'pass',
    assayed_at: clampString(lot.assayedAt || new Date().toISOString(), 64),
  };
}

export function fromDbFarmerLot(row: Record<string, unknown>): FarmerLot {
  const crop: 'Fennel' | 'Cumin' = row.crop === 'Cumin' ? 'Cumin' : 'Fennel';
  return {
    id: String(row.lot_id ?? ''),
    farmerName: String(row.farmer_name ?? ''),
    crop,
    cropLabel: String(
      row.crop_label ?? (crop === 'Cumin' ? 'Cumin (Jeera)' : 'Fennel (Saunf)'),
    ),
    variety: String(row.variety ?? ''),
    clusterGeography: String(row.cluster_geography ?? ''),
    quantityKg: Number(row.quantity_kg ?? 0),
    bagCount: Number(row.bags_50kg ?? 0),
    moisturePercent: Number(row.moisture_pct ?? 0),
    moistureNote: String(row.moisture_note ?? ''),
    qualityStatus: row.assay_status === 'hold' ? 'hold' : 'pass',
    purityPercent: Number(row.purity_pct ?? 0),
    foreignMatterNote: String(row.foreign_matter_note ?? ''),
    aromaGrade: String(row.aroma_grade ?? ''),
    offeredPricePerKg: Number(row.offered_price_per_kg ?? 0),
    mandiNetPricePerKg:
      row.mandi_price_per_kg === null || row.mandi_price_per_kg === undefined
        ? null
        : Number(row.mandi_price_per_kg),
    priceNote: String(row.price_note ?? ''),
    bankTransferStatus: String(row.bank_transfer_status ?? ''),
    assayedAt: String(row.assayed_at ?? new Date().toISOString()),
  };
}

export function toDbBatch(batch: ProcessingBatch): DbMicroHubBatchRow {
  const bottleneckPct = Number(
    ((batch.batchEquivalent / DAILY_HUB_BOTTLENECK_BATCHES) * 100).toFixed(1),
  );
  return {
    batch_id: sanitizeId(batch.id, 'SB-B01'),
    crop: clampString(batch.cropSummary || 'Fennel (Saunf)', 80),
    total_kg: Math.max(0, Number(batch.totalKg) || 0),
    source_lot_ids: batch.lotIds.slice(0, 50).map((id) => sanitizeId(id, id)),
    cleaning_hours: Math.max(0, Number(batch.cleaningHours) || 0),
    bottleneck_utilisation_pct: Math.max(0, bottleneckPct),
    status:
      batch.status === 'cleaned' || batch.status === 'cleaning'
        ? batch.status
        : 'queued',
    hub_line: clampString(batch.hubLine || 'Unjha Line 1', 120),
    shift_schedule: clampString(batch.shiftSchedule || 'Today (Shift 1)', 64),
    is_mixed_crop: Boolean(batch.isMixedCrop),
    total_bags: Math.max(0, Number(batch.totalBags) || 0),
    fill_percent: Math.max(0, Number(batch.fillPercent) || 0),
    batch_equivalent: Math.max(0, Number(batch.batchEquivalent) || 0),
    weighted_moisture: Math.max(0, Number(batch.weightedMoisture) || 0),
    weighted_purity: Math.max(0, Number(batch.weightedPurity) || 0),
    created_at_iso: clampString(batch.createdAt || new Date().toISOString(), 64),
  };
}

export function fromDbBatch(row: Record<string, unknown>): ProcessingBatch {
  const statusRaw = row.status;
  const status: ProcessingBatch['status'] =
    statusRaw === 'cleaned' || statusRaw === 'cleaning' ? statusRaw : 'queued';
  const shiftRaw = row.shift_schedule;
  const shiftSchedule: ProcessingBatch['shiftSchedule'] =
    shiftRaw === 'Tomorrow (Shift 2)' ? 'Tomorrow (Shift 2)' : 'Today (Shift 1)';
  let createdAt = new Date().toISOString();
  if (typeof row.created_at_iso === 'string') {
    createdAt = row.created_at_iso;
  } else if (typeof row.created_at === 'string') {
    createdAt = row.created_at;
  } else if (
    row.created_at &&
    typeof (row.created_at as { toDate?: () => Date }).toDate === 'function'
  ) {
    createdAt = (row.created_at as { toDate: () => Date }).toDate().toISOString();
  }

  return {
    id: String(row.batch_id ?? ''),
    hubLine: String(row.hub_line ?? 'Unjha Line 1'),
    shiftSchedule,
    lotIds: Array.isArray(row.source_lot_ids)
      ? row.source_lot_ids.map(String)
      : [],
    cropSummary: String(row.crop ?? ''),
    isMixedCrop: Boolean(row.is_mixed_crop),
    totalKg: Number(row.total_kg ?? 0),
    totalBags: Number(row.total_bags ?? 0),
    fillPercent: Number(row.fill_percent ?? 0),
    cleaningHours: Number(row.cleaning_hours ?? 0),
    batchEquivalent: Number(row.batch_equivalent ?? 0),
    weightedMoisture: Number(row.weighted_moisture ?? 0),
    weightedPurity: Number(row.weighted_purity ?? 0),
    status,
    createdAt,
  };
}

export function toDbMillOrder(order: MillOrder): DbMillOrderRow {
  return {
    order_id: sanitizeId(order.id, 'SB-INV-01'),
    batch_id: sanitizeId(order.batchId, 'SB-B01'),
    mill_id: clampString(order.millId || 'MILL-01', 64),
    mill_name: clampString(order.millName || 'Industrial Spice Mill', 160),
    mill_location: clampString(order.millLocation || 'Gujarat', 160),
    crop_summary: clampString(order.cropSummary || 'Fennel (Saunf)', 80),
    quantity_kg: Math.max(0, Number(order.totalKg) || 0),
    price_per_kg: Math.max(0, Number(order.pricePerKg) || 0),
    revenue_inr: Math.max(0, Number(order.grossInvoiceAmount) || 0),
    variable_cost_inr: Math.max(0, Number(order.variableCost) || 0),
    contribution_inr: Number(order.netContribution) || 0,
    settlement_status:
      order.settlementStatus === 'settled' || order.settlementStatus === 'clearing'
        ? order.settlementStatus
        : 'invoiced_14d',
    invoiced_at: clampString(order.invoicedAt || new Date().toISOString(), 64),
    due_date: clampString(order.dueDate || new Date().toISOString(), 64),
  };
}

export function fromDbMillOrder(row: Record<string, unknown>): MillOrder {
  const rawStatus = row.settlement_status;
  const settlementStatus: MillOrder['settlementStatus'] =
    rawStatus === 'settled' || rawStatus === 'clearing'
      ? rawStatus
      : 'invoiced_14d';

  return {
    id: String(row.order_id ?? ''),
    batchId: String(row.batch_id ?? ''),
    millId: String(row.mill_id ?? ''),
    millName: String(row.mill_name ?? ''),
    millLocation: String(row.mill_location ?? ''),
    cropSummary: String(row.crop_summary ?? ''),
    totalKg: Number(row.quantity_kg ?? 0),
    pricePerKg: Number(row.price_per_kg ?? 0),
    grossInvoiceAmount: Number(row.revenue_inr ?? 0),
    variableCost: Number(row.variable_cost_inr ?? 0),
    netContribution: Number(row.contribution_inr ?? 0),
    settlementStatus,
    invoicedAt: String(row.invoiced_at ?? new Date().toISOString()),
    dueDate: String(row.due_date ?? new Date().toISOString()),
  };
}
