import { FarmerLot, MillOrder, ProcessingBatch } from '../../types/spicebridge';
import { formatINR } from '../../utils/formatters';

interface ExecutiveKpiBarProps {
  lots: FarmerLot[];
  batches: ProcessingBatch[];
  millOrders: MillOrder[];
}

export function ExecutiveKpiBar({
  lots,
  batches,
  millOrders,
}: ExecutiveKpiBarProps) {
  const totalProcuredKg = lots.reduce((sum, lot) => sum + lot.quantityKg, 0);
  const totalProcuredMt = totalProcuredKg / 1000;
  const passProcuredMt =
    lots
      .filter((lot) => lot.qualityStatus === 'pass')
      .reduce((sum, lot) => sum + lot.quantityKg, 0) / 1000;

  const activeReceivableOrders = millOrders.filter(
    (order) => order.settlementStatus !== 'settled',
  );
  const activeReceivablesAmount = activeReceivableOrders.reduce(
    (sum, order) => sum + order.grossInvoiceAmount,
    0,
  );

  const settledOrders = millOrders.filter(
    (order) => order.settlementStatus === 'settled',
  );
  const settledAmount = settledOrders.reduce(
    (sum, order) => sum + order.grossInvoiceAmount,
    0,
  );

  const totalNetContribution = millOrders.reduce(
    (sum, order) => sum + order.netContribution,
    0,
  );
  const settledContribution = settledOrders.reduce(
    (sum, order) => sum + order.netContribution,
    0,
  );

  const dispatchedMt =
    millOrders.reduce((sum, order) => sum + order.totalKg, 0) / 1000;

  return (
    <section
      aria-label="Executive B2B Operations KPI Bar"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-xs font-medium text-slate-500">Total MT Procured</p>
        <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
          {totalProcuredMt.toFixed(2)} MT
        </p>
        <p className="mt-1 text-xs text-slate-500 tabular-nums">
          {passProcuredMt.toFixed(2)} MT Pass · {batches.length} batches ·{' '}
          {dispatchedMt.toFixed(2)} MT sold
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-xs font-medium text-slate-500">
          Active Mill Receivables (14-Day)
        </p>
        <p className="mt-1.5 font-mono text-2xl font-semibold text-turmeric-600 tabular-nums">
          {formatINR(activeReceivablesAmount)}
        </p>
        <p className="mt-1 text-xs text-slate-500 tabular-nums">
          {activeReceivableOrders.length} open{' '}
          {activeReceivableOrders.length === 1 ? 'invoice' : 'invoices'} on 14-day terms
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-xs font-medium text-slate-500">
          Net Monthly Contribution
        </p>
        <p className="mt-1.5 font-mono text-2xl font-semibold text-forest-700 tabular-nums">
          +{formatINR(totalNetContribution)}
        </p>
        <p className="mt-1 text-xs text-slate-500 tabular-nums">
          {formatINR(settledContribution)} realized · {millOrders.length}{' '}
          {millOrders.length === 1 ? 'mill order' : 'mill orders'}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-xs font-medium text-slate-500">
          Settled Mill Collections
        </p>
        <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
          {formatINR(settledAmount)}
        </p>
        <p className="mt-1 text-xs text-slate-500 tabular-nums">
          {settledOrders.length} of {millOrders.length} invoices settled (₹200/kg)
        </p>
      </div>
    </section>
  );
}
