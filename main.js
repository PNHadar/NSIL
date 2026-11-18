// 1. Feature-detect Invoker Commands API per modern-web-guidance `declarative-dialog-popover-control`
if (!('commandForElement' in HTMLButtonElement.prototype)) {
  (async () => {
    try {
      await import('https://esm.run/invokers-polyfill');
    } catch {
      // Offline / firewall fallback handled by delegated click listener below
    }
  })();

  document.addEventListener('click', (event) => {
    const button = event.composedPath().find((el) => el.matches?.('button[commandfor]'));
    if (!button) return;

    const targetId = button.getAttribute('commandfor');
    const command = button.getAttribute('command');
    const target = targetId ? document.getElementById(targetId) : null;

    if (!target || !(target instanceof HTMLDialogElement)) return;

    if (command === 'show-modal' && !target.open) {
      target.showModal();
    } else if (command === 'close' && target.open) {
      target.close();
    }
  });
}

// 2. Fallback for <dialog closedby="any"> light-dismiss per `light-dismiss-a-dialog`
if (!('closedBy' in HTMLDialogElement.prototype)) {
  document.querySelectorAll('dialog[closedby="any"]').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (isDialogContent) return;
      dialog.close();
    });
  });
}

// 3. Light-by-default MGB color scheme toggle
const STORAGE_KEY = 'mgb-launchpad-color-scheme';
const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeToggleLabel = document.getElementById('theme-toggle-label');
const themeToggleIcon = document.getElementById('theme-toggle-icon');

function getRenderedScheme() {
  return metaColorScheme?.content === 'dark' ? 'dark' : 'light';
}

function updateThemeButtonUI() {
  if (!themeToggleBtn || !themeToggleLabel || !themeToggleIcon) return;
  const current = getRenderedScheme();
  if (current === 'dark') {
    themeToggleIcon.textContent = '☀';
    themeToggleLabel.textContent = 'Light Mode';
    themeToggleBtn.setAttribute('aria-label', 'Switch to MGB light color scheme');
  } else {
    themeToggleIcon.textContent = '☾';
    themeToggleLabel.textContent = 'Dark Mode';
    themeToggleBtn.setAttribute('aria-label', 'Switch to MGB dark color scheme');
  }
}

if (themeToggleBtn && metaColorScheme) {
  updateThemeButtonUI();

  themeToggleBtn.addEventListener('click', () => {
    const currentRendered = getRenderedScheme();
    const targetScheme = currentRendered === 'dark' ? 'light' : 'dark';

    try {
      if (targetScheme === 'light') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, 'dark');
      }
    } catch {
      // Ignore storage restrictions
    }

    metaColorScheme.content = targetScheme;
    updateThemeButtonUI();
  });

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      metaColorScheme.content = event.newValue === 'dark' ? 'dark' : 'light';
      updateThemeButtonUI();
    }
  });
}

// 4. Leadership Cards Filter & Search
const filterButtons = document.querySelectorAll('[data-leader-filter]');
const leaderCards = document.querySelectorAll('.leader-card[data-category]');
const searchInput = document.getElementById('leader-search-input');
const filterStatus = document.getElementById('leader-filter-status');

let activeCategory = 'all';
let searchQuery = '';

function filterLeaderCards() {
  let visibleCount = 0;
  const normalizedQuery = searchQuery.trim().toLowerCase();

  leaderCards.forEach((card) => {
    const categories = (card.getAttribute('data-category') || '').split(/\s+/);
    const matchesCategory = activeCategory === 'all' || categories.includes(activeCategory);
    const cardText = (card.textContent || '').toLowerCase();
    const matchesSearch = !normalizedQuery || cardText.includes(normalizedQuery);

    const isVisible = matchesCategory && matchesSearch;
    card.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  });

  if (filterStatus) {
    filterStatus.textContent = `Showing ${visibleCount} of ${leaderCards.length} leadership profiles.`;
  }
}

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    activeCategory = btn.getAttribute('data-leader-filter') || 'all';
    filterButtons.forEach((other) => {
      other.setAttribute('aria-pressed', String(other === btn));
    });
    filterLeaderCards();
  });
});

if (searchInput) {
  searchInput.addEventListener('input', (event) => {
    searchQuery = event.target.value || '';
    filterLeaderCards();
  });
}

