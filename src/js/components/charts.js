import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  PolarAreaController,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { el } from '../utils/dom.js';
import { EmptyState } from './empty-state.js';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  PolarAreaController,
  RadialLinearScale,
  Tooltip,
);

Chart.defaults.font.family = '"Inter", "Segoe UI", system-ui, sans-serif';
Chart.defaults.color = '#3b424f';
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.boxWidth = 8;
Chart.defaults.plugins.legend.position = 'bottom';

export const CHART_COLORS = ['#21396a', '#f5bf48', '#ba133a', '#77777e', '#3b424f', '#5c7ab8', '#d4a017', '#8c3b4a'];

const observers = new WeakMap();

function cssVar(name, fallback) {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function palette(count) {
  return Array.from({ length: count }, (_, i) => CHART_COLORS[i % CHART_COLORS.length]);
}

function hasValues(datasets) {
  return (datasets || []).some((set) => (set.data || []).some((value) => Number(value) > 0));
}

function watchDestroy(canvas, chart) {
  const root = document.getElementById('app') || document.body;
  observers.get(canvas)?.disconnect();
  const observer = new MutationObserver(() => {
    if (canvas.isConnected) return;
    chart.destroy();
    observer.disconnect();
    observers.delete(canvas);
  });
  observer.observe(root, { childList: true, subtree: true });
  observers.set(canvas, observer);
}

function dayKey(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso).slice(0, 10);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function localDayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dateKeys(days = 7, now = new Date()) {
  const keys = [];
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(start);
    day.setDate(start.getDate() - i);
    keys.push(localDayKey(day));
  }
  return keys;
}

export function shortDayLabel(key) {
  const date = new Date(`${key}T12:00:00`);
  return date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric' });
}

export function sessionHours(session) {
  const start = session?.host_corrected_in_at || session?.clocked_in_at;
  const end = session?.host_corrected_out_at || session?.clocked_out_at;
  if (!start || !end) return 0;
  const breakSeconds = (session.breaks || [])
    .filter((item) => !item.paid && item.duration_seconds)
    .reduce((sum, item) => sum + Number(item.duration_seconds || 0), 0);
  return Math.max(0, Math.round((((new Date(end) - new Date(start)) / 1000 - breakSeconds) / 3600) * 10) / 10);
}

export function reviewLabel(status) {
  if (status === 'CONFIRMED') return 'Confirmed';
  if (status === 'REJECTED') return 'Rejected';
  return 'Unreviewed';
}

export function countBy(items, keyFn) {
  const counts = {};
  for (const item of items || []) {
    const key = keyFn(item);
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export function sumBy(items, keyFn, valueFn) {
  const totals = {};
  for (const item of items || []) {
    const key = keyFn(item);
    if (!key) continue;
    totals[key] = Math.round(((totals[key] || 0) + Number(valueFn(item) || 0)) * 10) / 10;
  }
  return totals;
}

export function doughnutFromCounts(counts, order) {
  const keys = (order || Object.keys(counts)).filter((key) => Number(counts[key]) > 0);
  return {
    labels: keys,
    values: keys.map((key) => Number(counts[key] || 0)),
  };
}

export function hoursFromSessions(sessions, { limit = 14 } = {}) {
  const hours = {};
  const clocks = {};
  for (const session of sessions || []) {
    const key = dayKey(session.host_corrected_in_at || session.clocked_in_at);
    if (!key) continue;
    clocks[key] = (clocks[key] || 0) + 1;
    hours[key] = Math.round(((hours[key] || 0) + sessionHours(session)) * 10) / 10;
  }
  const dates = Object.keys(clocks).sort().slice(-limit);
  return {
    dates,
    labels: dates.map(shortDayLabel),
    hours: dates.map((key) => hours[key] || 0),
    clocks: dates.map((key) => clocks[key] || 0),
  };
}

export function hoursByDay(sessions, { days = 7, now = new Date() } = {}) {
  const dates = dateKeys(days, now);
  const hours = Object.fromEntries(dates.map((key) => [key, 0]));
  const clocks = Object.fromEntries(dates.map((key) => [key, 0]));
  for (const session of sessions || []) {
    const key = dayKey(session.host_corrected_in_at || session.clocked_in_at);
    if (!(key in hours)) continue;
    clocks[key] += 1;
    hours[key] = Math.round((hours[key] + sessionHours(session)) * 10) / 10;
  }
  return {
    dates,
    labels: dates.map(shortDayLabel),
    hours: dates.map((key) => hours[key]),
    clocks: dates.map((key) => clocks[key]),
  };
}

function chartOptions(type) {
  const grid = { color: 'rgba(59, 66, 79, 0.08)' };
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: type !== 'bar' || true },
      tooltip: {
        backgroundColor: '#21396a',
        titleColor: '#ffffff',
        bodyColor: '#e2ddd8',
        padding: 10,
        cornerRadius: 10,
      },
    },
  };
  if (type === 'doughnut' || type === 'polarArea') {
    base.plugins.legend.display = true;
    base.cutout = type === 'doughnut' ? '62%' : undefined;
    return base;
  }
  base.plugins.legend.display = true;
  base.scales = {
    x: { grid: { display: false }, ticks: { maxRotation: 0 } },
    y: { beginAtZero: true, grid, ticks: { precision: 0 } },
  };
  if (type === 'combo') {
    base.scales.y1 = {
      beginAtZero: true,
      position: 'right',
      grid: { drawOnChartArea: false },
      ticks: { precision: 0 },
    };
  }
  return base;
}

