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

// 3. Two-state dark mode toggle per `dark-mode-toggle`
const STORAGE_KEY = 'mgb-launchpad-color-scheme';
const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeToggleLabel = document.getElementById('theme-toggle-label');
const themeToggleIcon = document.getElementById('theme-toggle-icon');
const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

function getRenderedScheme() {
  const content = metaColorScheme?.content || 'light dark';
  if (content === 'dark' || content === 'light') {
    return content;
  }
  return darkMediaQuery.matches ? 'dark' : 'light';
}

function updateThemeButtonUI() {
  if (!themeToggleBtn || !themeToggleLabel || !themeToggleIcon) return;
  const current = getRenderedScheme();
  if (current === 'dark') {
    themeToggleIcon.textContent = '☀';
    themeToggleLabel.textContent = 'Light Mode';
    themeToggleBtn.setAttribute('aria-label', 'Switch to light color scheme');
  } else {
    themeToggleIcon.textContent = '☾';
    themeToggleLabel.textContent = 'Dark Mode';
    themeToggleBtn.setAttribute('aria-label', 'Switch to dark color scheme');
  }
}

if (themeToggleBtn && metaColorScheme) {
  updateThemeButtonUI();

  themeToggleBtn.addEventListener('click', () => {
    const currentRendered = getRenderedScheme();
    const targetScheme = currentRendered === 'dark' ? 'light' : 'dark';
    const systemScheme = darkMediaQuery.matches ? 'dark' : 'light';

    try {
      if (targetScheme === systemScheme) {
        // Target matches current system preference: remove stored override so OS preference resumes
        localStorage.removeItem(STORAGE_KEY);
        metaColorScheme.content = 'light dark';
      } else {
        localStorage.setItem(STORAGE_KEY, targetScheme);
        metaColorScheme.content = targetScheme;
      }
    } catch {
      metaColorScheme.content = targetScheme;
    }

    updateThemeButtonUI();
  });

  darkMediaQuery.addEventListener('change', () => {
    updateThemeButtonUI();
  });

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      metaColorScheme.content = event.newValue ?? 'light dark';
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

// 5. Audience-Specific Inquiry / Engagement Modal Preset Buttons
const inquiryDialog = document.getElementById('modal-engage');
const inquiryTrackSelect = document.getElementById('inquiry-track');

document.querySelectorAll('[data-engage-track]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const track = trigger.getAttribute('data-engage-track');
    if (inquiryTrackSelect && track) {
      inquiryTrackSelect.value = track;
    }
    if (inquiryDialog && inquiryDialog instanceof HTMLDialogElement && !inquiryDialog.open) {
      inquiryDialog.showModal();
    }
  });
});

const inquiryForm = document.getElementById('launchpad-inquiry-form');
const inquiryFeedback = document.getElementById('inquiry-feedback');

if (inquiryForm) {
  inquiryForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(inquiryForm);
    const name = formData.get('name') || '';
    const email = formData.get('email') || '';
    const affiliation = formData.get('affiliation') || '';
    const track = formData.get('track') || 'General Inquiry';
    const message = formData.get('message') || '';

    const subject = encodeURIComponent(`[MGB NSI Launchpad] ${track} — ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nAffiliation / Organization: ${affiliation}\nPathway: ${track}\n\nMessage / Summary:\n${message}`
    );

    if (inquiryFeedback) {
      inquiryFeedback.hidden = false;
      inquiryFeedback.textContent =
        'Thank you! Opening your email client with your pre-formatted MGB NSI Launchpad inquiry...';
    }

    window.location.href = `mailto:phadar@mgb.org?cc=scash@mgh.harvard.edu,jmorganroth@mgb.org&subject=${subject}&body=${body}`;
  });
}
