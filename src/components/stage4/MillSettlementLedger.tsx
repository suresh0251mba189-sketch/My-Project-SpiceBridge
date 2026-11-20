import { CheckCircle2, Clock, Landmark, Trash2 } from 'lucide-react';
import { MillOrder, SettlementStatus } from '../../types/spicebridge';
import {
  formatDateShort,
  formatINR,
  formatNumberIN,
  getDaysRemaining,
} from '../../utils/formatters';

interface MillSettlementLedgerProps {
  orders: MillOrder[];
  onUpdateSettlementStatus: (orderId: string, status: SettlementStatus) => void;
  onRemoveOrder: (orderId: string) => void;
}

const SETTLEMENT_OPTIONS: { value: SettlementStatus; label: string }[] = [
  { value: 'invoiced_14d', label: 'Invoiced (14-Day Net)' },
  { value: 'clearing', label: 'NEFT / Escrow Clearing' },
  { value: 'settled', label: 'Settled (Paid)' },
];

export function MillSettlementLedger({
  orders,
  onUpdateSettlementStatus,
  onRemoveOrder,
}: MillSettlementLedgerProps) {
  return (
    <section
      aria-label="B2B Mill Orders and 14-Day Invoice Settlement Ledger"
      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
            B2B Mill Orders &amp; 14-Day Invoice Settlement Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track assigned mill contracts at ₹200/kg, unit economics, and 14-day invoice
            settlement status
          </p>
        </div>
        <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
          {orders.length} {orders.length === 1 ? 'mill order' : 'mill orders'}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-900">
            No B2B mill orders assigned yet
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            Select a cleaned 3 MT batch above and assign it to an industrial grinding mill
            to generate a 14-day settlement invoice and track net contribution.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 pl-6 pr-4 whitespace-nowrap">Invoice &amp; Batch</th>
                <th className="py-3 px-4 whitespace-nowrap">Industrial Mill Buyer</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">
                  Volume &amp; Contract
                </th>
                <th className="py-3 px-4 text-right whitespace-nowrap">
                  Variable Cost vs. Contribution
                </th>
                <th className="py-3 px-4 whitespace-nowrap">14-Day Due Window</th>
                <th className="py-3 px-4 whitespace-nowrap">Settlement Status</th>
                <th className="py-3 pl-4 pr-6 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-sm">
              {orders.map((order) => {
                const isSettled = order.settlementStatus === 'settled';
                const isClearing = order.settlementStatus === 'clearing';
                const daysLeft = getDaysRemaining(order.dueDate);

                return (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pl-6 pr-4 align-top">
                      <div className="font-mono text-xs font-bold text-forest-700 tabular-nums">
                        {order.id}
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-slate-600">
                        Batch: {order.batchId}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {order.cropSummary}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top">
                      <div className="text-xs font-semibold text-slate-900">
                        {order.millName}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {order.millLocation}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right align-top">
                      <div className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                        {formatINR(order.grossInvoiceAmount)}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                        {formatNumberIN(order.totalKg)} kg @ {formatINR(order.pricePerKg)}/kg
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right align-top">
                      <div className="font-mono text-xs font-bold text-forest-700 tabular-nums">
                        +{formatINR(order.netContribution)} net
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                        Cost: {formatINR(order.variableCost)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top">
                      <div className="text-xs font-medium text-slate-800 tabular-nums">
                        Due {formatDateShort(order.dueDate)}
                      </div>
                      <div
                        className={`mt-0.5 text-[11px] font-medium tabular-nums ${
                          isSettled ? 'text-forest-700' : 'text-amber-700'
                        }`}
                      >
                        {isSettled
                          ? 'Invoice paid in full'
                          : `${daysLeft} days left (Net 14d)`}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top">
                      <div className="inline-flex items-center gap-1.5">
                        {isSettled ? (
                          <CheckCircle2
                            className="h-3.5 w-3.5 text-forest-700 shrink-0"
                            aria-hidden="true"
                          />
                        ) : isClearing ? (
                          <Landmark
                            className="h-3.5 w-3.5 text-turmeric-600 shrink-0"
                            aria-hidden="true"
                          />
                        ) : (
                          <Clock
                            className="h-3.5 w-3.5 text-amber-600 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        <select
                          aria-label={`Settlement status for ${order.id}`}
                          value={order.settlementStatus}
                          onChange={(e) =>
                            onUpdateSettlementStatus(
                              order.id,
                              e.target.value as SettlementStatus,
                            )
                          }
                          className={`rounded-md border px-2 py-1 text-xs font-semibold focus:outline-none cursor-pointer ${
                            isSettled
                              ? 'border-emerald-200 bg-emerald-50 text-forest-800'
                              : isClearing
                                ? 'border-amber-200 bg-amber-50 text-amber-800'
                                : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          {SETTLEMENT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    <td className="py-3.5 pl-4 pr-6 text-right align-top">
                      <button
                        type="button"
                        onClick={() => onRemoveOrder(order.id)}
                        title={`Cancel ${order.id} and release ${order.batchId}`}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Recall</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
