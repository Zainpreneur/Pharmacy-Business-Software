import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Medicines } from "./pages/Medicines";
import { Categories } from "./pages/Categories";
import { Suppliers } from "./pages/Suppliers";
import { Customers } from "./pages/Customers";
import { Purchases } from "./pages/Purchases";
import { POS } from "./pages/POS";
import { SalesHistory } from "./pages/SalesHistory";
import { SaleDetail } from "./pages/SaleDetail";
import { Reports } from "./pages/Reports";
import { Users } from "./pages/Users";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/sales" element={<SalesHistory />} />
          <Route path="/sales/:id" element={<SaleDetail />} />
          <Route path="/medicines" element={<Medicines />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/reports" element={<Reports />} />
          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="/users" element={<Users />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
