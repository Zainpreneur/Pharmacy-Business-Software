import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, apiErrorMessage } from "../api/client";
import { StatCard } from "../components/StatCard";

const currency = (n: number) => `$${n.toFixed(2)}`;

interface SalesReport {
  totalRevenue: number;
  totalOrders: number;
  byDay: { date: string; revenue: number; orders: number; itemsSold: number }[];
}

interface TopMedicine {
  medicineId: number;
  name: string;
  quantitySold: number;
  revenue: number;
}

interface InventoryRow {
  medicineId: number;
  name: string;
  category: string;
  stock: number;
  reorderLevel: number;
  costValue: number;
  retailValue: number;
}

interface ExpiryBatch {
  id: number;
  batchNo: string;
  quantity: number;
  expiryDate: string;
  medicine: { name: string };
}

const BRAND = "#128c66"; // brand-600 — single-series magnitude, from the app's teal palette

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export function Reports() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [topMedicines, setTopMedicines] = useState<TopMedicine[]>([]);
  const [inventory, setInventory] = useState<{ rows: InventoryRow[]; totals: { costValue: number; retailValue: number } } | null>(null);
  const [expiry, setExpiry] = useState<ExpiryBatch[]>([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const params = { from, to };
      const [salesRes, topRes, invRes, expRes] = await Promise.all([
        api.get("/reports/sales", { params }),
        api.get("/reports/top-medicines", { params }),
        api.get("/reports/inventory"),
        api.get("/reports/expiry", { params: { days: 90 } }),
      ]);
      setSalesReport(salesRes.data);
      setTopMedicines(topRes.data);
      setInventory(invRes.data);
      setExpiry(expRes.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Reports</h1>
          <p className="text-sm text-slate-500">Sales performance, inventory value, and expiry tracking</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="btn-secondary" onClick={load}>
            Apply
          </button>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      {salesReport && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Revenue (range)" value={currency(salesReport.totalRevenue)} />
          <StatCard label="Orders (range)" value={String(salesReport.totalOrders)} />
          {inventory && <StatCard label="Inventory Cost Value" value={currency(inventory.totals.costValue)} />}
          {inventory && <StatCard label="Inventory Retail Value" value={currency(inventory.totals.retailValue)} />}
        </div>
      )}

      <div className="card p-4">
        <h2 className="mb-3 font-semibold text-slate-800">Revenue by Day</h2>
        {salesReport && salesReport.byDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salesReport.byDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} width={60} />
              <Tooltip
                formatter={(value: number) => currency(value)}
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Bar dataKey="revenue" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400">No sales in this date range.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 font-semibold text-slate-800">Top Selling Medicines</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Qty Sold</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topMedicines.map((m) => (
                <tr key={m.medicineId}>
                  <td className="font-medium text-slate-800">{m.name}</td>
                  <td>{m.quantitySold}</td>
                  <td>{currency(m.revenue)}</td>
                </tr>
              ))}
              {topMedicines.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-slate-400">
                    No data for this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-semibold text-slate-800">Expiring Within 90 Days</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Batch</th>
                <th>Qty</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {expiry.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium text-slate-800">{b.medicine.name}</td>
                  <td>{b.batchNo}</td>
                  <td>{b.quantity}</td>
                  <td>{new Date(b.expiryDate).toLocaleDateString()}</td>
                </tr>
              ))}
              {expiry.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400">
                    Nothing expiring soon.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="mb-3 font-semibold text-slate-800">Inventory Valuation</h2>
        <div className="max-h-96 overflow-y-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Reorder Level</th>
                <th>Cost Value</th>
                <th>Retail Value</th>
              </tr>
            </thead>
            <tbody>
              {inventory?.rows.map((r) => (
                <tr key={r.medicineId}>
                  <td className="font-medium text-slate-800">{r.name}</td>
                  <td>{r.category}</td>
                  <td>
                    <span className={`badge ${r.stock <= r.reorderLevel ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                      {r.stock}
                    </span>
                  </td>
                  <td>{r.reorderLevel}</td>
                  <td>{currency(r.costValue)}</td>
                  <td>{currency(r.retailValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
