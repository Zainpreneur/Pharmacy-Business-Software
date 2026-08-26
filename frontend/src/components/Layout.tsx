import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/pos", label: "Point of Sale", icon: "🛒" },
  { to: "/sales", label: "Sales History", icon: "🧾" },
  { to: "/medicines", label: "Medicines", icon: "💊" },
  { to: "/categories", label: "Categories", icon: "🗂️" },
  { to: "/purchases", label: "Purchases", icon: "📦" },
  { to: "/suppliers", label: "Suppliers", icon: "🚚" },
  { to: "/customers", label: "Customers", icon: "🧑‍🤝‍🧑" },
  { to: "/reports", label: "Reports", icon: "📈" },
  { to: "/users", label: "Users", icon: "🔐", roles: ["ADMIN"] },
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="text-2xl">⚕️</span>
          <div>
            <p className="text-base font-bold text-brand-700 leading-tight">PharmaCare</p>
            <p className="text-xs text-slate-400 leading-tight">Pharmacy Management</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role))).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700">{user?.name}</p>
          <p className="text-xs text-slate-400">{user?.role}</p>
          <button onClick={logout} className="btn-secondary mt-3 w-full">
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto max-w-7xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
