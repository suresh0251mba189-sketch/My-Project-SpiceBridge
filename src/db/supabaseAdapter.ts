import {
  SpiceBridgeWorkspaceSnapshot,
  SupabaseConnectionConfig,
} from '../types/spicebridge';
import { CloudPullResult } from './firestoreAdapter';
import {
  deriveTraceabilityPassports,
  fromDbBatch,
  fromDbFarmerLot,
  fromDbMillOrder,
  toDbBatch,
  toDbFarmerLot,
  toDbMillOrder,
} from './recordMappers';

export const SUPABASE_SCHEMA_SQL = `-- Run in Supabase SQL Editor to create the 5 SpiceBridge tables
create table if not exists farmer_lots (
  lot_id text primary key,
  farmer_name text not null,
  crop text not null,
  crop_label text not null,
  variety text not null,
  cluster_geography text not null,
  quantity_kg numeric not null,
  bags_50kg numeric not null,
  moisture_pct numeric not null,
  moisture_note text not null,
  purity_pct numeric not null,
  foreign_matter_note text not null,
  aroma_grade text not null,
  offered_price_per_kg numeric not null,
  mandi_price_per_kg numeric,
  price_note text not null,
  bank_transfer_status text not null,
  assay_status text not null,
  assayed_at text not null,
  updated_at timestamptz not null default now()
);

create table if not exists micro_hub_batches (
  batch_id text primary key,
  crop text not null,
  total_kg numeric not null,
  source_lot_ids jsonb not null,
  cleaning_hours numeric not null,
  bottleneck_utilisation_pct numeric not null,
  status text not null,
  hub_line text not null,
  shift_schedule text not null,
  is_mixed_crop boolean not null,
  total_bags numeric not null,
  fill_percent numeric not null,
  batch_equivalent numeric not null,
  weighted_moisture numeric not null,
  weighted_purity numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists traceability_passports (
  passport_id text primary key,
  batch_id text not null,
  qr_payload text not null,
  cluster_breakdown text not null,
  composite_moisture_pct numeric not null,
  purity_pct numeric not null,
  compliance_status text not null,
  updated_at timestamptz not null default now()
);

create table if not exists mill_orders (
  order_id text primary key,
  batch_id text not null,
  mill_id text not null,
  mill_name text not null,
  mill_location text not null,
  crop_summary text not null,
  quantity_kg numeric not null,
  price_per_kg numeric not null,
  revenue_inr numeric not null,
  variable_cost_inr numeric not null,
  contribution_inr numeric not null,
  settlement_status text not null,
  invoiced_at text not null,
  due_date text not null,
  updated_at timestamptz not null default now()
);

create table if not exists strategy_state (
  id text primary key,
  competitors_list jsonb not null,
  positioning_axes jsonb not null,
  positioning_scores jsonb not null,
  positioning_statement jsonb not null,
  strategy_challenge_history jsonb not null,
  selected_lot_id text not null,
  active_stage_id text not null,
  active_view text not null,
  updated_at timestamptz not null default now()
);`;

