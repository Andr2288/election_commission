import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Головна', end: true },
  { to: '/members', label: 'Члени комісії' },
  { to: '/meetings', label: 'Засідання' },
  { to: '/protocols', label: 'Протоколи' },
  { to: '/documents', label: 'Постанови / Рішення' },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col bg-primary-900 text-white">
        <div className="border-b border-primary-800 px-6 py-5">
          <h1 className="text-lg font-semibold leading-tight">Виборча комісія</h1>
          <p className="mt-1 text-sm text-primary-100">Система секретаря</p>
        </div>

        <nav className="flex-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `mb-1 block rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-primary-700 font-medium'
                    : 'text-primary-100 hover:bg-primary-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-primary-800 px-4 py-4">
          <p className="truncate text-sm font-medium">{user?.full_name}</p>
          <p className="text-xs text-primary-200">{user?.role}</p>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-lg bg-primary-800 px-3 py-2 text-sm hover:bg-primary-700"
          >
            Вийти
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="border-b border-slate-200 bg-white px-8 py-4">
          <h2 className="text-xl font-semibold text-slate-800">Панель управління</h2>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
