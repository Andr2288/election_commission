export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleDateString('uk-UA');
}

export function toDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export const meetingStatusLabels = {
  planned: 'Заплановане',
  held: 'Проведене',
  cancelled: 'Скасоване',
};

export const documentTypeLabels = {
  resolution: 'Постанова',
  decision: 'Рішення',
};

export const assignmentStatusLabels = {
  in_progress: 'Виконується',
  completed: 'Виконано',
  overdue: 'Прострочено',
};

export const assignmentStatusColors = {
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};