export function ChartCard({
  title,
  subtitle,
  type = 'doughnut',
  labels = [],
  values = [],
  datasets,
  colors,
  empty = 'Nothing to chart yet',
} = {}) {
  const sets = datasets || [{
    label: title,
    data: values,
    backgroundColor: colors || palette(values.length),
    borderWidth: type === 'doughnut' || type === 'polarArea' ? 0 : 1,
    borderColor: type === 'line' ? cssVar('--ck-navy', '#21396a') : 'transparent',
    fill: type === 'line',
    tension: 0.35,
    pointRadius: type === 'line' ? 3 : 0,
  }];
  const card = el('div', { class: 'card chart-card' }, [
    title ? el('h3', { text: title }) : null,
    subtitle ? el('p', { class: 'muted', text: subtitle }) : null,
  ]);
  if (!hasValues(sets)) {
    card.append(EmptyState(empty));
    return card;
  }

  const wrap = el('div', { class: `chart-wrap${type === 'doughnut' || type === 'polarArea' ? ' is-donut' : ''}${type === 'combo' || type === 'line' ? ' is-wide' : ''}` });
  const canvas = el('canvas', { role: 'img', 'aria-label': title || 'Chart' });
  wrap.append(canvas);
  card.append(wrap);

  const chartType = type === 'combo' ? 'bar' : type;
  const chart = new Chart(canvas, {
    type: chartType,
    data: {
      labels,
      datasets: sets.map((set, index) => ({
        borderWidth: set.borderWidth ?? ((type === 'doughnut' || type === 'polarArea') ? 0 : 2),
        backgroundColor: set.backgroundColor || (type === 'line' ? 'rgba(33, 57, 106, 0.16)' : palette(labels.length)[index]),
        borderColor: set.borderColor || CHART_COLORS[index % CHART_COLORS.length],
        fill: set.fill ?? false,
        tension: set.tension ?? 0.35,
        pointRadius: set.pointRadius ?? (set.type === 'line' || type === 'line' ? 3 : 0),
        ...set,
      })),
    },
    options: chartOptions(type),
  });
  watchDestroy(canvas, chart);
  return card;
}

export function todayMixChart(today = {}, { presentNow } = {}) {
  const present = Number(presentNow ?? today.present ?? 0);
  const onBreak = Number(today.onBreak || 0);
  const working = Math.max(0, present - onBreak);
  return ChartCard({
    title: 'Today',
    subtitle: 'Who is on site right now',
    type: 'doughnut',
    ...doughnutFromCounts({
      Working: working,
      'On break': onBreak,
      'On leave': Number(today.onLeave || 0),
      Absent: Number(today.absent || 0),
    }, ['Working', 'On break', 'On leave', 'Absent']),
    colors: ['#21396a', '#f5bf48', '#77777e', '#ba133a'],
    empty: 'No one is scheduled yet today.',
  });
}

export function attentionChart(attention = {}) {
  const labels = ['Missing clock-outs', 'Corrections', 'Pending leave'];
  const values = [
    Number(attention.missingClockOuts || 0),
    Number(attention.pendingCorrections || 0),
    Number(attention.pendingLeave || 0),
  ];
  return ChartCard({
    title: 'Needs attention',
    subtitle: 'Open items across the organisation',
    type: 'bar',
    labels,
    values,
    colors: ['#ba133a', '#f5bf48', '#21396a'],
    empty: 'Nothing needs attention.',
  });
}

