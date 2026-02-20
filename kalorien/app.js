/* ========================================
   Kalorien Tracker - App Logic
   Foto-basiertes Kalorien & Nährstoff Tracking
   ======================================== */

(function () {
  'use strict';

  var DEFAULT_FAVORITES = [
    { id: 'muesli', name: 'Müsli mit Milch', cal: 350, protein: 12, carbs: 52, fat: 8 },
    { id: 'brot', name: 'Brot mit Käse', cal: 320, protein: 14, carbs: 30, fat: 16 },
    { id: 'apfel', name: 'Apfel', cal: 80, protein: 0, carbs: 20, fat: 0 },
    { id: 'reis', name: 'Reis mit Gemüse', cal: 450, protein: 10, carbs: 65, fat: 12 },
    { id: 'pasta', name: 'Pasta Bolognese', cal: 550, protein: 22, carbs: 60, fat: 18 },
    { id: 'salat', name: 'Gemischter Salat', cal: 180, protein: 5, carbs: 12, fat: 10 },
    { id: 'haehnchen', name: 'Hähnchenbrust', cal: 280, protein: 42, carbs: 0, fat: 8 },
    { id: 'joghurt', name: 'Griechischer Joghurt', cal: 150, protein: 15, carbs: 8, fat: 7 },
    { id: 'banane', name: 'Banane', cal: 100, protein: 1, carbs: 25, fat: 0 },
    { id: 'ei', name: 'Ei (gekocht)', cal: 75, protein: 6, carbs: 1, fat: 5 },
    { id: 'avocado', name: 'Avocado Toast', cal: 320, protein: 8, carbs: 28, fat: 20 },
    { id: 'proteinshake', name: 'Protein Shake', cal: 200, protein: 30, carbs: 10, fat: 4 },
  ];

  var MEAL_TYPES = {
    breakfast: { label: 'Frühstück', icon: '🌅' },
    lunch: { label: 'Mittagessen', icon: '☀️' },
    dinner: { label: 'Abendessen', icon: '🌙' },
    snack: { label: 'Snack', icon: '🍪' },
  };

  // --- State ---
  var state = {
    goals: { cal: 2000, protein: 120, carbs: 250, fat: 65 },
    meals: [],
    favorites: DEFAULT_FAVORITES.map(function (f) { return Object.assign({}, f); }),
  };

  var selectedMealType = 'breakfast';
  var currentPhoto = null; // base64 data URL

  // --- Helpers ---
  function uuid() {
    return 'xxxx-xxxx-xxxx'.replace(/x/g, function () {
      return (Math.random() * 16 | 0).toString(16);
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatDate(dateStr) {
    if (dateStr === todayStr()) return 'Heute';
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === yesterday.toISOString().slice(0, 10)) return 'Gestern';
    var parts = dateStr.split('-');
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    var days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return days[d.getDay()] + ', ' + parts[2] + '.' + parts[1] + '.';
  }

  function formatDateFull() {
    var d = new Date();
    var days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    var months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return days[d.getDay()] + ', ' + d.getDate() + '. ' + months[d.getMonth()];
  }

  function getMealsForDate(dateStr) {
    return state.meals.filter(function (m) { return m.date === dateStr; });
  }

  function getDayTotals(dateStr) {
    var meals = getMealsForDate(dateStr);
    var totals = { cal: 0, protein: 0, carbs: 0, fat: 0 };
    for (var i = 0; i < meals.length; i++) {
      totals.cal += meals[i].cal || 0;
      totals.protein += meals[i].protein || 0;
      totals.carbs += meals[i].carbs || 0;
      totals.fat += meals[i].fat || 0;
    }
    return totals;
  }

  // --- Persistence ---
  function saveState() {
    try {
      localStorage.setItem('kalorien-state', JSON.stringify(state));
    } catch (e) {
      console.error('Save error:', e);
    }
  }

  function loadState() {
    try {
      var saved = localStorage.getItem('kalorien-state');
      if (saved) {
        var parsed = JSON.parse(saved);
        state.goals = parsed.goals || { cal: 2000, protein: 120, carbs: 250, fat: 65 };
        state.meals = parsed.meals || [];
        state.favorites = parsed.favorites && parsed.favorites.length > 0
          ? parsed.favorites
          : DEFAULT_FAVORITES.map(function (f) { return Object.assign({}, f); });
      }
    } catch (e) {
      console.error('Load error:', e);
    }
  }

  // --- Toast ---
  function showToast(message, duration) {
    duration = duration || 2000;
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, duration);
  }

  // --- Navigation ---
  function initNavigation() {
    var buttons = document.querySelectorAll('.nav-btn');
    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          navigateTo(btn.getAttribute('data-page'));
        });
      })(buttons[i]);
    }
  }

  function navigateTo(pageId) {
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) pages[i].classList.remove('active');
    document.getElementById('page-' + pageId).classList.add('active');

    var navBtns = document.querySelectorAll('.nav-btn');
    for (var j = 0; j < navBtns.length; j++) navBtns[j].classList.remove('active');
    var activeBtn = document.querySelector('.nav-btn[data-page="' + pageId + '"]');
    if (activeBtn) activeBtn.classList.add('active');

    refreshPage(pageId);
  }

  function refreshPage(pageId) {
    switch (pageId) {
      case 'dashboard': renderDashboard(); break;
      case 'add': renderAddPage(); break;
      case 'history': renderHistory(); break;
      case 'settings': renderSettings(); break;
    }
  }

  // ==========================================
  //  DASHBOARD
  // ==========================================
  function renderDashboard() {
    var today = todayStr();
    var totals = getDayTotals(today);
    var goals = state.goals;

    // Header date
    document.getElementById('header-date').textContent = formatDateFull();

    // Deficit banner
    var banner = document.getElementById('deficit-banner');
    var remaining = goals.cal - totals.cal;
    var isDeficit = remaining >= 0;

    banner.className = 'deficit-banner ' + (isDeficit ? 'deficit' : 'surplus');
    document.getElementById('deficit-icon').textContent = isDeficit ? '🔥' : '⚠️';
    document.getElementById('deficit-label').textContent = isDeficit ? 'Kaloriendefizit' : 'Kalorienüberschuss';
    document.getElementById('deficit-value').textContent = isDeficit
      ? remaining + ' kcal übrig'
      : (totals.cal - goals.cal) + ' kcal über dem Ziel';

    // Ring
    var pct = goals.cal > 0 ? Math.min(totals.cal / goals.cal, 1) : 0;
    var circumference = 2 * Math.PI * 68; // ~427.26
    var offset = circumference - (pct * circumference);
    var ringFill = document.getElementById('ring-fill');
    ringFill.style.strokeDashoffset = offset;
    ringFill.className = 'ring-fill' + (totals.cal > goals.cal ? ' over' : '');

    document.getElementById('ring-consumed').textContent = totals.cal;
    document.getElementById('ring-goal').textContent = goals.cal;

    // Macros
    var proteinPct = goals.protein > 0 ? Math.min((totals.protein / goals.protein) * 100, 100) : 0;
    var carbsPct = goals.carbs > 0 ? Math.min((totals.carbs / goals.carbs) * 100, 100) : 0;
    var fatPct = goals.fat > 0 ? Math.min((totals.fat / goals.fat) * 100, 100) : 0;

    document.getElementById('macro-protein').textContent = totals.protein + 'g / ' + goals.protein + 'g';
    document.getElementById('macro-carbs').textContent = totals.carbs + 'g / ' + goals.carbs + 'g';
    document.getElementById('macro-fat').textContent = totals.fat + 'g / ' + goals.fat + 'g';

    document.getElementById('bar-protein').style.width = proteinPct + '%';
    document.getElementById('bar-carbs').style.width = carbsPct + '%';
    document.getElementById('bar-fat').style.width = fatPct + '%';

    // Meals
    renderMealsToday();
  }

  function renderMealsToday() {
    var container = document.getElementById('meals-today');
    var meals = getMealsForDate(todayStr());

    if (meals.length === 0) {
      container.innerHTML = '<div class="empty-state"><span class="empty-icon">📷</span><p>Fotografiere dein Essen, um zu starten</p></div>';
      return;
    }

    var order = ['breakfast', 'lunch', 'dinner', 'snack'];
    var groups = {};
    for (var i = 0; i < meals.length; i++) {
      var type = meals[i].type || 'snack';
      if (!groups[type]) groups[type] = [];
      groups[type].push(meals[i]);
    }

    var html = '';
    for (var o = 0; o < order.length; o++) {
      var key = order[o];
      if (!groups[key]) continue;
      var typeInfo = MEAL_TYPES[key];
      for (var j = 0; j < groups[key].length; j++) {
        var m = groups[key][j];
        var thumbHtml = m.photo
          ? '<img src="' + m.photo + '" alt="">'
          : '<span class="meal-thumb-placeholder">' + typeInfo.icon + '</span>';

        html += '<div class="meal-card" data-id="' + m.id + '">'
          + '<div class="meal-thumb">' + thumbHtml + '</div>'
          + '<div class="meal-info">'
          + '<div class="meal-name">' + escapeHtml(m.name) + '</div>'
          + '<div class="meal-type-label">' + typeInfo.icon + ' ' + typeInfo.label + '</div>'
          + '<div class="meal-macros-mini">'
          + '<span>P ' + (m.protein || 0) + 'g</span>'
          + '<span>K ' + (m.carbs || 0) + 'g</span>'
          + '<span>F ' + (m.fat || 0) + 'g</span>'
          + '</div>'
          + '</div>'
          + '<span class="meal-cal-badge">' + m.cal + '</span>'
          + '</div>';
      }
    }
    container.innerHTML = html;

    // Attach click handlers for detail modal
    var cards = container.querySelectorAll('.meal-card');
    for (var k = 0; k < cards.length; k++) {
      (function (card) {
        card.addEventListener('click', function () {
          openMealModal(card.getAttribute('data-id'));
        });
      })(cards[k]);
    }
  }

  // ==========================================
  //  MEAL MODAL
  // ==========================================
  function openMealModal(mealId) {
    var meal = null;
    for (var i = 0; i < state.meals.length; i++) {
      if (state.meals[i].id === mealId) { meal = state.meals[i]; break; }
    }
    if (!meal) return;

    var modal = document.getElementById('meal-modal');
    var photoEl = document.getElementById('modal-photo');
    document.getElementById('modal-title').textContent = meal.name;

    if (meal.photo) {
      photoEl.innerHTML = '<img src="' + meal.photo + '" alt="">';
      photoEl.className = 'modal-photo has-photo';
    } else {
      photoEl.innerHTML = '';
      photoEl.className = 'modal-photo';
    }

    document.getElementById('modal-nutrients').innerHTML =
      '<div class="modal-nutrient"><div class="modal-nutrient-value">' + meal.cal + '</div><div class="modal-nutrient-label">Kalorien</div></div>'
      + '<div class="modal-nutrient"><div class="modal-nutrient-value">' + (meal.protein || 0) + 'g</div><div class="modal-nutrient-label">Protein</div></div>'
      + '<div class="modal-nutrient"><div class="modal-nutrient-value">' + (meal.carbs || 0) + 'g</div><div class="modal-nutrient-label">Kohlenhydrate</div></div>'
      + '<div class="modal-nutrient"><div class="modal-nutrient-value">' + (meal.fat || 0) + 'g</div><div class="modal-nutrient-label">Fett</div></div>';

    document.getElementById('modal-delete').onclick = function () {
      deleteMeal(mealId);
      closeModal();
    };

    modal.classList.add('show');
  }

  function closeModal() {
    document.getElementById('meal-modal').classList.remove('show');
  }

  function deleteMeal(id) {
    state.meals = state.meals.filter(function (m) { return m.id !== id; });
    saveState();
    renderDashboard();
    showToast('Mahlzeit gelöscht');
  }

  // ==========================================
  //  ADD MEAL PAGE
  // ==========================================
  function renderAddPage() {
    renderMealTypeChips();
    renderQuickAdd();
    resetPhotoPreview();
  }

  function resetPhotoPreview() {
    currentPhoto = null;
    var preview = document.getElementById('photo-preview');
    preview.innerHTML = '<span class="photo-placeholder-icon">📷</span><span class="photo-placeholder-text">Foto aufnehmen</span>';
    preview.classList.remove('has-photo');
  }

  function renderMealTypeChips() {
    var container = document.getElementById('meal-type-select');
    var html = '';
    for (var key in MEAL_TYPES) {
      var t = MEAL_TYPES[key];
      var sel = selectedMealType === key ? ' selected' : '';
      html += '<button class="type-chip' + sel + '" data-type="' + key + '">'
        + t.icon + ' ' + t.label + '</button>';
    }
    container.innerHTML = html;

    var chips = container.querySelectorAll('.type-chip');
    for (var i = 0; i < chips.length; i++) {
      (function (chip) {
        chip.addEventListener('click', function () {
          selectedMealType = chip.getAttribute('data-type');
          renderMealTypeChips();
        });
      })(chips[i]);
    }
  }

  function renderQuickAdd() {
    var container = document.getElementById('quick-add');
    if (state.favorites.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">Keine Favoriten vorhanden.</p>';
      return;
    }
    var html = '';
    for (var i = 0; i < state.favorites.length; i++) {
      var f = state.favorites[i];
      html += '<button class="quick-card" data-id="' + f.id + '">'
        + '<span class="quick-name">' + escapeHtml(f.name) + '</span>'
        + '<span class="quick-cal">' + f.cal + ' kcal</span>'
        + '<span class="quick-macros">P' + (f.protein || 0) + ' K' + (f.carbs || 0) + ' F' + (f.fat || 0) + '</span>'
        + '</button>';
    }
    container.innerHTML = html;

    var cards = container.querySelectorAll('.quick-card');
    for (var j = 0; j < cards.length; j++) {
      (function (card) {
        card.addEventListener('click', function () {
          quickAddMeal(card.getAttribute('data-id'));
        });
      })(cards[j]);
    }
  }

  // --- Photo handling ---
  function takePhoto() {
    document.getElementById('camera-input').click();
  }

  function pickPhoto() {
    document.getElementById('gallery-input').click();
  }

  function handlePhoto(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      // Resize to save localStorage space
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        var maxSize = 400;
        var w = img.width;
        var h = img.height;
        if (w > h) { h = (h / w) * maxSize; w = maxSize; }
        else { w = (w / h) * maxSize; h = maxSize; }
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        currentPhoto = canvas.toDataURL('image/jpeg', 0.7);

        // Update preview
        var preview = document.getElementById('photo-preview');
        preview.innerHTML = '<img src="' + currentPhoto + '" alt="Foto">';
        preview.classList.add('has-photo');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function addMeal() {
    var name = document.getElementById('input-meal-name').value.trim();
    var cal = parseInt(document.getElementById('input-cal').value) || 0;
    var protein = parseInt(document.getElementById('input-protein').value) || 0;
    var carbs = parseInt(document.getElementById('input-carbs').value) || 0;
    var fat = parseInt(document.getElementById('input-fat').value) || 0;

    if (!name) { showToast('Bitte Bezeichnung eingeben'); return; }
    if (cal <= 0) { showToast('Bitte Kalorien eingeben'); return; }

    state.meals.push({
      id: uuid(),
      name: name,
      cal: cal,
      protein: protein,
      carbs: carbs,
      fat: fat,
      type: selectedMealType,
      photo: currentPhoto,
      date: todayStr(),
      timestamp: Date.now(),
    });

    saveState();
    showToast(name + ' gespeichert (' + cal + ' kcal)');

    // Clear form
    document.getElementById('input-meal-name').value = '';
    document.getElementById('input-cal').value = '';
    document.getElementById('input-protein').value = '';
    document.getElementById('input-carbs').value = '';
    document.getElementById('input-fat').value = '';
    resetPhotoPreview();

    renderDashboard();
  }

  function quickAddMeal(favId) {
    var fav = null;
    for (var i = 0; i < state.favorites.length; i++) {
      if (state.favorites[i].id === favId) { fav = state.favorites[i]; break; }
    }
    if (!fav) return;

    state.meals.push({
      id: uuid(),
      name: fav.name,
      cal: fav.cal,
      protein: fav.protein || 0,
      carbs: fav.carbs || 0,
      fat: fav.fat || 0,
      type: selectedMealType,
      photo: null,
      date: todayStr(),
      timestamp: Date.now(),
    });

    saveState();
    showToast(fav.name + ' (' + fav.cal + ' kcal)');
    renderDashboard();
  }

  // ==========================================
  //  HISTORY PAGE
  // ==========================================
  function renderHistory() {
    var container = document.getElementById('history-list');

    var dates = {};
    for (var i = 0; i < state.meals.length; i++) {
      dates[state.meals[i].date] = true;
    }
    var sortedDates = Object.keys(dates).sort().reverse();

    if (sortedDates.length === 0) {
      container.innerHTML = '<div class="empty-state"><span class="empty-icon">📊</span><p>Noch keine Einträge</p></div>';
      return;
    }

    var html = '';
    for (var d = 0; d < sortedDates.length; d++) {
      var date = sortedDates[d];
      var totals = getDayTotals(date);
      var pct = state.goals.cal > 0 ? Math.min((totals.cal / state.goals.cal) * 100, 100) : 0;
      var isOver = totals.cal > state.goals.cal;
      var statusClass = isOver ? 'over' : 'under';

      html += '<div class="history-day">'
        + '<div class="history-day-header">'
        + '<span class="history-date">' + formatDate(date) + '</span>'
        + '<span class="history-total ' + statusClass + '">' + totals.cal + ' / ' + state.goals.cal + ' kcal</span>'
        + '</div>'
        + '<div class="history-bar"><div class="history-bar-fill ' + statusClass + '" style="width:' + pct + '%"></div></div>'
        + '<div class="history-macros">'
        + '<span>Protein: ' + totals.protein + 'g</span>'
        + '<span>Carbs: ' + totals.carbs + 'g</span>'
        + '<span>Fett: ' + totals.fat + 'g</span>'
        + '</div>'
        + '</div>';
    }
    container.innerHTML = html;
  }

  // ==========================================
  //  SETTINGS PAGE
  // ==========================================
  function renderSettings() {
    document.getElementById('input-goal-cal').value = state.goals.cal;
    document.getElementById('input-goal-protein').value = state.goals.protein;
    document.getElementById('input-goal-carbs').value = state.goals.carbs;
    document.getElementById('input-goal-fat').value = state.goals.fat;
    renderFavorites();
  }

  function saveGoals() {
    var cal = parseInt(document.getElementById('input-goal-cal').value);
    var protein = parseInt(document.getElementById('input-goal-protein').value);
    var carbs = parseInt(document.getElementById('input-goal-carbs').value);
    var fat = parseInt(document.getElementById('input-goal-fat').value);

    if (!cal || cal < 500) { showToast('Kalorien: min. 500'); return; }

    state.goals = {
      cal: cal,
      protein: protein || 0,
      carbs: carbs || 0,
      fat: fat || 0,
    };
    saveState();
    showToast('Ziele gespeichert');
    renderDashboard();
  }

  function renderFavorites() {
    var container = document.getElementById('favorites-list');
    if (state.favorites.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">Keine Favoriten</p>';
      return;
    }
    var html = '';
    for (var i = 0; i < state.favorites.length; i++) {
      var f = state.favorites[i];
      html += '<div class="favorite-row">'
        + '<div class="favorite-info">'
        + '<span class="favorite-name">' + escapeHtml(f.name) + '</span>'
        + '<span class="favorite-detail">' + f.cal + ' kcal · P' + (f.protein || 0) + ' K' + (f.carbs || 0) + ' F' + (f.fat || 0) + '</span>'
        + '</div>'
        + '<button class="favorite-delete" data-id="' + f.id + '">✕</button>'
        + '</div>';
    }
    container.innerHTML = html;

    var delBtns = container.querySelectorAll('.favorite-delete');
    for (var j = 0; j < delBtns.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          removeFavorite(btn.getAttribute('data-id'));
        });
      })(delBtns[j]);
    }
  }

  function addFavorite() {
    var name = document.getElementById('input-fav-name').value.trim();
    var cal = parseInt(document.getElementById('input-fav-cal').value) || 0;
    var protein = parseInt(document.getElementById('input-fav-protein').value) || 0;
    var carbs = parseInt(document.getElementById('input-fav-carbs').value) || 0;
    var fat = parseInt(document.getElementById('input-fav-fat').value) || 0;

    if (!name) { showToast('Bitte Name eingeben'); return; }
    if (cal <= 0) { showToast('Bitte Kalorien eingeben'); return; }

    state.favorites.push({ id: uuid(), name: name, cal: cal, protein: protein, carbs: carbs, fat: fat });
    saveState();
    document.getElementById('input-fav-name').value = '';
    document.getElementById('input-fav-cal').value = '';
    document.getElementById('input-fav-protein').value = '';
    document.getElementById('input-fav-carbs').value = '';
    document.getElementById('input-fav-fat').value = '';
    renderFavorites();
    showToast(name + ' als Favorit gespeichert');
  }

  function removeFavorite(id) {
    state.favorites = state.favorites.filter(function (f) { return f.id !== id; });
    saveState();
    renderFavorites();
    showToast('Favorit entfernt');
  }

  function resetData() {
    if (!confirm('Wirklich ALLE Daten löschen?')) return;
    if (!confirm('Bist du sicher? Alle Mahlzeiten und Einstellungen werden gelöscht.')) return;

    state = {
      goals: { cal: 2000, protein: 120, carbs: 250, fat: 65 },
      meals: [],
      favorites: DEFAULT_FAVORITES.map(function (f) { return Object.assign({}, f); }),
    };
    saveState();
    renderDashboard();
    showToast('Alle Daten gelöscht');
  }

  // ==========================================
  //  PUBLIC API
  // ==========================================
  window.app = {
    navigateTo: navigateTo,
    addMeal: addMeal,
    takePhoto: takePhoto,
    pickPhoto: pickPhoto,
    saveGoals: saveGoals,
    addFavorite: addFavorite,
    resetData: resetData,
    closeModal: closeModal,
  };

  // ==========================================
  //  INIT
  // ==========================================
  function init() {
    loadState();
    initNavigation();
    renderDashboard();

    // Camera input handler
    document.getElementById('camera-input').addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) handlePhoto(e.target.files[0]);
    });

    // Gallery input handler
    document.getElementById('gallery-input').addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) handlePhoto(e.target.files[0]);
    });

    // Close modal on background click
    document.getElementById('meal-modal').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(function (err) {
        console.error('SW registration failed:', err);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
