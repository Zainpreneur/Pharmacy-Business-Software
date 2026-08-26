import { FormEvent, useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import type { Category, Medicine } from "../types";

const currency = (n: number) => `$${n.toFixed(2)}`;

const emptyForm = {
  name: "",
  genericName: "",
  categoryId: "",
  manufacturer: "",
  unit: "pcs",
  strength: "",
  reorderLevel: 10,
  purchasePrice: 0,
  sellingPrice: 0,
  requiresPrescription: false,
};

export function Medicines() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "PHARMACIST";
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [medRes, catRes] = await Promise.all([
        api.get("/medicines", { params: { q } }),
        api.get("/categories"),
      ]);
      setMedicines(medRes.data);
      setCategories(catRes.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(m: Medicine) {
    setEditing(m);
    setForm({
      name: m.name,
      genericName: m.genericName || "",
      categoryId: m.categoryId ? String(m.categoryId) : "",
      manufacturer: m.manufacturer || "",
      unit: m.unit,
      strength: m.strength || "",
      reorderLevel: m.reorderLevel,
      purchasePrice: m.purchasePrice,
      sellingPrice: m.sellingPrice,
      requiresPrescription: m.requiresPrescription,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        reorderLevel: Number(form.reorderLevel),
        purchasePrice: Number(form.purchasePrice),
        sellingPrice: Number(form.sellingPrice),
      };
      if (editing) {
        await api.put(`/medicines/${editing.id}`, payload);
      } else {
        await api.post("/medicines", payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(m: Medicine) {
    if (!confirm(`Delete ${m.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/medicines/${m.id}`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Medicines</h1>
          <p className="text-sm text-slate-500">Manage your medicine catalog and stock</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={openCreate}>
            + Add Medicine
          </button>
        )}
      </div>

      {error && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      <input
        className="input max-w-sm"
        placeholder="Search by name, generic name, manufacturer…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Stock</th>
              <th>Reorder Level</th>
              <th>Purchase Price</th>
              <th>Selling Price</th>
              <th>Rx</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {medicines.map((m) => (
              <tr key={m.id}>
                <td>
                  <p className="font-medium text-slate-800">{m.name}</p>
                  {m.genericName && <p className="text-xs text-slate-400">{m.genericName}</p>}
                </td>
                <td>{m.category?.name || "—"}</td>
                <td>{m.unit}</td>
                <td>
                  <span className={`badge ${m.stock <= m.reorderLevel ? "bg-amber-100 text-amber-700" : "bg-brand-50 text-brand-700"}`}>
                    {m.stock}
                  </span>
                </td>
                <td>{m.reorderLevel}</td>
                <td>{currency(m.purchasePrice)}</td>
                <td>{currency(m.sellingPrice)}</td>
                <td>{m.requiresPrescription ? "Yes" : "No"}</td>
                {canManage && (
                  <td className="space-x-2 whitespace-nowrap">
                    <button className="text-brand-600 hover:underline" onClick={() => openEdit(m)}>
                      Edit
                    </button>
                    <button className="text-red-600 hover:underline" onClick={() => handleDelete(m)}>
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {medicines.length === 0 && (
              <tr>
                <td colSpan={9} className="py-6 text-center text-slate-400">
                  No medicines found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editing ? "Edit Medicine" : "Add Medicine"} onClose={() => setShowForm(false)} wide>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Name *</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Generic Name</label>
              <input className="input" value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
              <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Manufacturer</label>
              <input className="input" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Strength</label>
              <input className="input" placeholder="e.g. 500mg" value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Unit</label>
              <select className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {["pcs", "strip", "box", "bottle", "vial", "tube"].map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Reorder Level</label>
              <input
                className="input"
                type="number"
                min={0}
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Default Purchase Price</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min={0}
                value={form.purchasePrice}
                onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Default Selling Price</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min={0}
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                id="rx"
                type="checkbox"
                checked={form.requiresPrescription}
                onChange={(e) => setForm({ ...form, requiresPrescription: e.target.checked })}
              />
              <label htmlFor="rx" className="text-sm text-slate-700">
                Requires prescription
              </label>
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Saving…" : "Save Medicine"}
              </button>
            </div>
          </form>
          <p className="mt-3 text-xs text-slate-400">
            Note: stock quantities are managed via Purchases (stock-in with batch &amp; expiry). This form only sets catalog details and default prices.
          </p>
        </Modal>
      )}
    </div>
  );
}
