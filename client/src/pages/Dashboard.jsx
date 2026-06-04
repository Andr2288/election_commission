import { useAuth } from '../context/AuthContext';

const roleLabels = {
  admin: 'Адміністратор',
  secretary: 'Секретар',
  member: 'Член комісії',
};

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-lg font-semibold text-slate-800">
          Вітаємо, {user?.full_name}!
        </h3>
        <p className="mt-2 text-slate-600">
          Роль: <span className="font-medium">{roleLabels[user?.role] || user?.role}</span>
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Система готова до роботи. Наступний етап — модулі управління даними.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Члени комісії', desc: 'Етап 2' },
          { title: 'Засідання', desc: 'Етап 3' },
          { title: 'Доручення', desc: 'Етап 4' },
          { title: 'Звіти', desc: 'Етап 5' },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 opacity-60"
          >
            <h4 className="font-medium text-slate-800">{item.title}</h4>
            <p className="mt-1 text-sm text-slate-500">{item.desc} — скоро</p>
          </div>
        ))}
      </div>
    </div>
  );
}
