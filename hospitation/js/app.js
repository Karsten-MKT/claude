// ============================================================
// app.js - Initialisierung, Tab-Navigation, globaler State
// ============================================================

let currentView = 'table';
let calendarNeedsRender = true;

function onToursUpdated() {
  renderTable();
  if (currentView === 'calendar') {
    renderCalendar();
    calendarNeedsRender = false;
  } else {
    calendarNeedsRender = true;
  }
  if (currentView === 'dashboard') renderDashboard();
}

function switchView(view) {
  currentView = view;

  // Update tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === view);
  });

  // Show/hide sections
  document.querySelectorAll('.view-section').forEach(section => {
    section.classList.toggle('hidden', section.id !== `view-${view}`);
  });

  // Lazy render calendar on first visit
  if (view === 'calendar' && calendarNeedsRender) {
    renderCalendar();
    calendarNeedsRender = false;
  }

  if (view === 'dashboard') renderDashboard();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  // Tab navigation
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  // Initialize modules
  initTable();
  initCalendar();
  initDashboard();
  initImport();
  initFirebase();
});