export function weekComboChart(week = {}, { title = 'This week', subtitle = 'Hours worked and clock-ins' } = {}) {
  const labels = week.labels || [];
  return ChartCard({
    title,
    subtitle,
    type: 'combo',
    labels,
    datasets: [
      {
        type: 'bar',
        label: 'Hours',
        data: week.hours || [],
        backgroundColor: 'rgba(33, 57, 106, 0.78)',
        borderRadius: 8,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: 'Clock-ins',
        data: week.clocks || [],
        borderColor: '#f5bf48',
        backgroundColor: '#f5bf48',
        yAxisID: 'y1',
        tension: 0.35,
        pointRadius: 4,
      },
    ],
    empty: 'No clock-ins in the last 7 days.',
  });
}

export function reviewChart(sessions, { title = 'Host review' } = {}) {
  const counts = countBy(sessions, (session) => reviewLabel(session.host_review_status));
  return ChartCard({
    title,
    subtitle: 'Confirmed, rejected, and still waiting',
    type: 'doughnut',
    ...doughnutFromCounts(counts, ['Confirmed', 'Unreviewed', 'Rejected']),
    colors: ['#21396a', '#f5bf48', '#ba133a'],
    empty: 'No attendance to review yet.',
  });
}

export function leaveStatusChart(requests) {
  const counts = countBy(requests, (row) => row.status || 'UNKNOWN');
  return ChartCard({
    title: 'Leave requests',
    subtitle: 'Status mix',
    type: 'doughnut',
    ...doughnutFromCounts(counts, ['APPROVED', 'PENDING', 'REJECTED', 'CANCELLED'].filter((key) => counts[key])),
    colors: ['#21396a', '#f5bf48', '#ba133a', '#77777e'],
    empty: 'No leave requests yet.',
  });
}

export function leaveBalanceChart(balances) {
  const labels = (balances || []).map((row) => row.leave_types?.name || row.name || 'Leave');
  const values = (balances || []).map((row) => Number(row.available_hours || 0));
  return ChartCard({
    title: 'Leave balances',
    subtitle: 'Hours still available',
    type: 'polarArea',
    labels,
    values,
    colors: palette(labels.length),
    empty: 'No leave balances yet.',
  });
}

export function timesheetCharts(data) {
  const groups = [...(data?.candidates || [])].sort((a, b) => Number(b.totalHours || 0) - Number(a.totalHours || 0));
  const top = groups.slice(0, 8);
  const dayHours = {};
  for (const row of data?.timesheet || []) {
    if (!row.date || row.date === '—') continue;
    dayHours[row.date] = Math.round(((dayHours[row.date] || 0) + Number(row.workedHours || 0)) * 10) / 10;
  }
  const days = Object.keys(dayHours).sort();
  const review = countBy(data?.timesheet || [], (row) => row.hostReviewLabel || reviewLabel(row.hostReviewStatus));
  return el('div', { class: 'grid' }, [
    el('div', { class: 'grid grid-2 grid-charts' }, [
      ChartCard({
        title: 'Hours by candidate',
        subtitle: 'Top people in this period',
        type: 'bar',
        labels: top.map((group) => group.name),
        values: top.map((group) => Number(group.totalHours || 0)),
        colors: ['#21396a'],
        empty: 'No hours in this period.',
      }),
      ChartCard({
        title: 'Host review',
        subtitle: data?.period?.label || 'This period',
        type: 'doughnut',
        ...doughnutFromCounts(review, ['Confirmed', 'Unreviewed', 'Rejected']),
        colors: ['#21396a', '#f5bf48', '#ba133a'],
        empty: 'No review data in this period.',
      }),
    ]),
    ChartCard({
      title: 'Hours by day',
      subtitle: 'Worked hours across the period',
      type: 'line',
      labels: days.map((day) => shortDayLabel(day)),
      values: days.map((day) => dayHours[day]),
      empty: 'No daily hours in this period.',
    }),
  ]);
}

export function hoursTrendChart(sessions, { title = 'Hours by day' } = {}) {
  return weekComboChart(hoursFromSessions(sessions), { title, subtitle: 'Worked hours and clock-ins' });
}
