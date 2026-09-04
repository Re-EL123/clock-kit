const LOGIN = 'https://re-el123.github.io/clock-kit/login.html';

const DEFAULT_PITCH = {
  learnership: 'You place learners at host employers.',
  ngo: 'You support people who are placed at workplaces.',
  staffing: 'You place people at host workplaces.',
  other: 'You work with people at host sites.',
};

export function outreachWave(priority) {
  const n = Number(priority) || 100;
  if (n < 20) return 'This week';
  if (n < 40) return 'Staffing';
  if (n < 50) return 'NGO';
  if (n < 90) return 'Call only';
  return 'Confirm first';
}

export function outreachChannel(row) {
  if ((Number(row.priority) || 100) >= 90) return 'skip';
  if (row.email) return 'email';
  if (row.whatsapp) return 'whatsapp';
  if (row.phone) return 'call';
  return 'skip';
}

export function channelLabel(channel) {
  return {
    email: 'Email',
    whatsapp: 'WhatsApp',
    call: 'Call',
    skip: 'Confirm first',
  }[channel] || channel;
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function waHref(number) {
  const raw = digits(number);
  if (!raw) return '';
  const intl = raw.startsWith('0') ? `27${raw.slice(1)}` : raw;
  return `https://wa.me/${intl}`;
}

export function outreachDraft(row) {
  const name = row.name || 'there';
  const area = row.area || 'Sandton';
  const pitch = String(row.pitch || DEFAULT_PITCH[row.category] || DEFAULT_PITCH.staffing).trim();
  const channel = outreachChannel(row);
  const subject = 'Attendance for people you place at host sites — Clock-Kit';
  const body = `Hello ${name},

${pitch} Clock-Kit is built for that: candidates clock in at the host, you see attendance, leave, and timesheets in one place. Hosts and learners do not pay; the organisation does.

I work nearby (${area}) and can show a 15-minute walkthrough. If this is not relevant, reply stop and I will not write again.

Akani
Clock-Kit
${LOGIN}`;
  const whatsapp = `Hello, Akani from Clock-Kit. ${pitch} Candidates clock in at the host; the organisation sees attendance. Hosts and learners do not pay. I am nearby in ${area} — 15 minutes if useful. Reply stop if not relevant.`;
  const call = `Ask for the person who runs host placements or learnerships. ${pitch} Clock-Kit: candidates clock in at the host; the organisation sees attendance; hosts and learners do not pay. Offer 15 minutes nearby.`;
  const hint = {
    email: 'Email this draft. Phone in 3–5 days if there is no reply. Honour stop.',
    whatsapp: 'Introduce yourself on WhatsApp first. Do not paste a long pitch unprompted.',
    call: 'No public inbox. Call or use their contact form. Do not guess an email.',
    skip: 'Confirm address, email, and phone before any outreach.',
  }[channel];
  return { subject, body, whatsapp, call, channel, hint, mailText: `Subject: ${subject}\n\n${body}` };
}
