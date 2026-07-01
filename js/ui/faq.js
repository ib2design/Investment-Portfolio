import { escapeHtml } from './dom.js';

const FAQ_INTRO = [  {
    title: 'What is Investment Portfolio?',
    points: [
      'A private tracker for real estate, REIT, and interest-based investments.',
      'Organize by company (partner groups), then add projects under each company.',
      'View active amounts, gains and losses, reminders, and printable reports.',
      'All data stays on your device — no account and nothing uploaded to a server.',
      'Export backups regularly. Data can be lost if you clear browser history or cache, use private browsing, or switch devices.',
    ],
  },
  {
    title: 'How do I use it?',
    points: [
      'Tap + on Portfolio to add a company, then open it to add projects.',
      'Enter investment amount, dates, status, and other details for each project.',
      'Use Portfolio for your overview, Reminders for overdue or at-risk items, and Reports for summaries.',
      'Open Settings to choose Group totals or My share, filter active vs past projects, set a PIN, or back up your data.',
      'Save an exported backup file somewhere safe (cloud, email, or another device) so you can import it later if needed.',
    ],
  },
];

const FAQ_ITEMS = [
  {
    question: 'Do I need to install the app?',
    answer: 'No. Just open it in your browser. You can add it to your home screen if you want.',
  },
  {
    question: 'Does it work on iOS & Android?',
    answer: 'Yes.',
  },
  {
    question: 'Does the app work offline?',
    answer: 'Yes.',
  },
  {
    question: 'Where is my data stored?',
    answer: 'Only on this device, inside your browser. Nothing is uploaded anywhere.',
  },
  {
    question: 'Can I lose my data?',
    answer:
      'Yes. Clearing browser history or cache, using private browsing, removing the home-screen shortcut, or switching devices can erase your portfolio. Export a backup from Settings and keep the file somewhere safe.',
  },
  {
    question: 'How do I back up my data?',
    answer: 'Settings → Backup → Export. If you set an App PIN, the backup is encrypted. Store the file somewhere you can access later.',
  },
  {
    question: 'How do I import my data?',
    answer: 'Settings → Backup → Import → choose your file → enter PIN if required.',
  },
  {
    question: 'How are partner shares calculated?',
    answer: 'Equally split among all partners.',
  },
  {
    question: "What's the difference between Group totals and My share?",
    answer: 'Group totals show full company amounts. My share shows your portion only.',
  },
  {
    question: "What's the App PIN for?",
    answer: 'To lock the app and encrypt your full data export.',
  },
  {
    question: "What's the Project PIN for?",
    answer: 'To encrypt a single project when sharing it.',
  },
  {
    question: 'Can I erase everything?',
    answer: 'Yes. Settings → Erase All Data (permanent).',
  },
];

function faqIntroMarkup({ title, points }) {
  const list = points.map((point) => `<li>${escapeHtml(point)}</li>`).join('');

  return `
    <section class="faq-intro">
      <h3 class="faq-question">${escapeHtml(title)}</h3>
      <ul class="faq-list">${list}</ul>
    </section>
  `;
}

function faqItemMarkup({ question, answer }) {
  return `
    <div class="faq-item">
      <h3 class="faq-question">${escapeHtml(question)}</h3>
      <p class="faq-answer">${escapeHtml(answer)}</p>
    </div>
  `;
}

export function faqContentMarkup() {
  const intro = FAQ_INTRO.map(faqIntroMarkup).join('');
  const items = FAQ_ITEMS.map(faqItemMarkup).join('');

  return `<div class="settings-faq" id="settings-faq">${intro}${items}</div>`;
}