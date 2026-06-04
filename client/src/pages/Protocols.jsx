import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/format';

const emptyForm = { meeting_id: '', protocol_number: '', content: '' };

export default function Protocols({ defaultMeetingId = '' }) {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'secretary';

  const [items, setItems] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [meetingFilter, setMeetingFilter] = useState(defaultMeetingId ? String(defaultMeetingId) : '');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/meetings').then((res) => setMeetings(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (defaultMeetingId) setMeetingFilter(String(defaultMeetingId));
  }, [defaultMeetingId]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { search };
      if (meetingFilter) params.meeting_id = meetingFilter;
      const res = await api.get('/protocols', { params });
      setItems(res.data);
    } catch {
      setError('Не вдалося завантажити протоколи');
    } finally {
      setLoading(false);
    }
  }, [search, meetingFilter]);

  useEffect(() => {
    const timer = setTimeout(loadItems, 300);
    return () => clearTimeout(timer);
  }, [loadItems]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ meeting_id: meetingFilter || '', protocol_number: '', content: '' });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      meeting_id: String(item.meeting_id),
      protocol_number: item.protocol_number,
      content: item.content,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, meeting_id: Number(form.meeting_id) };
      if (editingId) await api.put(`/protocols/${editingId}`, payload);
      else await api.post('/protocols', payload);
      setModalOpen(false);
      loadItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Видалити протокол ${item.protocol_number}?`)) return;
    try {
      await api.delete(`/protocols/${item.id}`);
      loadItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Помилка видалення');
    }
  };

  return (
    <div>
      {!defaultMeetingId && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-800">Протоколи засідань</h3>
          <p className="text-sm text-slate-500">Ведення протоколів виборчої комісії</p>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Пошук за номером або змістом..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {!defaultMeetingId && (
            <select
              value={meetingFilter}
              onChange={(e) => setMeetingFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Усі засідання</option>
              {meetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          )}
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            + Додати протокол
          </button>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Номер</th>
              <th className="px-4 py-3 font-medium">Засідання</th>
              <th className="px-4 py-3 font-medium">Зміст</th>
              <th className="px-4 py-3 font-medium">Створено</th>
              {canEdit && <th className="px-4 py-3 font-medium">Дії</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="px-4 py-8 text-center text-slate-400">
                  Завантаження...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="px-4 py-8 text-center text-slate-400">
                  Записів не знайдено
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{item.protocol_number}</td>
                  <td className="px-4 py-3">
                    <Link to={`/meetings/${item.meeting_id}`} className="text-primary-600 hover:underline">
                      {item.meeting_title}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600">{item.content}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(item.created_at)}</td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(item)} className="mr-2 text-primary-600 hover:underline">
                        Редагувати
                      </button>
                      <button onClick={() => handleDelete(item)} className="text-red-600 hover:underline">
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
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h4 className="mb-4 text-lg font-semibold">{editingId ? 'Редагування' : 'Новий протокол'}</h4>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Засідання *</label>
                <select
                  value={form.meeting_id}
                  onChange={(e) => setForm({ ...form, meeting_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                  disabled={Boolean(defaultMeetingId)}
                >
                  <option value="">Оберіть засідання</option>
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Номер протоколу *</label>
                <input
                  type="text"
                  value={form.protocol_number}
                  onChange={(e) => setForm({ ...form, protocol_number: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Зміст *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={5}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
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
