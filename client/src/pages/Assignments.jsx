import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  assignmentStatusColors,
  assignmentStatusLabels,
  formatDate,
  formatDateTime,
} from '../utils/format';

const emptyForm = {
  member_id: '',
  title: '',
  description: '',
  deadline: '',
  status: 'in_progress',
};

export default function Assignments() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'secretary';

  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  const [sort, setSort] = useState('deadline');
  const [order, setOrder] = useState('asc');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/commission-members', { params: { is_active: 1 } })
      .then((res) => setMembers(res.data))
      .catch(() => {});
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { search, sort, order };
      if (statusFilter) params.status = statusFilter;
      if (memberFilter) params.member_id = memberFilter;
      const res = await api.get('/assignments', { params });
      setItems(res.data);
    } catch {
      setError('Не вдалося завантажити доручення');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, memberFilter, sort, order]);

  useEffect(() => {
    const timer = setTimeout(loadItems, 300);
    return () => clearTimeout(timer);
  }, [loadItems]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      deadline: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      member_id: String(item.member_id),
      title: item.title,
      description: item.description || '',
      deadline: item.deadline?.slice(0, 10) || '',
      status: item.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, member_id: Number(form.member_id) };
      if (editingId) await api.put(`/assignments/${editingId}`, payload);
      else await api.post('/assignments', payload);
      setModalOpen(false);
      loadItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (item, newStatus) => {
    try {
      await api.patch(`/assignments/${item.id}/status`, { status: newStatus });
      loadItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Помилка оновлення статусу');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Видалити доручення "${item.title}"?`)) return;
    try {
      await api.delete(`/assignments/${item.id}`);
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
          <h3 className="text-lg font-semibold text-slate-800">Доручення</h3>
          <p className="text-sm text-slate-500">
            Статуси оновлюються автоматично при простроченні терміну
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            + Додати доручення
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <input
          type="text"
          placeholder="Пошук за назвою, описом, ПІБ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Усі статуси</option>
          <option value="in_progress">Виконується</option>
          <option value="completed">Виконано</option>
          <option value="overdue">Прострочено</option>
        </select>
        <select
          value={memberFilter}
          onChange={(e) => setMemberFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Усі члени</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort('title')}>
                Назва{sortIcon('title')}
              </th>
              <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort('member_name')}>
                Виконавець{sortIcon('member_name')}
              </th>
              <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort('deadline')}>
                Термін{sortIcon('deadline')}
              </th>
              <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort('status')}>
                Статус{sortIcon('status')}
              </th>
              <th className="px-4 py-3 font-medium">Виконано</th>
              <th className="px-4 py-3 font-medium">Дії</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Завантаження...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Записів не знайдено
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{item.title}</p>
                    {item.description && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">{item.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.member_name}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(item.deadline)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${assignmentStatusColors[item.status]}`}
                    >
                      {assignmentStatusLabels[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.completed_at ? formatDateTime(item.completed_at) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {canEdit && item.status !== 'completed' && (
                      <button
                        onClick={() => handleStatusChange(item, 'completed')}
                        className="mr-2 text-green-600 hover:underline"
                      >
                        Виконано
                      </button>
                    )}
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
            <h4 className="mb-4 text-lg font-semibold">{editingId ? 'Редагування' : 'Нове доручення'}</h4>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Виконавець *</label>
                <select
                  value={form.member_id}
                  onChange={(e) => setForm({ ...form, member_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Оберіть члена комісії</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} — {m.position}
                    </option>
                  ))}
                </select>
              </div>
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
                <label className="mb-1 block text-sm font-medium">Опис</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Термін виконання *</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              {editingId && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Статус</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="in_progress">Виконується</option>
                    <option value="completed">Виконано</option>
                    <option value="overdue">Прострочено</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border px-4 py-2 text-sm">
                  Скасувати
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white">
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
