import { Link } from 'react-router-dom';
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
          { title: 'Члени комісії', desc: 'Готово', to: '/members', ready: true },
          { title: 'Засідання', desc: 'Етап 3', ready: false },
          { title: 'Доручення', desc: 'Етап 4', ready: false },
          { title: 'Звіти', desc: 'Етап 5', ready: false },
        ].map((item) => (
          <div
            key={item.title}
            className={`rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 ${
              item.ready ? '' : 'opacity-60'
            }`}
          >
            <h4 className="font-medium text-slate-800">{item.title}</h4>
            <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
            {item.to && (
              <Link to={item.to} className="mt-2 inline-block text-sm font-medium text-primary-600 hover:underline">
                Перейти →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
