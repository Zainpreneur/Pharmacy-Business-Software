import { FormEvent, useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Modal } from "../components/Modal";
import type { AuthUser, Role } from "../types";

interface UserRow extends AuthUser {
  active: boolean;
  createdAt: string;
}

const emptyForm = { name: "", email: "", password: "", role: "CASHIER" as Role };

export function Users() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/auth/register", form);
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: UserRow) {
    try {
      await api.put(`/users/${u.id}`, { active: !u.active });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function changeRole(u: UserRow, role: Role) {
    try {
      await api.put(`/users/${u.id}`, { role });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Users</h1>
          <p className="text-sm text-slate-500">Manage staff accounts and permissions</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Add User
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium text-slate-800">{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <select className="input px-2 py-1" value={u.role} onChange={(e) => changeRole(u, e.target.value as Role)}>
                    <option value="ADMIN">Admin</option>
                    <option value="PHARMACIST">Pharmacist</option>
                    <option value="CASHIER">Cashier</option>
                  </select>
                </td>
                <td>
                  <span className={`badge ${u.active ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500"}`}>
                    {u.active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td>
                  <button className="text-brand-600 hover:underline" onClick={() => toggleActive(u)}>
                    {u.active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="Add User" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name *</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email *</label>
              <input
                className="input"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password *</label>
              <input
                className="input"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="ADMIN">Admin</option>
                <option value="PHARMACIST">Pharmacist</option>
                <option value="CASHIER">Cashier</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Saving…" : "Create User"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
