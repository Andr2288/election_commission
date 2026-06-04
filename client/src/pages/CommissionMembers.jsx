import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  full_name: '',
  position: '',
  phone: '',
  email: '',
  is_active: true,
};

export default function CommissionMembers() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'secretary';

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [sort, setSort] = useState('full_name');
  const [order, setOrder] = useState('asc');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { search, sort, order };
      if (activeFilter !== '') params.is_active = activeFilter;
      const res = await api.get('/commission-members', { params });
      setMembers(res.data);
    } catch {
      setError('Не вдалося завантажити список');
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter, sort, order]);

  useEffect(() => {
    const timer = setTimeout(loadMembers, 300);
    return () => clearTimeout(timer);
  }, [loadMembers]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (member) => {
    setEditingId(member.id);
    setForm({
      full_name: member.full_name,
      position: member.position,
      phone: member.phone || '',
      email: member.email || '',
      is_active: Boolean(member.is_active),
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
      if (editingId) {
        await api.put(`/commission-members/${editingId}`, form);
      } else {
        await api.post('/commission-members', form);
      }
      closeModal();
      loadMembers();
    } catch (err) {
      alert(err.response?.data?.message || 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member) => {
    if (!window.confirm(`Видалити ${member.full_name}?`)) return;
    try {
      await api.delete(`/commission-members/${member.id}`);
      loadMembers();
    } catch (err) {
      alert(err.response?.data?.message || 'Помилка видалення');
    }
  };

  const toggleSort = (field) => {
    if (sort === field) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field);
      setOrder('asc');
    }
  };

  const sortIcon = (field) => {
    if (sort !== field) return '';
    return order === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Члени комісії</h3>
          <p className="text-sm text-slate-500">Управління складом виборчої комісії</p>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            + Додати члена
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Пошук за ПІБ, посадою, email, телефоном..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">Усі статуси</option>
          <option value="1">Активні</option>
          <option value="0">Неактивні</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort('full_name')}>
                ПІБ{sortIcon('full_name')}
              </th>
              <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort('position')}>
                Посада{sortIcon('position')}
              </th>
              <th className="px-4 py-3 font-medium">Телефон</th>
              <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort('email')}>
                Email{sortIcon('email')}
              </th>
              <th className="px-4 py-3 font-medium">Статус</th>
              {canEdit && <th className="px-4 py-3 font-medium">Дії</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-slate-400">
                  Завантаження...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-slate-400">
                  Записів не знайдено
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{member.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{member.position}</td>
                  <td className="px-4 py-3 text-slate-600">{member.phone || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{member.email || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        member.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {member.is_active ? 'Активний' : 'Неактивний'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(member)}
                        className="mr-2 text-primary-600 hover:underline"
                      >
                        Редагувати
                      </button>
                      <button
                        onClick={() => handleDelete(member)}
                        className="text-red-600 hover:underline"
                      >
                        Видалити
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h4 className="mb-4 text-lg font-semibold text-slate-800">
              {editingId ? 'Редагування' : 'Новий член комісії'}
            </h4>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">ПІБ *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Посада *</label>
                <input
                  type="text"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Телефон</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-slate-300"
                />
                Активний член комісії
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
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
