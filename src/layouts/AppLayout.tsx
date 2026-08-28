import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Receipt,
  Wallet,
  CreditCard,
  Users,
  FileBarChart,
  Landmark,
  UserCog,
  History,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { RoleName } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: RoleName[];
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
  { to: '/pos', label: 'POS', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'CASHIER', 'BARTENDER'] },
  { to: '/sales', label: 'Sales', icon: Receipt },
  { to: '/products', label: 'Products', icon: Package, roles: ['ADMIN', 'MANAGER'] },
  { to: '/inventory', label: 'Inventory', icon: Boxes, roles: ['ADMIN', 'MANAGER', 'STOREKEEPER'] },
  { to: '/purchases', label: 'Purchases', icon: Truck, roles: ['ADMIN', 'MANAGER', 'STOREKEEPER'] },
  { to: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['ADMIN', 'MANAGER'] },
  { to: '/cash', label: 'Cash', icon: Wallet },
  { to: '/expenses', label: 'Expenses', icon: CreditCard, roles: ['ADMIN', 'MANAGER'] },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/reports', label: 'Reports', icon: FileBarChart, roles: ['ADMIN', 'MANAGER'] },
  { to: '/accounts', label: 'Accounts', icon: Landmark, roles: ['ADMIN', 'MANAGER'] },
  { to: '/activity', label: 'Activity', icon: History, roles: ['ADMIN', 'MANAGER'] },
  { to: '/users', label: 'Users', icon: UserCog, roles: ['ADMIN'] },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const visibleNav = NAV.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-ink text-paper">
      <aside className="w-60 shrink-0 bg-ink-raised border-r border-panel-border flex flex-col">
        <div className="px-5 py-5 border-b border-panel-border">
          <div className="font-display text-xl text-brass leading-none">Sochebar</div>
          <div className="text-xs text-paper-dim mt-1 tracking-wide">Bar Management</div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive ? 'bg-brass/15 text-brass' : 'text-paper-dim hover:text-paper hover:bg-panel'
                }`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-panel-border">
          <div className="text-sm text-paper">{user?.name}</div>
          <div className="text-xs text-paper-dim mb-3">{user?.role}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-paper-dim hover:text-copper transition-colors"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
