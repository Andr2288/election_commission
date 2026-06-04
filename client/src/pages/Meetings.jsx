import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, meetingStatusLabels, toDatetimeLocal } from '../utils/format';

const emptyForm = {
  title: '',
  meeting_date: '',
  location: '',
  status: 'planned',
  description: '',
};

const statusColors = {
  planned: 'bg-blue-100 text-blue-700',
  held: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function Meetings() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'secretary';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('meeting_date');
  const [order, setOrder] = useState('desc');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { search, sort, order };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/meetings', { params });
      setItems(res.data);
    } catch {
      setError('Не вдалося завантажити засідання');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sort, order]);

  useEffect(() => {
    const timer = setTimeout(loadItems, 300);
    return () => clearTimeout(timer);
  }, [loadItems]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      meeting_date: toDatetimeLocal(item.meeting_date),
      location: item.location || '',
      status: item.status,
      description: item.description || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, meeting_date: new Date(form.meeting_date).toISOString() };
      if (editingId) {
        await api.put(`/meetings/${editingId}`, payload);
      } else {
        await api.post('/meetings', payload);
      }
      closeModal();
      loadItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Видалити засідання "${item.title}"?`)) return;
    try {
      await api.delete(`/meetings/${item.id}`);
      loadItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Помилка видалення');
    }
  };

  const toggleSort = (field) => {
    if (sort === field) setOrder(order === 'asc' ? 'desc' : 'asc');
    else {
      setSort(field);
      setOrder('asc');
    }
  };

  const sortIcon = (field) => (sort === field ? (order === 'asc' ? ' ↑' : ' ↓') : '');

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Засідання</h3>
          <p className="text-sm text-slate-500">Планування та облік засідань комісії</p>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            + Додати засідання
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Пошук за назвою, місцем, описом..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Усі статуси</option>
          <option value="planned">Заплановані</option>
          <option value="held">Проведені</option>
          <option value="cancelled">Скасовані</option>
        </select>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort('title')}>
                Назва{sortIcon('title')}
              </th>
              <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort('meeting_date')}>
                Дата{sortIcon('meeting_date')}
              </th>
              <th className="px-4 py-3 font-medium">Місце</th>
              <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort('status')}>
                Статус{sortIcon('status')}
              </th>
              <th className="px-4 py-3 font-medium">Протоколи</th>
              <th className="px-4 py-3 font-medium">Документи</th>
              <th className="px-4 py-3 font-medium">Дії</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Завантаження...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Записів не знайдено
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/meetings/${item.id}`} className="font-medium text-primary-600 hover:underline">
                      {item.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(item.meeting_date)}</td>
                  <td className="px-4 py-3 text-slate-600">{item.location || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[item.status]}`}>
                      {meetingStatusLabels[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.protocols_count}</td>
                  <td className="px-4 py-3 text-slate-600">{item.documents_count}</td>
                  <td className="px-4 py-3">
                    <Link to={`/meetings/${item.id}`} className="mr-2 text-primary-600 hover:underline">
                      Деталі
                    </Link>
                    {canEdit && (
                      <>
                        <button onClick={() => openEdit(item)} className="mr-2 text-primary-600 hover:underline">
                          Редагувати
                        </button>
                        <button onClick={() => handleDelete(item)} className="text-red-600 hover:underline">
                          Видалити
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h4 className="mb-4 text-lg font-semibold">{editingId ? 'Редагування' : 'Нове засідання'}</h4>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Назва *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Дата та час *</label>
                <input
                  type="datetime-local"
                  value={form.meeting_date}
                  onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Місце</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Статус</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="planned">Заплановане</option>
                  <option value="held">Проведене</option>
                  <option value="cancelled">Скасоване</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Опис</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="rounded-lg border px-4 py-2 text-sm">
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saving ? 'Збереження...' : 'Зберегти'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
