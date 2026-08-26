import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import type { Sale } from "../types";

const currency = (n: number) => `$${n.toFixed(2)}`;

export function SaleDetail() {
  const { id } = useParams();
  const [sale, setSale] = useState<Sale | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/sales/${id}`)
      .then((res) => setSale(res.data))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [id]);

  if (error) return <div className="rounded-md bg-red-50 px-4 py-3 text-red-600">{error}</div>;
  if (!sale) return <div className="text-slate-400">Loading…</div>;

  return (
    <div className="space-y-4">
      <Link to="/sales" className="text-sm text-brand-600 hover:underline">
        ← Back to Sales History
      </Link>
      <div className="card p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Invoice {sale.invoiceNo}</h1>
            <p className="text-sm text-slate-500">{new Date(sale.createdAt).toLocaleString()}</p>
          </div>
          <span className="badge bg-brand-50 text-brand-700">{sale.paymentMethod}</span>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Customer</p>
            <p className="font-medium text-slate-800">{sale.customer?.name || "Walk-in Customer"}</p>
          </div>
          <div>
            <p className="text-slate-400">Cashier</p>
            <p className="font-medium text-slate-800">{sale.user?.name}</p>
          </div>
        </div>

        <table className="table-base">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Batch</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id}>
                <td className="font-medium text-slate-800">{item.medicine?.name}</td>
                <td>{item.batch?.batchNo}</td>
                <td>{item.quantity}</td>
                <td>{currency(item.unitPrice)}</td>
                <td>{currency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>{currency(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Discount</span>
            <span>-{currency(sale.discount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tax</span>
            <span>{currency(sale.tax)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-bold text-slate-900">
            <span>Total</span>
            <span>{currency(sale.totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
