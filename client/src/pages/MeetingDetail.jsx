import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import Protocols from './Protocols';
import Documents from './Documents';
import { formatDateTime, meetingStatusLabels } from '../utils/format';

const statusColors = {
  planned: 'bg-blue-100 text-blue-700',
  held: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function MeetingDetail() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/meetings/${id}`)
      .then((res) => setMeeting(res.data))
      .catch(() => setMeeting(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="text-slate-500">Завантаження...</p>;
  }

  if (!meeting) {
    return (
      <div>
        <p className="text-red-600">Засідання не знайдено</p>
        <Link to="/meetings" className="mt-2 inline-block text-primary-600 hover:underline">
          ← Назад до списку
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/meetings" className="mb-4 inline-block text-sm text-primary-600 hover:underline">
        ← Усі засідання
      </Link>

      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-800">{meeting.title}</h3>
            <p className="mt-2 text-slate-600">{formatDateTime(meeting.meeting_date)}</p>
            {meeting.location && <p className="text-slate-600">📍 {meeting.location}</p>}
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColors[meeting.status]}`}>
            {meetingStatusLabels[meeting.status]}
          </span>
        </div>
        {meeting.description && (
          <p className="mt-4 text-sm text-slate-600">{meeting.description}</p>
        )}
        <p className="mt-3 text-xs text-slate-400">Створив: {meeting.created_by_name}</p>
      </div>

      <section className="mb-10">
        <h4 className="mb-4 text-lg font-semibold text-slate-800">Протоколи цього засідання</h4>
        <Protocols defaultMeetingId={id} />
      </section>

      <section>
        <h4 className="mb-4 text-lg font-semibold text-slate-800">Постанови та рішення</h4>
        <Documents defaultMeetingId={id} />
      </section>
    </div>
  );
}
