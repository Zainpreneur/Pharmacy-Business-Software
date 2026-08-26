import { FormEvent, useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Modal } from "../components/Modal";
import type { Medicine, Purchase, Supplier } from "../types";

const currency = (n: number) => `$${n.toFixed(2)}`;

interface LineItem {
  medicineId: string;
  batchNo: string;
  quantity: string;
  purchasePrice: string;
  sellingPrice: string;
  expiryDate: string;
}

function emptyLine(): LineItem {
  return { medicineId: "", batchNo: "", quantity: "1", purchasePrice: "0", sellingPrice: "0", expiryDate: "" };
}

export function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [pRes, sRes, mRes] = await Promise.all([
        api.get("/purchases"),
        api.get("/suppliers"),
        api.get("/medicines"),
      ]);
      setPurchases(pRes.data);
      setSuppliers(sRes.data);
      setMedicines(mRes.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setSupplierId("");
    setLines([emptyLine()]);
    setShowForm(true);
  }

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function onMedicineSelect(index: number, medicineId: string) {
    const medicine = medicines.find((m) => String(m.id) === medicineId);
    updateLine(index, {
      medicineId,
      purchasePrice: medicine ? String(medicine.purchasePrice) : "0",
      sellingPrice: medicine ? String(medicine.sellingPrice) : "0",
    });
  }

  const total = lines.reduce((sum, l) => sum + Number(l.quantity || 0) * Number(l.purchasePrice || 0), 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!supplierId) return setError("Please select a supplier");
    if (lines.some((l) => !l.medicineId || !l.batchNo || !l.expiryDate)) {
      return setError("Please complete all line items (medicine, batch number, expiry date)");
    }
    setSaving(true);
    try {
      await api.post("/purchases", {
        supplierId: Number(supplierId),
        items: lines.map((l) => ({
          medicineId: Number(l.medicineId),
          batchNo: l.batchNo,
          quantity: Number(l.quantity),
          purchasePrice: Number(l.purchasePrice),
          sellingPrice: Number(l.sellingPrice),
          expiryDate: l.expiryDate,
        })),
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Purchases</h1>
          <p className="text-sm text-slate-500">Stock-in from suppliers, tracked by batch and expiry</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          + New Purchase
        </button>
      </div>

      {error && !showForm && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Supplier</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id}>
                <td className="font-medium text-slate-800">{p.invoiceNo}</td>
                <td>{p.supplier?.name}</td>
                <td>{p.items.length} line(s)</td>
                <td>{currency(p.totalAmount)}</td>
                <td>
                  <span className="badge bg-brand-50 text-brand-700">{p.status}</span>
                </td>
                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  No purchases recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="New Purchase (Stock-In)" onClose={() => setShowForm(false)} wide>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Supplier *</label>
              <select className="input" required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Line Items</label>
                <button type="button" className="text-xs font-medium text-brand-600 hover:underline" onClick={addLine}>
                  + Add line
                </button>
              </div>
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 rounded-md border border-slate-200 p-3">
                  <div className="col-span-3">
                    <label className="mb-1 block text-xs text-slate-500">Medicine</label>
                    <select className="input" required value={line.medicineId} onChange={(e) => onMedicineSelect(i, e.target.value)}>
                      <option value="">Select…</option>
                      {medicines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs text-slate-500">Batch No</label>
                    <input className="input" required value={line.batchNo} onChange={(e) => updateLine(i, { batchNo: e.target.value })} />
                  </div>
                  <div className="col-span-1">
                    <label className="mb-1 block text-xs text-slate-500">Qty</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      required
                      value={line.quantity}
                      onChange={(e) => updateLine(i, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs text-slate-500">Purchase Price</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      min={0}
                      required
                      value={line.purchasePrice}
                      onChange={(e) => updateLine(i, { purchasePrice: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs text-slate-500">Selling Price</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      min={0}
                      required
                      value={line.sellingPrice}
                      onChange={(e) => updateLine(i, { sellingPrice: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="mb-1 block text-xs text-slate-500">Expiry</label>
                    <input
                      className="input"
                      type="date"
                      required
                      value={line.expiryDate}
                      onChange={(e) => updateLine(i, { expiryDate: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1 flex items-end justify-end">
                    {lines.length > 1 && (
                      <button type="button" className="text-red-500 hover:underline" onClick={() => removeLine(i)}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <p className="text-sm font-medium text-slate-700">Total: {currency(total)}</p>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? "Saving…" : "Record Purchase"}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
