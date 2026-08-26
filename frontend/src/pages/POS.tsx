import { useEffect, useMemo, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Modal } from "../components/Modal";
import type { Customer, Medicine, Sale } from "../types";

const currency = (n: number) => `$${n.toFixed(2)}`;

interface CartLine {
  medicine: Medicine;
  quantity: number;
}

export function POS() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "MOBILE" | "INSURANCE">("CASH");
  const [error, setError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [receipt, setReceipt] = useState<Sale | null>(null);

  async function loadMedicines() {
    const res = await api.get("/medicines", { params: { q } });
    setMedicines(res.data);
  }

  useEffect(() => {
    api.get("/customers").then((res) => setCustomers(res.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(loadMedicines, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function addToCart(medicine: Medicine) {
    setCart((prev) => {
      const existing = prev.find((l) => l.medicine.id === medicine.id);
      if (existing) {
        if (existing.quantity >= medicine.stock) return prev;
        return prev.map((l) => (l.medicine.id === medicine.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      if (medicine.stock <= 0) return prev;
      return [...prev, { medicine, quantity: 1 }];
    });
  }

  function updateQty(medicineId: number, quantity: number) {
    setCart((prev) =>
      prev.map((l) => (l.medicine.id === medicineId ? { ...l, quantity: Math.max(1, Math.min(quantity, l.medicine.stock)) } : l))
    );
  }

  function removeFromCart(medicineId: number) {
    setCart((prev) => prev.filter((l) => l.medicine.id !== medicineId));
  }

  const subtotal = useMemo(() => cart.reduce((sum, l) => sum + l.quantity * l.medicine.sellingPrice, 0), [cart]);
  const total = Math.max(0, subtotal - Number(discount || 0) + Number(tax || 0));

  async function checkout() {
    if (cart.length === 0) return;
    setCheckingOut(true);
    setError("");
    try {
      const res = await api.post("/sales", {
        customerId: customerId ? Number(customerId) : null,
        items: cart.map((l) => ({ medicineId: l.medicine.id, quantity: l.quantity })),
        discount: Number(discount || 0),
        tax: Number(tax || 0),
        paymentMethod,
      });
      setReceipt(res.data);
      setCart([]);
      setDiscount("0");
      setTax("0");
      setCustomerId("");
      loadMedicines();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Point of Sale</h1>
          <p className="text-sm text-slate-500">Search medicines and build the customer's order</p>
        </div>
        <input
          className="input"
          placeholder="Search medicine by name, generic name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <div className="card max-h-[65vh] overflow-y-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Price</th>
                <th>Stock</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((m) => (
                <tr key={m.id}>
                  <td>
                    <p className="font-medium text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-400">
                      {m.strength} {m.requiresPrescription && <span className="text-red-500">· Rx required</span>}
                    </p>
                  </td>
                  <td>{currency(m.sellingPrice)}</td>
                  <td>
                    <span className={`badge ${m.stock <= 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{m.stock}</span>
                  </td>
                  <td>
                    <button className="btn-secondary" disabled={m.stock <= 0} onClick={() => addToCart(m)}>
                      Add
                    </button>
                  </td>
                </tr>
              ))}
              {medicines.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    No medicines match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card flex h-fit flex-col p-4">
        <h2 className="mb-3 font-semibold text-slate-800">Current Order</h2>
        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-500">Customer</label>
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Walk-in Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {cart.length === 0 && <p className="text-sm text-slate-400">Cart is empty. Add medicines to begin.</p>}
          {cart.map((l) => (
            <div key={l.medicine.id} className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{l.medicine.name}</p>
                <p className="text-xs text-slate-400">{currency(l.medicine.sellingPrice)} each</p>
              </div>
              <input
                type="number"
                min={1}
                max={l.medicine.stock}
                className="input w-16 px-2 py-1 text-center"
                value={l.quantity}
                onChange={(e) => updateQty(l.medicine.id, Number(e.target.value))}
              />
              <p className="w-16 text-right text-sm font-medium text-slate-800">{currency(l.quantity * l.medicine.sellingPrice)}</p>
              <button className="text-red-500" onClick={() => removeFromCart(l.medicine.id)} aria-label="Remove">
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{currency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-slate-600">Discount</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input w-24 px-2 py-1 text-right"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-slate-600">Tax</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input w-24 px-2 py-1 text-right"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-slate-600">Payment</label>
            <select className="input w-32 px-2 py-1" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="MOBILE">Mobile</option>
              <option value="INSURANCE">Insurance</option>
            </select>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
            <span>Total</span>
            <span>{currency(total)}</span>
          </div>
        </div>

        <button className="btn-primary mt-4 w-full" disabled={cart.length === 0 || checkingOut} onClick={checkout}>
          {checkingOut ? "Processing…" : "Complete Sale"}
        </button>
      </div>

      {receipt && <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function ReceiptModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  return (
    <Modal title="Sale Complete" onClose={onClose}>
      <div id="receipt" className="space-y-3 text-sm">
        <div className="text-center">
          <p className="text-lg font-bold text-brand-700">PharmaCare</p>
          <p className="text-slate-500">Invoice #{sale.invoiceNo}</p>
          <p className="text-xs text-slate-400">{new Date(sale.createdAt).toLocaleString()}</p>
        </div>
        <div className="border-t border-slate-200 pt-2">
          <p>Customer: {sale.customer?.name || "Walk-in Customer"}</p>
          <p>Cashier: {sale.user?.name}</p>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-1">Item</th>
              <th className="py-1 text-right">Qty</th>
              <th className="py-1 text-right">Price</th>
              <th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id}>
                <td className="py-1">{item.medicine?.name}</td>
                <td className="py-1 text-right">{item.quantity}</td>
                <td className="py-1 text-right">{currency(item.unitPrice)}</td>
                <td className="py-1 text-right">{currency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-1 border-t border-slate-200 pt-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{currency(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{currency(sale.discount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{currency(sale.tax)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Total ({sale.paymentMethod})</span>
            <span>{currency(sale.totalAmount)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            Print Receipt
          </button>
        </div>
      </div>
    </Modal>
  );
}
