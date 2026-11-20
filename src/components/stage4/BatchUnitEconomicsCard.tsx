import { Building2, CalendarClock, IndianRupee, TrendingUp } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { INDUSTRIAL_MILLS } from '../../data/seedLots';
import { MillOrder, ProcessingBatch } from '../../types/spicebridge';
import {
  BATCH_TARGET_KG,
  BATCH_VARIABLE_COST_PER_KG,
  INVOICE_SETTLEMENT_DAYS,
  MILL_SELLING_PRICE_PER_KG,
  NET_CONTRIBUTION_PER_KG,
  addDaysIso,
  calculateMillEconomics,
  formatDateShort,
  formatINR,
  formatNumberIN,
} from '../../utils/formatters';

interface BatchUnitEconomicsCardProps {
  selectedBatch: ProcessingBatch | undefined;
  nextOrderId: string;
  onAssignMillOrder: (order: MillOrder) => void;
}

export function BatchUnitEconomicsCard({
  selectedBatch,
  nextOrderId,
  onAssignMillOrder,
}: BatchUnitEconomicsCardProps) {
  const [selectedMillId, setSelectedMillId] = useState<string>(
    INDUSTRIAL_MILLS[0].id,
  );

  // Show exact selected batch economics, or standard 3,000 kg (3 MT) benchmark preview
  const previewKg = selectedBatch ? selectedBatch.totalKg : BATCH_TARGET_KG;
  const economics = calculateMillEconomics(previewKg);
  const standard3MtEconomics = calculateMillEconomics(BATCH_TARGET_KG);

  const selectedMill =
    INDUSTRIAL_MILLS.find((m) => m.id === selectedMillId) ?? INDUSTRIAL_MILLS[0];

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedBatch || selectedBatch.status !== 'cleaned') return;

    const invoicedAt = new Date().toISOString();
    const dueDate = addDaysIso(invoicedAt, INVOICE_SETTLEMENT_DAYS);

    const newOrder: MillOrder = {
      id: nextOrderId,
      batchId: selectedBatch.id,
      millId: selectedMill.id,
      millName: selectedMill.name,
      millLocation: selectedMill.location,
      cropSummary: selectedBatch.cropSummary,
      totalKg: selectedBatch.totalKg,
      pricePerKg: MILL_SELLING_PRICE_PER_KG,
      grossInvoiceAmount: economics.grossRevenue,
      variableCost: economics.variableCost,
      netContribution: economics.netContribution,
      settlementStatus: 'invoiced_14d',
      invoicedAt,
      dueDate,
    };

    onAssignMillOrder(newOrder);
  };

  return (
    <aside
      aria-label="Batch Unit Economics and Mill Assignment"
      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      {/* Card Header */}
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-forest-700">
              B2B Mill Dispatch &amp; Unit Economics
            </p>
            <div className="mt-1 flex items-center gap-2.5">
              <h2 className="font-display text-lg font-bold text-slate-900">
                {selectedBatch ? `Assign ${selectedBatch.id}` : '3 MT Batch Unit Economics'}
              </h2>
              {selectedBatch && (
                <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-xs font-semibold text-forest-800 tabular-nums">
                  {formatNumberIN(selectedBatch.totalKg)} kg (
                  {(selectedBatch.totalKg / 1000).toFixed(2)} MT)
                </span>
              )}
            </div>
          </div>

          <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
            Contract Rate: {formatINR(MILL_SELLING_PRICE_PER_KG)}/kg
          </span>
        </div>

        <p className="mt-1.5 text-xs text-slate-500">
          {selectedBatch
            ? `${selectedBatch.cropSummary} · ${selectedBatch.hubLine} · Ready for direct industrial mill contract`
            : 'Showing standard 3,000 kg (3 MT) benchmark economics. Select a completed batch on the left to dispatch.'}
        </p>
      </div>

      {/* Unit Economics Breakdown */}
      <div className="border-b border-slate-200 px-6 py-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-bold text-slate-900">
            Batch Unit Economics ({formatNumberIN(previewKg)} kg)
          </h3>
          <span className="font-mono text-xs font-medium text-slate-500 tabular-nums">
            {economics.marginPercent.toFixed(1)}% contribution margin
          </span>
        </div>

        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-semibold text-slate-900">
                Mill Contract Revenue ({formatINR(MILL_SELLING_PRICE_PER_KG)}/kg)
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                {formatNumberIN(previewKg)} kg × {formatINR(MILL_SELLING_PRICE_PER_KG)}/kg
                {previewKg !== BATCH_TARGET_KG &&
                  ` (3 MT std: ${formatINR(standard3MtEconomics.grossRevenue)})`}
              </p>
            </div>
            <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
              {formatINR(economics.grossRevenue)}
            </span>
          </div>

          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-slate-800">
                Total Variable Cost ({formatINR(BATCH_VARIABLE_COST_PER_KG)}/kg)
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                Farm-gate procurement ({formatINR(economics.procurementCostShare)}) +
                Hub cleaning &amp; freight ({formatINR(economics.cleaningLogisticsCostShare)})
              </p>
            </div>
            <span className="font-mono text-sm font-semibold text-slate-700 tabular-nums">
              −{formatINR(economics.variableCost)}
            </span>
          </div>

          <div className="flex items-center justify-between bg-emerald-50/70 px-4 py-3.5">
            <div className="flex items-start gap-2.5">
              <TrendingUp
                className="mt-0.5 h-4 w-4 shrink-0 text-forest-700"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-bold text-forest-900">
                  Net Batch Contribution ({formatINR(NET_CONTRIBUTION_PER_KG)}/kg)
                </p>
                <p className="text-xs text-forest-800 tabular-nums">
                  Standard 3 MT benchmark: {formatINR(standard3MtEconomics.grossRevenue)} −{' '}
                  {formatINR(standard3MtEconomics.variableCost)} ={' '}
                  {formatINR(standard3MtEconomics.netContribution)}
                </p>
              </div>
            </div>
            <span className="font-mono text-lg font-bold text-forest-700 tabular-nums">
              +{formatINR(economics.netContribution)}
            </span>
          </div>
        </div>
      </div>

      {/* Industrial Mill Selection & 14-Day Terms Assignment Form */}
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <div>
          <label
            htmlFor="millSelector"
            className="block text-xs font-semibold text-slate-700"
          >
            Select Industrial Spice Grinding Mill
          </label>
          <div className="relative mt-1.5">
            <Building2
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <select
              id="millSelector"
              value={selectedMillId}
              onChange={(e) => setSelectedMillId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:border-forest-600 focus:outline-none"
            >
              {INDUSTRIAL_MILLS.map((mill) => (
                <option key={mill.id} value={mill.id}>
                  {mill.name} — {mill.location}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Specialty: {selectedMill.specialty}
          </p>
        </div>

        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200/80 bg-turmeric-50/70 px-3.5 py-3 text-xs text-slate-700">
          <CalendarClock
            className="mt-0.5 h-4 w-4 shrink-0 text-turmeric-600"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold text-slate-900">
              14-Day Invoice Settlement Terms ({nextOrderId})
            </p>
            <p className="mt-0.5 text-slate-600 tabular-nums">
              Invoice issued at dispatch ({formatINR(economics.grossRevenue)}), due{' '}
              {formatDateShort(
                addDaysIso(new Date().toISOString(), INVOICE_SETTLEMENT_DAYS),
              )}{' '}
              (Net {INVOICE_SETTLEMENT_DAYS} days).
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={!selectedBatch}
          className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            selectedBatch
              ? 'bg-forest-700 text-white hover:bg-forest-800 shadow-xs cursor-pointer'
              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
          }`}
        >
          <IndianRupee className="h-4 w-4" aria-hidden="true" />
          <span>
            {selectedBatch
              ? `Assign ${selectedBatch.id} & Issue Mill Invoice (${nextOrderId})`
              : 'Select a Completed Batch to Issue Invoice'}
          </span>
        </button>
      </form>
    </aside>
  );
}
