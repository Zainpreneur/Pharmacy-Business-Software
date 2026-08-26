import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import type { Sale } from "../types";

const currency = (n: number) => `$${n.toFixed(2)}`;

export function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await api.get("/sales", { params: { from: from || undefined, to: to || undefined } });
      setSales(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Sales History</h1>
        <p className="text-sm text-slate-500">Browse and filter past transactions</p>
      </div>

      {error && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="btn-secondary" onClick={load}>
          Filter
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Cashier</th>
              <th>Items</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td className="font-medium text-slate-800">
                  <Link to={`/sales/${s.id}`} className="text-brand-600 hover:underline">
                    {s.invoiceNo}
                  </Link>
                </td>
                <td>{s.customer?.name || "Walk-in"}</td>
                <td>{s.user?.name}</td>
                <td>{s.items.length}</td>
                <td>{s.paymentMethod}</td>
                <td>{currency(s.totalAmount)}</td>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">
                  No sales found for this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