// 5. Audience-Specific Inquiry / Engagement Modal + Live Email Compose Links
const RECIPIENT_EMAILS = 'scash@mgh.harvard.edu,phadar@mgh.harvard.edu';
const inquiryDialog = document.getElementById('modal-engage');
const inquiryTrackSelect = document.getElementById('inquiry-track');
const inquiryForm = document.getElementById('launchpad-inquiry-form');
const inquiryFeedback = document.getElementById('inquiry-feedback');
const mailtoLink = document.getElementById('inquiry-mailto-link');
const outlookLink = document.getElementById('inquiry-outlook-link');
const gmailLink = document.getElementById('inquiry-gmail-link');
const copyBtn = document.getElementById('inquiry-copy-btn');

function buildEmailParts() {
  const formData = inquiryForm ? new FormData(inquiryForm) : null;
  const track = String(formData?.get('track') || 'General Program Leadership Inquiry').trim();
  const name = String(formData?.get('name') || '').trim();
  const email = String(formData?.get('email') || '').trim();
  const affiliation = String(formData?.get('affiliation') || '').trim();
  const message = String(formData?.get('message') || '').trim();

  const subjectText = name
    ? `[MGB NSI Launchpad] ${track} — ${name}`
    : `[MGB NSI Launchpad] ${track}`;

  const lines = [
    'Dear Dr. Cash and Dr. Hadar,',
    '',
    `I am reaching out regarding the MGB NSI Launchpad (${track}).`,
    '',
  ];
  if (name) lines.push(`Name: ${name}`);
  if (email) lines.push(`Email: ${email}`);
  if (affiliation) lines.push(`Department / Organization: ${affiliation}`);
  if (name || email || affiliation) lines.push('');
  if (message) {
    lines.push('Summary / Message:');
    lines.push(message);
    lines.push('');
  }
  lines.push('Best regards,');
  if (name) lines.push(name);

  const bodyText = lines.join('\r\n');
  return { subjectText, bodyText };
}

function syncInquiryEmailLinks() {
  const { subjectText, bodyText } = buildEmailParts();
  const encodedTo = encodeURIComponent(RECIPIENT_EMAILS);
  const encodedSubject = encodeURIComponent(subjectText);
  const encodedBody = encodeURIComponent(bodyText);

  if (mailtoLink) {
    mailtoLink.href = `mailto:${RECIPIENT_EMAILS}?subject=${encodedSubject}&body=${encodedBody}`;
  }
  if (outlookLink) {
    outlookLink.href = `https://outlook.office.com/mail/deeplink/compose?to=${encodedTo}&subject=${encodedSubject}&body=${encodedBody}`;
  }
  if (gmailLink) {
    gmailLink.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedTo}&su=${encodedSubject}&body=${encodedBody}`;
  }
}

syncInquiryEmailLinks();

document.querySelectorAll('[data-engage-track]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const track = trigger.getAttribute('data-engage-track');
    if (inquiryTrackSelect && track) {
      inquiryTrackSelect.value = track;
    }
    if (inquiryFeedback) {
      inquiryFeedback.hidden = true;
    }
    syncInquiryEmailLinks();
    if (inquiryDialog && inquiryDialog instanceof HTMLDialogElement && !inquiryDialog.open) {
      inquiryDialog.showModal();
    }
  });
});

if (inquiryForm) {
  inquiryForm.addEventListener('input', syncInquiryEmailLinks);
  inquiryForm.addEventListener('change', syncInquiryEmailLinks);
  inquiryForm.addEventListener('submit', (event) => {
    event.preventDefault();
    syncInquiryEmailLinks();
    mailtoLink?.click();
  });
}

if (mailtoLink && inquiryFeedback) {
  mailtoLink.addEventListener('click', () => {
    syncInquiryEmailLinks();
    inquiryFeedback.hidden = false;
    inquiryFeedback.textContent =
      'Opening your default email app addressed to scash@mgh.harvard.edu & phadar@mgh.harvard.edu. (Using browser webmail instead? Click "Open in MGB / Outlook Web" or "Open in Gmail" above.)';
  });
}

if (copyBtn && inquiryFeedback) {
  copyBtn.addEventListener('click', async () => {
    const { subjectText, bodyText } = buildEmailParts();
    const clip = `To: scash@mgh.harvard.edu, phadar@mgh.harvard.edu\nSubject: ${subjectText}\n\n${bodyText}`;
    try {
      await navigator.clipboard.writeText(clip);
      inquiryFeedback.hidden = false;
      inquiryFeedback.textContent =
        'Copied recipients (scash@mgh.harvard.edu, phadar@mgh.harvard.edu) and draft message to your clipboard!';
    } catch {
      inquiryFeedback.hidden = false;
      inquiryFeedback.textContent = 'Recipients: scash@mgh.harvard.edu, phadar@mgh.harvard.edu';
    }
  });
}
