export const FALLBACK_HELP = {
  faqs: [
    {
      id: 'seed-clock',
      category: 'Clocking',
      question: 'How do I clock in?',
      answer: 'Sign in as a candidate, open Home, and tap Clock in. Server time is the official time.',
    },
    {
      id: 'seed-gps',
      category: 'Clocking',
      question: 'Why does Clock-Kit ask for GPS?',
      answer: 'Most sites require a GPS fix on clock-in. A missing or coarse location fails the clock-in.',
    },
    {
      id: 'seed-sync',
      category: 'Clocking',
      question: 'What does PENDING SYNC mean?',
      answer: 'The device saved a clock while offline. It is not official until the server confirms it.',
    },
    {
      id: 'seed-login',
      category: 'Accounts',
      question: 'How do I get a login?',
      answer: 'There is no self-signup. Your organisation or a platform admin creates your account.',
    },
  ],
  support: {
    title: 'Support',
    intro: 'Start with your organisation. Platform support is for login, billing, and service incidents.',
    hours: 'Monday to Friday, 08:00–17:00 SAST',
    email: '',
    phone: '',
    whatsapp: '',
    website: '',
    notes: 'Server time is official. Do not share your password.',
  },
  feedback: {
    title: 'Feedback',
    intro: 'Tell Clock-Kit what is working and what is not. Do not include passwords or ID numbers.',
    categories: ['Suggestion', 'Problem', 'Praise', 'Other'],
  },
};

export const HELP_TABS = [
  { id: 'faq', label: 'FAQs' },
  { id: 'support', label: 'Support' },
  { id: 'feedback', label: 'Feedback' },
];
