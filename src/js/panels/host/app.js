import '../../../css/app.css';
import { Auth } from '../../auth.js';
import { api } from '../../api.js';
import { el, formatTime, toast, toDateTimeLocal } from '../../utils/dom.js';
import { table } from '../../components/sidebar.js';
import { bootPanel, refreshPanel } from '../../runtime.js';
import { StatCard } from '../../components/clock-card.js';
import { Modal } from '../../components/modal.js';

const NAV = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'candidates', label: 'Candidates' },
  { view: 'attendance', label: 'Attendance' },
  { view: 'schedule', label: 'Schedule' },
  { view: 'profile', label: 'Profile' },
];

function field(label, input) {
  return el('div', { class: 'field' }, [el('span', { text: label }), input]);
}

function reviewLabel(status) {
  if (status === 'CONFIRMED') return 'Confirmed';
  if (status === 'REJECTED') return 'Rejected';
  return 'Unreviewed';
}

async function reviewSession(session, decision, extra = {}) {
  await api('host', 'confirm-attendance', {
    body: {
      attendanceSessionId: session.id,
      decision,
      ...extra,
    },
  });
}

function openReviewModal(session, { title, decision, requireComment, includeTimes }) {
  const comment = el('textarea', {
    class: 'input',
    rows: '3',
    placeholder: requireComment ? 'Why are you rejecting this?' : 'Optional note',
  });
  comment.value = session.host_review_comment || '';
  const clockIn = el('input', { class: 'input', type: 'datetime-local' });
  const clockOut = el('input', { class: 'input', type: 'datetime-local' });
  clockIn.value = toDateTimeLocal(session.host_corrected_in_at || session.clocked_in_at);
  clockOut.value = toDateTimeLocal(session.host_corrected_out_at || session.clocked_out_at);
  const node = Modal({
    title,
    onClose: () => node.remove(),
    children: [
      el('p', {
        class: 'muted',
        text: `${session.candidates?.first_name || ''} ${session.candidates?.last_name || ''} · ${formatTime(session.clocked_in_at)} – ${formatTime(session.clocked_out_at)}`,
      }),
      includeTimes ? field('Clock in', clockIn) : null,
      includeTimes ? field('Clock out', clockOut) : null,
      field(requireComment ? 'Reason' : 'Note', comment),
      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'btn', onClick: () => node.remove() }, ['Cancel']),
        el('button', {
          class: 'btn btn-primary',
          onClick: async () => {
            try {
              const body = { comment: comment.value.trim() };
              if (requireComment && body.comment.length < 3) throw new Error('Enter a reason');
              if (includeTimes) {
                if (!clockIn.value || !clockOut.value) throw new Error('Enter both clock-in and clock-out');
                body.clockedInAt = new Date(clockIn.value).toISOString();
                body.clockedOutAt = new Date(clockOut.value).toISOString();
              }
              await reviewSession(session, decision, body);
              node.remove();
              toast(decision === 'confirm' ? 'Attendance confirmed' : 'Attendance rejected');
              refreshPanel();
            } catch (e) {
              toast(e.message, 'err');
            }
          },
        }, ['Save']),
      ]),
    ],
  });
  document.body.append(node);
}

async function dashboard() {
  const data = await api('host', 'dashboard', { body: {} });
  const t = data.today || {};
  return el('div', { class: 'grid grid-4' }, [
    StatCard('Scheduled', t.scheduled),
    StatCard('Present', data.presentNow ?? t.present),
    StatCard('On break', t.onBreak),
    StatCard('On leave', t.onLeave),
  ]);
}

async function candidates() {
  const data = await api('host', 'candidates', { body: {} });
  return table(
    ['Name', 'Reference', 'Nationality', 'Role'],
    (data.candidates || []).map((c) => [
      `${c.first_name} ${c.last_name}`,
      c.candidate_reference,
      c.nationality || '—',
      c.assignment?.role_title || '',
    ]),
  );
}

async function attendance() {
  const data = await api('host', 'attendance', { body: {} });
  return el('div', { class: 'grid' }, [
    el('p', {
      class: 'muted',
      text: 'Confirm or reject each student’s attendance. If you confirmed the wrong day, change it. Use Correct times when the clock times are wrong.',
    }),
    table(
      ['Candidate', 'In', 'Out', 'Review', 'By', 'Actions'],
      (data.sessions || []).map((s) => [
        `${s.candidates?.first_name || ''} ${s.candidates?.last_name || ''}`,
        formatTime(s.host_corrected_in_at || s.clocked_in_at),
        formatTime(s.host_corrected_out_at || s.clocked_out_at),
        reviewLabel(s.host_review_status),
        s.host_reviewer?.display_name || '—',
        el('div', { class: 'btn-row' }, [
          el('button', {
            class: 'btn btn-primary',
            onClick: async () => {
              try {
                await reviewSession(s, 'confirm');
                toast('Attendance confirmed');
                refreshPanel();
              } catch (e) {
                toast(e.message, 'err');
              }
            },
          }, [s.host_review_status === 'CONFIRMED' ? 'Confirmed' : 'Confirm']),
          el('button', {
            class: 'btn',
            onClick: () => openReviewModal(s, {
              title: 'Reject attendance',
              decision: 'reject',
              requireComment: true,
              includeTimes: false,
            }),
          }, ['Reject']),
          el('button', {
            class: 'btn',
            onClick: () => openReviewModal(s, {
              title: 'Correct times and confirm',
              decision: 'confirm',
              requireComment: false,
              includeTimes: true,
            }),
          }, ['Correct']),
        ]),
      ]),
    ),
  ]);
}

async function schedule() {
  const data = await api('host', 'schedule', { body: {} });
  return table(
    ['Candidate', 'Start', 'End'],
    (data.shifts || []).map((s) => [
      `${s.candidates?.first_name || ''} ${s.candidates?.last_name || ''}`,
      formatTime(s.start_at),
      formatTime(s.end_at),
    ]),
  );
}

const user = Auth.requireRole('HOST');
await bootPanel({
  title: 'Host',
  items: NAV,
  user,
  defaultView: 'dashboard',
  views: {
    dashboard,
    candidates,
    attendance,
    schedule,
    profile: () => el('div', { text: user.displayName }),
  },
});