function buildHeaders(anonKey: string, extra?: Record<string, string>): HeadersInit {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export async function testSupabaseConnection(
  config: SupabaseConnectionConfig,
): Promise<{ reachable: boolean; message: string }> {
  const baseUrl = normalizeUrl(config.url);
  const anonKey = config.anonKey.trim();
  if (!baseUrl || !anonKey) {
    return {
      reachable: false,
      message: 'Supabase Project URL and Public Anon Key are required.',
    };
  }

  const res = await fetch(`${baseUrl}/rest/v1/farmer_lots?select=lot_id&limit=1`, {
    method: 'GET',
    headers: buildHeaders(anonKey),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Supabase responded with HTTP ${res.status}: ${body || res.statusText}`,
    );
  }

  return {
    reachable: true,
    message: 'Supabase PostgreSQL REST endpoint connected.',
  };
}

export async function pullWorkspaceFromSupabase(
  config: SupabaseConnectionConfig,
): Promise<CloudPullResult> {
  const baseUrl = normalizeUrl(config.url);
  const anonKey = config.anonKey.trim();
  const headers = buildHeaders(anonKey);

  const [lotsRes, batchesRes, ordersRes, strategyRes] = await Promise.all([
    fetch(`${baseUrl}/rest/v1/farmer_lots?select=*`, { headers }),
    fetch(`${baseUrl}/rest/v1/micro_hub_batches?select=*`, { headers }),
    fetch(`${baseUrl}/rest/v1/mill_orders?select=*`, { headers }),
    fetch(`${baseUrl}/rest/v1/strategy_state?id=eq.active&select=*`, { headers }),
  ]);

  if (!lotsRes.ok) {
    throw new Error(`Supabase farmer_lots read failed (${lotsRes.status}).`);
  }

  const lotsRows = (await lotsRes.json()) as Array<Record<string, unknown>>;
  const batchesRows = batchesRes.ok
    ? ((await batchesRes.json()) as Array<Record<string, unknown>>)
    : [];
  const ordersRows = ordersRes.ok
    ? ((await ordersRes.json()) as Array<Record<string, unknown>>)
    : [];
  const strategyRows = strategyRes.ok
    ? ((await strategyRes.json()) as Array<Record<string, unknown>>)
    : [];

  let maxUpdatedMs = 0;
  const snapshot: Partial<SpiceBridgeWorkspaceSnapshot> = {};

  if (lotsRows.length > 0) {
    snapshot.lots = lotsRows.map((row) => {
      if (typeof row.updated_at === 'string') {
        maxUpdatedMs = Math.max(maxUpdatedMs, Date.parse(row.updated_at) || 0);
      }
      return fromDbFarmerLot(row);
    });
  }

  if (batchesRows.length > 0) {
    snapshot.batches = batchesRows.map((row) => {
      if (typeof row.created_at === 'string') {
        maxUpdatedMs = Math.max(maxUpdatedMs, Date.parse(row.created_at) || 0);
      }
      return fromDbBatch(row);
    });
  }

  if (ordersRows.length > 0) {
    snapshot.millOrders = ordersRows.map((row) => {
      if (typeof row.updated_at === 'string') {
        maxUpdatedMs = Math.max(maxUpdatedMs, Date.parse(row.updated_at) || 0);
      }
      return fromDbMillOrder(row);
    });
  }

  if (strategyRows.length > 0) {
    const row = strategyRows[0];
    if (typeof row.updated_at === 'string') {
      maxUpdatedMs = Math.max(maxUpdatedMs, Date.parse(row.updated_at) || 0);
    }
    if (Array.isArray(row.competitors_list)) {
      snapshot.alternatives = row.competitors_list as SpiceBridgeWorkspaceSnapshot['alternatives'];
    }
    if (row.positioning_axes && row.positioning_scores) {
      const scores = row.positioning_scores as {
        spiceBridgeScore?: SpiceBridgeWorkspaceSnapshot['positioningState']['spiceBridgeScore'];
        alternativeScores?: SpiceBridgeWorkspaceSnapshot['positioningState']['alternativeScores'];
      };
      snapshot.positioningState = {
        axes: row.positioning_axes as SpiceBridgeWorkspaceSnapshot['positioningState']['axes'],
        spiceBridgeScore: scores.spiceBridgeScore ?? { x: null, y: null },
        alternativeScores: scores.alternativeScores ?? {},
      };
    }
    if (row.positioning_statement) {
      snapshot.positioningStatement =
        row.positioning_statement as SpiceBridgeWorkspaceSnapshot['positioningStatement'];
    }
    if (row.strategy_challenge_history) {
      snapshot.aiChallengeState =
        row.strategy_challenge_history as SpiceBridgeWorkspaceSnapshot['aiChallengeState'];
    }
    if (typeof row.selected_lot_id === 'string' && row.selected_lot_id) {
      snapshot.selectedLotId = row.selected_lot_id;
    }
    if (typeof row.active_stage_id === 'string') {
      snapshot.activeStageId =
        row.active_stage_id as SpiceBridgeWorkspaceSnapshot['activeStageId'];
    }
    if (typeof row.active_view === 'string') {
      snapshot.activeView =
        row.active_view as SpiceBridgeWorkspaceSnapshot['activeView'];
    }
  }

  const hasRemoteData = Boolean(
    lotsRows.length > 0 ||
      batchesRows.length > 0 ||
      ordersRows.length > 0 ||
      strategyRows.length > 0,
  );

  return {
    hasRemoteData,
    snapshot,
    remoteUpdatedAtMs: maxUpdatedMs,
  };
}

export async function pushWorkspaceToSupabase(
  config: SupabaseConnectionConfig,
  workspace: SpiceBridgeWorkspaceSnapshot,
): Promise<void> {
  const baseUrl = normalizeUrl(config.url);
  const anonKey = config.anonKey.trim();
  const upsertHeaders = buildHeaders(anonKey, {
    Prefer: 'resolution=merge-duplicates',
  });
  const nowIso = new Date().toISOString();

  const lotRows = workspace.lots.map((lot) => ({
    ...toDbFarmerLot(lot),
    updated_at: nowIso,
  }));
  if (lotRows.length > 0) {
    const res = await fetch(`${baseUrl}/rest/v1/farmer_lots?on_conflict=lot_id`, {
      method: 'POST',
      headers: upsertHeaders,
      body: JSON.stringify(lotRows),
    });
    if (!res.ok) {
      throw new Error(`Supabase farmer_lots upsert failed (${res.status}).`);
    }
  }

  const batchRows = workspace.batches.map((b) => {
    const mapped = toDbBatch(b);
    return {
      batch_id: mapped.batch_id,
      crop: mapped.crop,
      total_kg: mapped.total_kg,
      source_lot_ids: mapped.source_lot_ids,
      cleaning_hours: mapped.cleaning_hours,
      bottleneck_utilisation_pct: mapped.bottleneck_utilisation_pct,
      status: mapped.status,
      hub_line: mapped.hub_line,
      shift_schedule: mapped.shift_schedule,
      is_mixed_crop: mapped.is_mixed_crop,
      total_bags: mapped.total_bags,
      fill_percent: mapped.fill_percent,
      batch_equivalent: mapped.batch_equivalent,
      weighted_moisture: mapped.weighted_moisture,
      weighted_purity: mapped.weighted_purity,
      created_at: mapped.created_at_iso,
    };
  });
  if (batchRows.length > 0) {
    const res = await fetch(
      `${baseUrl}/rest/v1/micro_hub_batches?on_conflict=batch_id`,
      {
        method: 'POST',
        headers: upsertHeaders,
        body: JSON.stringify(batchRows),
      },
    );
    if (!res.ok) {
      throw new Error(`Supabase micro_hub_batches upsert failed (${res.status}).`);
    }
  }

  const passportRows = deriveTraceabilityPassports(
    workspace.batches,
    workspace.lots,
  ).map((p) => ({ ...p, updated_at: nowIso }));
  if (passportRows.length > 0) {
    const res = await fetch(
      `${baseUrl}/rest/v1/traceability_passports?on_conflict=passport_id`,
      {
        method: 'POST',
        headers: upsertHeaders,
        body: JSON.stringify(passportRows),
      },
    );
    if (!res.ok) {
      throw new Error(
        `Supabase traceability_passports upsert failed (${res.status}).`,
      );
    }
  }

  const orderRows = workspace.millOrders.map((o) => ({
    ...toDbMillOrder(o),
    updated_at: nowIso,
  }));
  if (orderRows.length > 0) {
    const res = await fetch(`${baseUrl}/rest/v1/mill_orders?on_conflict=order_id`, {
      method: 'POST',
      headers: upsertHeaders,
      body: JSON.stringify(orderRows),
    });
    if (!res.ok) {
      throw new Error(`Supabase mill_orders upsert failed (${res.status}).`);
    }
  }

  const strategyRes = await fetch(
    `${baseUrl}/rest/v1/strategy_state?on_conflict=id`,
    {
      method: 'POST',
      headers: upsertHeaders,
      body: JSON.stringify([
        {
          id: 'active',
          competitors_list: workspace.alternatives.slice(0, 6),
          positioning_axes: workspace.positioningState.axes,
          positioning_scores: {
            spiceBridgeScore: workspace.positioningState.spiceBridgeScore,
            alternativeScores: workspace.positioningState.alternativeScores,
          },
          positioning_statement: workspace.positioningStatement,
          strategy_challenge_history: workspace.aiChallengeState,
          selected_lot_id: workspace.selectedLotId,
          active_stage_id: workspace.activeStageId,
          active_view: workspace.activeView,
          updated_at: nowIso,
        },
      ]),
    },
  );
  if (!strategyRes.ok) {
    throw new Error(`Supabase strategy_state upsert failed (${strategyRes.status}).`);
  }
}
