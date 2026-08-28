import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { RequireAuth, RequireRole } from './components/RequireAuth';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PosPage } from './pages/pos/PosPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { PurchasesPage } from './pages/purchases/PurchasesPage';
import { SuppliersPage } from './pages/suppliers/SuppliersPage';
import { SalesPage } from './pages/sales/SalesPage';
import { CashPage } from './pages/cash/CashPage';
import { ExpensesPage } from './pages/expenses/ExpensesPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { UsersPage } from './pages/users/UsersPage';
import { ActivityPage } from './pages/activity/ActivityPage';
import { AccountsPage } from './pages/accounts/AccountsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route element={<RequireRole roles={['ADMIN', 'MANAGER']} />}>
                  <Route path="/" element={<DashboardPage />} />
                </Route>

                <Route
                  path="/pos"
                  element={<RequireRole roles={['ADMIN', 'MANAGER', 'CASHIER', 'BARTENDER']} />}
                >
                  <Route index element={<PosPage />} />
                </Route>

                <Route path="/sales" element={<SalesPage />} />
                <Route path="/cash" element={<CashPage />} />
                <Route path="/customers" element={<CustomersPage />} />

                <Route element={<RequireRole roles={['ADMIN', 'MANAGER']} />}>
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/purchases" element={<PurchasesPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route path="/expenses" element={<ExpensesPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/accounts" element={<AccountsPage />} />
                  <Route path="/activity" element={<ActivityPage />} />
                </Route>

                <Route element={<RequireRole roles={['ADMIN', 'MANAGER', 'STOREKEEPER']} />}>
                  <Route path="/inventory" element={<InventoryPage />} />
                </Route>

                <Route element={<RequireRole roles={['ADMIN']} />}>
                  <Route path="/users" element={<UsersPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
