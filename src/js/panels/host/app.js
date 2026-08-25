import '../../../css/app.css';
import { Auth } from '../../auth.js';
import { api } from '../../api.js';
import { el, formatTime, toast, toDateTimeLocal } from '../../utils/dom.js';
import { table } from '../../components/sidebar.js';
import { bootPanel, refreshPanel } from '../../runtime.js';
import { StatCard } from '../../components/clock-card.js';
import { todayMixChart, weekComboChart, reviewChart } from '../../components/charts.js';
import { Modal } from '../../components/modal.js';
import { AccountForm } from '../../components/account-form.js';
import { AlertsPanel } from '../../components/alerts-panel.js';
import { nationalitySelect } from '../../nationalities.js';

const NAV = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'candidates', label: 'Candidates' },
  { view: 'attendance', label: 'Attendance' },
  { view: 'schedule', label: 'Schedule' },
  { view: 'notifications', label: 'Alerts' },
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
        el('button', { class: 'btn', type: 'button', onClick: () => node.remove() }, ['Cancel']),
        el('button', {
          class: 'btn btn-primary',
          type: 'button',
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
  return el('div', { class: 'grid' }, [
    el('div', { class: 'grid grid-4' }, [
      StatCard('Scheduled', t.scheduled),
      StatCard('Present', data.presentNow ?? t.present),
      StatCard('On break', t.onBreak),
      StatCard('On leave', t.onLeave),
    ]),
    el('div', { class: 'grid grid-2 grid-charts' }, [
      todayMixChart(t, { presentNow: data.presentNow }),
      reviewChart(data.sessions || [], { title: 'Today’s reviews' }),
    ]),
    weekComboChart(data.week, { subtitle: 'Hours and clock-ins at this workplace' }),
  ]);
}

async function candidates() {
  const data = await api('host', 'candidates', { body: {} });

  function openEdit(candidate) {
    const first = el('input', { class: 'input', placeholder: 'First name' });
    first.value = candidate.first_name || '';
    const last = el('input', { class: 'input', placeholder: 'Last name' });
    last.value = candidate.last_name || '';
    const ref = el('input', { class: 'input', placeholder: 'Reference' });
    ref.value = candidate.candidate_reference || '';
    const idNumber = el('input', { class: 'input', placeholder: 'ID or passport number' });
    idNumber.value = candidate.id_number || '';
    const sponsor = el('input', { class: 'input', placeholder: 'Sponsor name' });
    sponsor.value = candidate.sponsor_name || '';
    const nationality = nationalitySelect(el);
    if (candidate.nationality && ![...nationality.options].some((option) => option.value === candidate.nationality)) {
      nationality.append(el('option', { value: candidate.nationality, text: candidate.nationality }));
    }
    nationality.value = candidate.nationality || '';
    const role = el('input', { class: 'input', placeholder: 'Role at this workplace' });
    role.value = candidate.assignment?.role_title || '';
    const node = Modal({
      title: 'Update candidate',
      onClose: () => node.remove(),
      children: [
        el('p', {
          class: 'muted',
          text: 'Fix the details for this placement. Login email and password stay with the organisation.',
        }),
        field('First name', first),
        field('Last name', last),
        field('Reference', ref),
        field('ID / passport number', idNumber),
        field('Sponsor', sponsor),
        field('Nationality', nationality),
        field('Role', role),
        el('div', { class: 'modal-actions' }, [
          el('button', { class: 'btn', type: 'button', onClick: () => node.remove() }, ['Cancel']),
          el('button', {
            class: 'btn btn-primary',
            type: 'button',
            onClick: async () => {
              try {
                if (!first.value.trim() || !last.value.trim()) throw new Error('Name is required');
                if (!ref.value.trim()) throw new Error('Reference is required');
                if (!idNumber.value.trim()) throw new Error('ID or passport number is required');
                if (!sponsor.value.trim()) throw new Error('Sponsor name is required');
                if (!nationality.value) throw new Error('Nationality is required');
                await api('host', 'update-candidate', {
                  body: {
                    candidateId: candidate.id,
                    firstName: first.value.trim(),
                    lastName: last.value.trim(),
                    candidateReference: ref.value.trim(),
                    idNumber: idNumber.value.trim(),
                    sponsorName: sponsor.value.trim(),
                    nationality: nationality.value,
                    roleTitle: role.value.trim(),
                  },
                });
                node.remove();
                toast('Candidate updated');
                refreshPanel();
              } catch (e) {
                toast(e.message, 'err');
              }
            },
          }, ['Save changes']),
        ]),
      ],
    });
    document.body.append(node);
  }

  return el('div', { class: 'grid' }, [
    el('p', {
      class: 'muted',
      text: 'Students placed at your workplace. Edit a record if the name, ID, sponsor, or role is wrong.',
    }),
    table(
      ['Name', 'Reference', 'ID / passport', 'Sponsor', 'Nationality', 'Role', 'Edit'],
      (data.candidates || []).map((c) => [
        `${c.first_name} ${c.last_name}`,
        c.candidate_reference,
        c.id_number || '—',
        c.sponsor_name || '—',
        c.nationality || '—',
        c.assignment?.role_title || '',
        el('button', {
          class: 'btn',
          type: 'button',
          onClick: () => openEdit(c),
        }, ['Edit']),
      ]),
    ),
  ]);
}

async function attendance() {
  const data = await api('host', 'attendance', { body: {} });
  const sessions = data.sessions || [];
  return el('div', { class: 'grid' }, [
    el('p', {
      class: 'muted',
      text: 'Confirm or reject each student’s attendance. If you confirmed the wrong day, change it. Use Correct times when the clock times are wrong.',
    }),
    reviewChart(sessions),
    table(
      ['Candidate', 'ID / passport', 'Sponsor', 'In', 'Out', 'Review', 'By', 'Actions'],
      sessions.map((s) => [
        `${s.candidates?.first_name || ''} ${s.candidates?.last_name || ''}`,
        s.candidates?.id_number || '—',
        s.candidates?.sponsor_name || '—',
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
    notifications: AlertsPanel,
    profile: () => AccountForm({ user, showIdentity: false }),
  },
});
