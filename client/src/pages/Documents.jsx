import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { documentTypeLabels, formatDate } from '../utils/format';

const emptyForm = {
  meeting_id: '',
  type: 'resolution',
  document_number: '',
  title: '',
  content: '',
  document_date: '',
};

export default function Documents({ defaultMeetingId = '' }) {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'secretary';

  const [items, setItems] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
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
      if (typeFilter) params.type = typeFilter;
      if (meetingFilter) params.meeting_id = meetingFilter;
      const res = await api.get('/documents', { params });
      setItems(res.data);
    } catch {
      setError('Не вдалося завантажити документи');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, meetingFilter]);

  useEffect(() => {
    const timer = setTimeout(loadItems, 300);
    return () => clearTimeout(timer);
  }, [loadItems]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      meeting_id: meetingFilter || '',
      document_date: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      meeting_id: item.meeting_id ? String(item.meeting_id) : '',
      type: item.type,
      document_number: item.document_number,
      title: item.title,
      content: item.content,
      document_date: item.document_date?.slice(0, 10) || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        meeting_id: form.meeting_id ? Number(form.meeting_id) : null,
      };
      if (editingId) await api.put(`/documents/${editingId}`, payload);
      else await api.post('/documents', payload);
      setModalOpen(false);
      loadItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Видалити ${documentTypeLabels[item.type]} ${item.document_number}?`)) return;
    try {
      await api.delete(`/documents/${item.id}`);
      loadItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Помилка видалення');
    }
  };

  return (
    <div>
      {!defaultMeetingId && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-800">Постанови та рішення</h3>
          <p className="text-sm text-slate-500">Офіційні документи виборчої комісії</p>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Пошук за номером, назвою, змістом..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Усі типи</option>
            <option value="resolution">Постанови</option>
            <option value="decision">Рішення</option>
          </select>
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
            + Додати документ
          </button>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Тип</th>
              <th className="px-4 py-3 font-medium">Номер</th>
              <th className="px-4 py-3 font-medium">Назва</th>
              <th className="px-4 py-3 font-medium">Дата</th>
              <th className="px-4 py-3 font-medium">Засідання</th>
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
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-slate-400">
                  Записів не знайдено
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.type === 'resolution'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {documentTypeLabels[item.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{item.document_number}</td>
                  <td className="max-w-xs truncate px-4 py-3">{item.title}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(item.document_date)}</td>
                  <td className="px-4 py-3">
                    {item.meeting_id ? (
                      <Link to={`/meetings/${item.meeting_id}`} className="text-primary-600 hover:underline">
                        {item.meeting_title}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
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
            <h4 className="mb-4 text-lg font-semibold">{editingId ? 'Редагування' : 'Новий документ'}</h4>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Тип *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="resolution">Постанова</option>
                  <option value="decision">Рішення</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Засідання</label>
                <select
                  value={form.meeting_id}
                  onChange={(e) => setForm({ ...form, meeting_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  disabled={Boolean(defaultMeetingId)}
                >
                  <option value="">Без привʼязки</option>
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Номер *</label>
                <input
                  type="text"
                  value={form.document_number}
                  onChange={(e) => setForm({ ...form, document_number: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
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
                <label className="mb-1 block text-sm font-medium">Дата документа *</label>
                <input
                  type="date"
                  value={form.document_date}
                  onChange={(e) => setForm({ ...form, document_date: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Зміст *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={4}
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
