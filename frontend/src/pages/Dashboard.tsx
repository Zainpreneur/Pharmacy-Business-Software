import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import { StatCard } from "../components/StatCard";
import type { DashboardData } from "../types";

const currency = (n: number) => `$${n.toFixed(2)}`;
const dateFmt = (d: string) => new Date(d).toLocaleDateString();

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/dashboard")
      .then((res) => setData(res.data))
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  if (error) return <div className="rounded-md bg-red-50 px-4 py-3 text-red-600">{error}</div>;
  if (!data) return <div className="text-slate-400">Loading dashboard…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of today's pharmacy operations</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Today's Revenue" value={currency(data.todayRevenue)} hint={`${data.todayOrders} orders`} />
        <StatCard label="This Month" value={currency(data.monthRevenue)} hint={`${data.monthOrders} orders`} />
        <StatCard label="Inventory Value" value={currency(data.inventoryValue)} hint={`${data.totalMedicines} medicines`} />
        <StatCard
          label="Low Stock Items"
          value={String(data.lowStockCount)}
          tone={data.lowStockCount > 0 ? "warning" : "default"}
          hint="At or below reorder level"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Low Stock Alerts</h2>
            <Link to="/medicines" className="text-xs font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {data.lowStockItems.length === 0 ? (
            <p className="text-sm text-slate-400">All stock levels are healthy.</p>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Stock</th>
                  <th>Reorder Level</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStockItems.map((m) => (
                  <tr key={m.id}>
                    <td className="font-medium text-slate-800">{m.name}</td>
                    <td>
                      <span className="badge bg-amber-100 text-amber-700">{m.stock}</span>
                    </td>
                    <td>{m.reorderLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Expiring Soon (30 days)</h2>
            <Link to="/reports" className="text-xs font-medium text-brand-600 hover:underline">
              View report
            </Link>
          </div>
          {data.expiringBatches.length === 0 ? (
            <p className="text-sm text-slate-400">No batches expiring soon.</p>
          ) : (
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
                {data.expiringBatches.map((b) => (
                  <tr key={b.id}>
                    <td className="font-medium text-slate-800">{b.medicine?.name}</td>
                    <td>{b.batchNo}</td>
                    <td>{b.quantity}</td>
                    <td>
                      <span className="badge bg-red-100 text-red-700">{dateFmt(b.expiryDate)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Recent Sales</h2>
          <Link to="/sales" className="text-xs font-medium text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        {data.recentSales.length === 0 ? (
          <p className="text-sm text-slate-400">No sales yet. Head to Point of Sale to get started.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Cashier</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentSales.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium text-slate-800">
                    <Link to={`/sales/${s.id}`} className="text-brand-600 hover:underline">
                      {s.invoiceNo}
                    </Link>
                  </td>
                  <td>{s.customer?.name || "Walk-in"}</td>
                  <td>{s.user?.name}</td>
                  <td>{currency(s.totalAmount)}</td>
                  <td>{new Date(s.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
