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

function onTraineesUpdated() {
  // Re-populate dashboard trainee selector
  const dashSelect = document.getElementById('dashboard-trainee');
  const currentVal = dashSelect.value;
  dashSelect.innerHTML = '<option value="">Bitte wählen...</option>';
  TRAINEES.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    dashSelect.appendChild(opt);
  });
  if (TRAINEES.includes(currentVal)) dashSelect.value = currentVal;

  // Re-render table (updates trainee dropdowns)
  renderTable();

  // Re-render trainee management list
  if (typeof renderTraineeManagement === 'function') renderTraineeManagement();
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
  if (view === 'settings' && typeof renderTraineeManagement === 'function') renderTraineeManagement();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  // Tab navigation
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  // Initialize modules
  initTable();
  initEditModal();
  initCalendar();
  initDashboard();
  initImport();
  initSettings();
  initFirebase();
});
