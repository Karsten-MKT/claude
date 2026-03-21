/* ========================================
   Winchester Irish Pub - App Logic
   ======================================== */

(function () {
  'use strict';

  // --- Default Drinks ---
  const DEFAULT_DRINKS = [
    { id: 'guinness', name: 'Guinness', emoji: '🍺', points: 3 },
    { id: 'kilkenny', name: 'Kilkenny', emoji: '🍺', points: 3 },
    { id: 'beer', name: 'Bier', emoji: '🍻', points: 2 },
    { id: 'whiskey', name: 'Whiskey', emoji: '🥃', points: 4 },
    { id: 'irishcoffee', name: 'Irish Coffee', emoji: '☕', points: 3 },
    { id: 'cider', name: 'Cider', emoji: '🍎', points: 2 },
    { id: 'shot', name: 'Shot', emoji: '🥃', points: 4 },
    { id: 'jgl', name: 'JGL', emoji: '🍹', points: 3 },
    { id: 'wine', name: 'Wein', emoji: '🍷', points: 2 },
    { id: 'softdrink', name: 'Softdrink', emoji: '🥤', points: 1 },
  ];

  const AVATARS = [
    '😀', '😎', '🤩', '🥳', '😇', '🤓', '🧐', '😈',
    '👻', '🤠', '🥸', '🤖', '👽', '🧔', '👨', '👩',
    '🧑', '👴', '👵', '🧛', '🧙', '🎅', '🤴', '👸',
  ];

  // --- State ---
  var state = {
    members: [],
    drinks: DEFAULT_DRINKS.map(function (d) { return Object.assign({}, d); }),
    log: [],
    event: null,
    pubLocation: null,
    checkedIn: [],
    photos: [],
  };

  var selectedMemberId = null;
  var selectedDrinkId = null;
  var selectedGalleryMemberId = null;
  var currentLightboxPhotoId = null;
  var countdownInterval = null;
  var selectedAvatar = AVATARS[0];
  var editingMemberEmoji = null;

  // ==========================================
  //  FIREBASE CONFIG
  //  Trage hier deine Firebase-Projekt-Daten ein.
  //  Anleitung: https://console.firebase.google.com
  //  1. Neues Projekt erstellen
  //  2. Realtime Database aktivieren
  //  3. Sicherheitsregeln aus database.rules.json uebernehmen
  //  4. Web-App hinzufuegen und Config hier eintragen
  // ==========================================
  var FIREBASE_CONFIG = {
    databaseURL: "https://winchester-app-c8241-default-rtdb.europe-west1.firebasedatabase.app"
  };

  var db = null;
  var firebaseReady = false;
  var ignoreNextFirebaseUpdate = false;

  function initFirebase() {
    if (!FIREBASE_CONFIG.databaseURL || typeof firebase === 'undefined') return;
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.database();
      firebaseReady = true;
      listenToFirebase();
      console.log('Firebase connected');
    } catch (e) {
      console.error('Firebase init error:', e);
    }
  }

  function syncToFirebase() {
    if (!firebaseReady || !db) return;
    ignoreNextFirebaseUpdate = true;
    var shared = {
      members: state.members,
      log: state.log,
      event: state.event,
      checkedIn: state.checkedIn,
      drinks: state.drinks
    };
    db.ref('winchester').update(shared).then(function () {
      setTimeout(function () { ignoreNextFirebaseUpdate = false; }, 500);
    }).catch(function (e) {
      console.error('Firebase sync error:', e);
      ignoreNextFirebaseUpdate = false;
    });
  }

  function listenToFirebase() {
    if (!firebaseReady || !db) return;
    db.ref('winchester').on('value', function (snapshot) {
      if (ignoreNextFirebaseUpdate) return;
      var data = snapshot.val();
      if (!data) return;
      state.members = data.members || [];
      state.log = data.log || [];
      state.event = data.event || null;
      state.checkedIn = data.checkedIn || [];
      if (data.drinks && data.drinks.length > 0) {
        state.drinks = data.drinks;
        if (migrateDrinkPoints()) {
          syncToFirebase();
        }
      }
      // Photos are stored as object keyed by id → convert to sorted array
      state.photos = [];
      if (data.photos) {
        var photoKeys = Object.keys(data.photos);
        for (var pi = 0; pi < photoKeys.length; pi++) {
          state.photos.push(Object.assign({ id: photoKeys[pi] }, data.photos[photoKeys[pi]]));
        }
        state.photos.sort(function (a, b) { return b.timestamp - a.timestamp; });
      }
      saveLocal();
      renderAll();
    });
  }

  // --- Persistence ---
  function saveLocal() {
    try {
      localStorage.setItem('winchester-state', JSON.stringify(state));
    } catch (e) {
      console.error('Save error:', e);
    }
  }

  function saveState() {
    saveLocal();
    syncToFirebase();
  }

  function migrateDrinkPoints() {
    var newPoints = { guinness: 3, kilkenny: 3, beer: 2, whiskey: 4, irishcoffee: 3, cider: 2, shot: 4, jgl: 3, wine: 2, softdrink: 1 };
    var changed = false;
    for (var d = 0; d < state.drinks.length; d++) {
      var np = newPoints[state.drinks[d].id];
      if (np !== undefined && state.drinks[d].points < np) {
        state.drinks[d].points = np;
        changed = true;
      }
    }
    return changed;
  }

  function loadState() {
    try {
      var saved = localStorage.getItem('winchester-state');
      if (saved) {
        var parsed = JSON.parse(saved);
        state.members = parsed.members || [];
        state.drinks = parsed.drinks && parsed.drinks.length > 0
          ? parsed.drinks
          : DEFAULT_DRINKS.map(function (d) { return Object.assign({}, d); });
        state.log = parsed.log || [];
        state.event = parsed.event || null;
        state.pubLocation = parsed.pubLocation || null;
        state.checkedIn = parsed.checkedIn || [];
        state.photos = parsed.photos || [];

        // Migrate: move rsvp from top-level into event object
        if (parsed.rsvp && parsed.event && !parsed.event.rsvp) {
          state.event.rsvp = parsed.rsvp;
        }

        // Migrate: rename old "cocktail" drink to "jgl"
        for (var i = 0; i < state.drinks.length; i++) {
          if (state.drinks[i].id === 'cocktail') {
            state.drinks[i].id = 'jgl';
            state.drinks[i].name = 'JGL';
          }
        }
        for (var j = 0; j < state.log.length; j++) {
          if (state.log[j].drinkId === 'cocktail') {
            state.log[j].drinkId = 'jgl';
            state.log[j].drinkName = 'JGL';
          }
        }

        // Migrate: add memberName/memberAvatar to old log entries
        for (var k = 0; k < state.log.length; k++) {
          if (!state.log[k].memberName) {
            var logMember = findMember(state.log[k].memberId);
            if (logMember) {
              state.log[k].memberName = logMember.name;
              state.log[k].memberAvatar = logMember.avatar;
            }
          }
        }

        // Migrate: increase all drink points by 1 (softdrink 0->1, beer 1->2, etc.)
        migrateDrinkPoints();
      }
    } catch (e) {
      console.error('Load error:', e);
    }
  }

  function renderAll() {
    var activePage = document.querySelector('.page.active');
    if (activePage) {
      var pageId = activePage.id.replace('page-', '');
      refreshPage(pageId);
    }
  }

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

  // --- Custom Drink Icons ---
  var GUINNESS_SVG = '<svg viewBox="0 0 32 44" width="28" height="36" style="vertical-align:middle;display:inline-block">'
    + '<path d="M6,10 L4,36 Q4,42 10,42 L22,42 Q28,42 28,36 L26,10Z" fill="#0a0000"/>'
    + '<path d="M6,10 L4,36 Q4,42 10,42 L22,42 Q28,42 28,36 L26,10Z" fill="none" stroke="#8b6914" stroke-width="1"/>'
    + '<path d="M6,10 Q6,4 16,4 Q26,4 26,10 L26,16 Q16,19 6,16Z" fill="#f5e0b8"/>'
    + '<ellipse cx="16" cy="6" rx="9" ry="3" fill="#fffaf0" opacity="0.5"/>'
    + '</svg>';

  var WHISKEY_SVG = '<svg viewBox="0 0 32 34" width="28" height="30" style="vertical-align:middle;display:inline-block">'
    + '<path d="M5,4 L3,26 Q3,32 9,32 L23,32 Q29,32 29,26 L27,4Z" fill="none" stroke="#9a9a9a" stroke-width="1.2" opacity="0.6"/>'
    + '<path d="M6,14 L4,26 Q4,31 9,31 L23,31 Q28,31 28,26 L26,14Z" fill="#d4881e"/>'
    + '<path d="M6,14 L26,14" stroke="#e8a030" stroke-width="0.8" opacity="0.6"/>'
    + '<path d="M9,4 L9,28" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>'
    + '</svg>';

  var SHOT_SVG = '<svg viewBox="0 0 24 34" width="22" height="30" style="vertical-align:middle;display:inline-block">'
    + '<path d="M5,4 L4,26 Q4,32 8,32 L16,32 Q20,32 20,26 L19,4Z" fill="none" stroke="#9a9a9a" stroke-width="1.2" opacity="0.6"/>'
    + '<path d="M5,12 L4,26 Q4,31 8,31 L16,31 Q20,31 20,26 L19,12Z" fill="#d4881e"/>'
    + '<path d="M5,12 L19,12" stroke="#e8a030" stroke-width="0.8" opacity="0.6"/>'
    + '</svg>';

  function getDrinkIcon(drink) {
    if (!drink) return '';
    if (drink.id === 'guinness') return GUINNESS_SVG;
    if (drink.id === 'whiskey') return WHISKEY_SVG;
    if (drink.id === 'shot') return SHOT_SVG;
    return drink.emoji;
  }

  // --- Toast ---
  function showToast(message, duration) {
    duration = duration || 2500;
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
      case 'home': renderHome(); break;
      case 'leaderboard': renderLeaderboard(); break;
      case 'drinks': renderDrinksPage(); break;
      case 'gallery': renderGallery(); break;
      case 'settings': renderSettings(); break;
    }
  }

  // ==========================================
  //  HOME
  // ==========================================
  function renderHome() {
    updateCheckInStatus();
    renderCheckedIn();
    renderCountdown();
    renderRsvpStatus();
  }

  function updateCheckInStatus() {
    var el = document.getElementById('check-in-status');
    var count = state.checkedIn.length;
    if (count > 0) {
      el.innerHTML = '<span class="status-dot online"></span><span>' + count + ' im Winchester</span>';
    } else {
      el.innerHTML = '<span class="status-dot offline"></span><span>Niemand eingecheckt</span>';
    }
  }

  function renderCheckedIn() {
    var list = document.getElementById('checked-in-list');
    if (state.checkedIn.length === 0) {
      list.innerHTML = '';
      return;
    }
    var html = '';
    for (var i = 0; i < state.checkedIn.length; i++) {
      var member = findMember(state.checkedIn[i]);
      if (member) {
        html += '<span class="checked-in-chip">' + member.avatar + ' ' + escapeHtml(member.name) + '</span>';
      }
    }
    list.innerHTML = html;
  }

  // --- Countdown ---
  function renderCountdown() {
    var noMsg = document.getElementById('no-event-msg');
    var display = document.getElementById('countdown-display');
    var eventNameEl = document.getElementById('countdown-event-name');

    if (!state.event || !state.event.date) {
      noMsg.style.display = 'block';
      display.style.display = 'none';
      eventNameEl.style.display = 'none';
      if (countdownInterval) clearInterval(countdownInterval);
      return;
    }

    noMsg.style.display = 'none';
    display.style.display = 'flex';

    if (state.event.name) {
      eventNameEl.textContent = state.event.name;
      eventNameEl.style.display = 'block';
    } else {
      eventNameEl.style.display = 'none';
    }

    updateCountdown();
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdown, 1000);
  }

  function updateCountdown() {
    if (!state.event || !state.event.date) return;
    var now = Date.now();
    var target = new Date(state.event.date).getTime();
    var diff = target - now;

    if (diff <= 0) {
      document.getElementById('cd-days').textContent = '00';
      document.getElementById('cd-hours').textContent = '00';
      document.getElementById('cd-minutes').textContent = '00';
      document.getElementById('cd-seconds').textContent = '00';
      if (countdownInterval) clearInterval(countdownInterval);
      showCountdownExpired();
      return;
    }

    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var minutes = Math.floor((diff % 3600000) / 60000);
    var seconds = Math.floor((diff % 60000) / 1000);

    document.getElementById('cd-days').textContent = pad(days);
    document.getElementById('cd-hours').textContent = pad(hours);
    document.getElementById('cd-minutes').textContent = pad(minutes);
    document.getElementById('cd-seconds').textContent = pad(seconds);
  }

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  var countdownExpiredFired = false;

  function showCountdownExpired() {
    if (countdownExpiredFired) return;
    countdownExpiredFired = true;

    // Show expired message overlay on countdown card
    var display = document.getElementById('countdown-display');
    var overlay = document.getElementById('countdown-expired-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      display.style.opacity = '0.3';
    }

    // Play notification chime via Web Audio API
    playNotificationChime();

    // Show toast
    var eventName = (state.event && state.event.name) ? state.event.name : 'Pub-Abend';
    showToast('🍻 ' + eventName + ' — Es geht los!', 5000);
  }

  function playNotificationChime() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    } catch (e) {
      // Audio not supported — silent fallback
    }
  }

  function resetCountdownExpired() {
    countdownExpiredFired = false;
    var overlay = document.getElementById('countdown-expired-overlay');
    var display = document.getElementById('countdown-display');
    if (overlay) overlay.style.display = 'none';
    if (display) display.style.opacity = '1';
  }

  // ==========================================
  //  RSVP (Zu-/Absagen) — stored inside state.event.rsvp
  // ==========================================
  function getEventRsvp() {
    return (state.event && state.event.rsvp) ? state.event.rsvp : {};
  }

  function renderRsvpStatus() {
    var container = document.getElementById('rsvp-status');
    if (!container) return;

    if (!state.event || !state.event.date) {
      container.style.display = 'none';
      return;
    }

    // Don't show RSVP if event is in the past
    if (new Date(state.event.date).getTime() <= Date.now()) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';

    var rsvp = getEventRsvp();
    var yesMembers = [];
    var noMembers = [];
    for (var mid in rsvp) {
      var member = findMember(mid);
      if (!member) continue;
      if (rsvp[mid] === 'yes') yesMembers.push(member);
      else if (rsvp[mid] === 'no') noMembers.push(member);
    }

    var html = '';
    if (yesMembers.length > 0) {
      html += '<div class="rsvp-group"><span class="rsvp-label rsvp-yes-label">Zusagen (' + yesMembers.length + ')</span><div class="rsvp-chips">';
      for (var i = 0; i < yesMembers.length; i++) {
        html += '<span class="rsvp-chip rsvp-chip-yes">' + yesMembers[i].avatar + ' ' + escapeHtml(yesMembers[i].name) + '</span>';
      }
      html += '</div></div>';
    }
    if (noMembers.length > 0) {
      html += '<div class="rsvp-group"><span class="rsvp-label rsvp-no-label">Absagen (' + noMembers.length + ')</span><div class="rsvp-chips">';
      for (var j = 0; j < noMembers.length; j++) {
        html += '<span class="rsvp-chip rsvp-chip-no">' + noMembers[j].avatar + ' ' + escapeHtml(noMembers[j].name) + '</span>';
      }
      html += '</div></div>';
    }
    if (yesMembers.length === 0 && noMembers.length === 0) {
      html = '<p class="hint" style="margin-bottom:0;">Noch keine Rückmeldungen</p>';
    }

    document.getElementById('rsvp-list').innerHTML = html;
  }

  function openRsvp() {
    if (state.members.length === 0) {
      showToast('Füge zuerst Stammgäste hinzu!');
      navigateTo('settings');
      return;
    }
    if (!state.event || !state.event.date) {
      showToast('Zuerst einen Termin setzen!');
      return;
    }
    renderRsvpModal();
    document.getElementById('rsvp-modal').classList.add('show');
  }

  function renderRsvpModal() {
    var container = document.getElementById('rsvp-members');
    var rsvp = getEventRsvp();
    var html = '';
    for (var i = 0; i < state.members.length; i++) {
      var m = state.members[i];
      var status = rsvp[m.id] || '';
      html += '<div class="rsvp-member-row" data-member-id="' + m.id + '">'
        + '<span class="rsvp-member-info"><span class="avatar">' + m.avatar + '</span> ' + escapeHtml(m.name) + '</span>'
        + '<div class="rsvp-buttons">'
        + '<button class="rsvp-btn rsvp-btn-yes' + (status === 'yes' ? ' active' : '') + '" data-member-id="' + m.id + '" data-status="yes">Zu</button>'
        + '<button class="rsvp-btn rsvp-btn-no' + (status === 'no' ? ' active' : '') + '" data-member-id="' + m.id + '" data-status="no">Ab</button>'
        + '</div></div>';
    }
    container.innerHTML = html;

    var buttons = container.querySelectorAll('.rsvp-btn');
    for (var j = 0; j < buttons.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          toggleRsvp(btn.getAttribute('data-member-id'), btn.getAttribute('data-status'));
        });
      })(buttons[j]);
    }
  }

  function toggleRsvp(memberId, status) {
    if (!state.event) return;
    if (!state.event.rsvp) state.event.rsvp = {};
    if (state.event.rsvp[memberId] === status) {
      delete state.event.rsvp[memberId];
    } else {
      state.event.rsvp[memberId] = status;
    }
    saveState();
    renderRsvpModal();
    renderRsvpStatus();
  }

  function closeRsvpModal() {
    document.getElementById('rsvp-modal').classList.remove('show');
  }

  // ==========================================
  //  GALLERY
  // ==========================================
  function renderGallery() {
    renderGalleryMemberSelect();
    renderGalleryGrid();
  }

  function renderGalleryMemberSelect() {
    var container = document.getElementById('gallery-member-select');
    if (!container) return;
    var html = '';
    for (var i = 0; i < state.members.length; i++) {
      var m = state.members[i];
      var sel = selectedGalleryMemberId === m.id ? ' selected' : '';
      html += '<button class="member-chip' + sel + '" data-id="' + m.id + '">'
        + m.avatar + ' ' + escapeHtml(m.name) + '</button>';
    }
    if (html === '') {
      html = '<p class="hint">Füge zuerst Stammgäste unter Einstellungen hinzu.</p>';
    }
    container.innerHTML = html;

    var chips = container.querySelectorAll('.member-chip');
    for (var j = 0; j < chips.length; j++) {
      (function (chip) {
        chip.addEventListener('click', function () {
          selectedGalleryMemberId = selectedGalleryMemberId === chip.getAttribute('data-id')
            ? null : chip.getAttribute('data-id');
          renderGalleryMemberSelect();
          document.getElementById('btn-upload-photo').disabled = !selectedGalleryMemberId;
        });
      })(chips[j]);
    }
  }

  function renderGalleryGrid() {
    var grid = document.getElementById('gallery-grid');
    if (!grid) return;
    if (state.photos.length === 0) {
      grid.innerHTML = '<p class="empty-state gallery-empty">Noch keine Fotos — ladet eure schönsten Pub-Momente hoch!</p>';
      return;
    }
    var html = '';
    for (var i = 0; i < state.photos.length; i++) {
      var p = state.photos[i];
      var date = new Date(p.timestamp);
      var dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
      html += '<div class="gallery-item" data-id="' + p.id + '">'
        + '<img src="' + p.dataUrl + '" alt="Pub-Foto" loading="lazy">'
        + '<div class="gallery-item-meta">'
        + '<span class="gallery-uploader">' + escapeHtml(p.uploaderAvatar || '') + ' ' + escapeHtml(p.uploaderName || '') + '</span>'
        + '<span class="gallery-timestamp">' + dateStr + '</span>'
        + '</div></div>';
    }
    grid.innerHTML = html;

    var items = grid.querySelectorAll('.gallery-item');
    for (var j = 0; j < items.length; j++) {
      (function (item) {
        item.addEventListener('click', function () {
          openLightbox(item.getAttribute('data-id'));
        });
      })(items[j]);
    }
  }

  function triggerPhotoUpload() {
    if (!selectedGalleryMemberId) return;
    document.getElementById('photo-input').click();
  }

  function handlePhotoSelected(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    input.value = '';
    if (!selectedGalleryMemberId) return;

    compressImage(file, function (dataUrl) {
      savePhoto(dataUrl, selectedGalleryMemberId);
    });
  }

  function compressImage(file, callback) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var MAX = 1000;
        var w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
        else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function savePhoto(dataUrl, memberId) {
    var member = findMember(memberId);
    if (!member) return;

    // Limit gallery to 40 photos (remove oldest if exceeded)
    if (state.photos.length >= 40) {
      var oldest = state.photos[state.photos.length - 1];
      deletePhotoById(oldest.id, true);
    }

    var id = uuid() + '-' + uuid();
    var photoData = {
      dataUrl: dataUrl,
      uploadedBy: memberId,
      uploaderName: member.name,
      uploaderAvatar: member.avatar,
      timestamp: Date.now(),
    };

    state.photos.unshift(Object.assign({ id: id }, photoData));
    saveLocal();
    renderGalleryGrid();
    showToast('📸 Foto hochgeladen!');

    if (firebaseReady && db) {
      db.ref('winchester/photos/' + id).set(photoData).catch(function (e) {
        console.error('Photo upload error:', e);
        showToast('Fehler beim Hochladen');
      });
    }
  }

  function openLightbox(photoId) {
    var photo = null;
    for (var i = 0; i < state.photos.length; i++) {
      if (state.photos[i].id === photoId) { photo = state.photos[i]; break; }
    }
    if (!photo) return;
    currentLightboxPhotoId = photoId;

    document.getElementById('lightbox-img').src = photo.dataUrl;
    document.getElementById('lightbox-uploader').textContent =
      (photo.uploaderAvatar || '') + ' ' + (photo.uploaderName || '');
    var d = new Date(photo.timestamp);
    document.getElementById('lightbox-time').textContent =
      d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ', '
      + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    document.getElementById('photo-lightbox').classList.add('show');
  }

  function closeLightbox() {
    document.getElementById('photo-lightbox').classList.remove('show');
    currentLightboxPhotoId = null;
  }

  function deleteCurrentPhoto() {
    if (!currentLightboxPhotoId) return;
    if (!confirm('Dieses Foto wirklich löschen?')) return;
    closeLightbox();
    deletePhotoById(currentLightboxPhotoId, false);
  }

  function deletePhotoById(photoId, silent) {
    state.photos = state.photos.filter(function (p) { return p.id !== photoId; });
    saveLocal();
    renderGalleryGrid();
    if (!silent) showToast('Foto gelöscht');

    if (firebaseReady && db) {
      db.ref('winchester/photos/' + photoId).remove().catch(function (e) {
        console.error('Photo delete error:', e);
      });
    }
  }

  // ==========================================
  //  CHECK-IN
  // ==========================================
  function openCheckIn() {
    if (state.members.length === 0) {
      showToast('Füge zuerst Stammgäste hinzu!');
      navigateTo('settings');
      return;
    }
    renderCheckInModal();
    document.getElementById('checkin-modal').classList.add('show');
  }

  function renderCheckInModal() {
    var container = document.getElementById('checkin-members');
    var html = '';
    for (var i = 0; i < state.members.length; i++) {
      var m = state.members[i];
      var isChecked = state.checkedIn.indexOf(m.id) >= 0;
      html += '<button class="checkin-member-btn ' + (isChecked ? 'checked' : '') + '" data-member-id="' + m.id + '">'
        + '<span class="avatar">' + m.avatar + '</span>'
        + '<span>' + escapeHtml(m.name) + '</span>'
        + (isChecked ? '<span class="check-mark">✓</span>' : '')
        + '</button>';
    }
    container.innerHTML = html;

    // Attach click handlers
    var buttons = container.querySelectorAll('.checkin-member-btn');
    for (var j = 0; j < buttons.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          toggleMemberCheckIn(btn.getAttribute('data-member-id'));
        });
      })(buttons[j]);
    }
  }

  function toggleMemberCheckIn(memberId) {
    var idx = state.checkedIn.indexOf(memberId);
    if (idx >= 0) {
      state.checkedIn.splice(idx, 1);
    } else {
      state.checkedIn.push(memberId);
    }
    saveState();
    renderCheckInModal();
    updateCheckInStatus();
    renderCheckedIn();
  }

  function closeCheckInModal() {
    document.getElementById('checkin-modal').classList.remove('show');
  }

  // ==========================================
  //  LEADERBOARD
  // ==========================================
  function renderLeaderboard() {
    var container = document.getElementById('leaderboard-list');

    if (state.log.length === 0) {
      container.innerHTML = '<p class="empty-state">Noch keine Einträge.<br>Füge Stammgäste hinzu und tracke Getränke!</p>';
      return;
    }

    // Build board from log entries (persists even for deleted members)
    var board = {};
    for (var j = 0; j < state.log.length; j++) {
      var entry = state.log[j];
      var mid = entry.memberId;
      if (!board[mid]) {
        var member = findMember(mid);
        board[mid] = {
          name: member ? member.name : (entry.memberName || 'Ehemaliger Gast'),
          avatar: member ? member.avatar : (entry.memberAvatar || '👤'),
          totalPoints: 0,
          totalDrinks: 0,
          drinkCounts: {}
        };
      }
      board[mid].totalPoints += entry.points;
      board[mid].totalDrinks += 1;
      var dn = entry.drinkName || entry.drinkId;
      board[mid].drinkCounts[dn] = (board[mid].drinkCounts[dn] || 0) + 1;
    }

    // Sort
    var sorted = [];
    for (var id in board) {
      sorted.push(board[id]);
    }
    sorted.sort(function (a, b) { return b.totalPoints - a.totalPoints; });

    var medals = ['🥇', '🥈', '🥉'];
    var html = '';
    for (var k = 0; k < sorted.length; k++) {
      var e = sorted[k];
      var drinkParts = [];
      for (var dname in e.drinkCounts) {
        drinkParts.push(e.drinkCounts[dname] + 'x ' + dname);
      }
      var summary = drinkParts.join(', ');
      var rankClass = k < 3 ? ' top-' + (k + 1) : '';

      html += '<div class="leaderboard-entry' + rankClass + '">'
        + '<div class="rank">' + (k < 3 ? medals[k] : (k + 1)) + '</div>'
        + '<div class="entry-info">'
        + '<div class="entry-name">' + e.avatar + ' ' + escapeHtml(e.name) + '</div>'
        + '<div class="entry-drinks">' + escapeHtml(summary) + '</div>'
        + '</div>'
        + '<div class="entry-points">'
        + '<span class="points-number">' + e.totalPoints + '</span>'
        + '<span class="points-label">Pkt</span>'
        + '</div></div>';
    }
    container.innerHTML = html;
  }

  // ==========================================
  //  DRINKS PAGE
  // ==========================================
  function renderDrinksPage() {
    renderMemberChips();
    renderDrinkGrid();
    renderRecentDrinks();
    updateAddButton();
  }

  function renderMemberChips() {
    var container = document.getElementById('member-select');
    if (state.members.length === 0) {
      container.innerHTML = '<p class="hint">Keine Stammgäste. Unter "Mehr" hinzufügen.</p>';
      return;
    }
    var html = '';
    for (var i = 0; i < state.members.length; i++) {
      var m = state.members[i];
      var sel = selectedMemberId === m.id ? ' selected' : '';
      html += '<button class="member-chip' + sel + '" data-id="' + m.id + '">'
        + m.avatar + ' ' + escapeHtml(m.name) + '</button>';
    }
    container.innerHTML = html;

    var chips = container.querySelectorAll('.member-chip');
    for (var j = 0; j < chips.length; j++) {
      (function (chip) {
        chip.addEventListener('click', function () {
          selectMember(chip.getAttribute('data-id'));
        });
      })(chips[j]);
    }
  }

  function renderDrinkGrid() {
    var container = document.getElementById('drink-select');
    var sortedDrinks = state.drinks.slice().sort(function (a, b) { return b.points - a.points; });
    var html = '';
    for (var i = 0; i < sortedDrinks.length; i++) {
      var d = sortedDrinks[i];
      var sel = selectedDrinkId === d.id ? ' selected' : '';
      html += '<button class="drink-card' + sel + '" data-id="' + d.id + '">'
        + '<span class="drink-emoji">' + getDrinkIcon(d) + '</span>'
        + '<span class="drink-name">' + escapeHtml(d.name) + '</span>'
        + '<span class="drink-points">' + d.points + ' Pkt</span>'
        + '</button>';
    }
    container.innerHTML = html;

    var cards = container.querySelectorAll('.drink-card');
    for (var j = 0; j < cards.length; j++) {
      (function (card) {
        card.addEventListener('click', function () {
          selectDrink(card.getAttribute('data-id'));
        });
      })(cards[j]);
    }
  }

  function renderRecentDrinks() {
    var container = document.getElementById('recent-drinks');
    var recent = state.log.slice(-10).reverse();
    if (recent.length === 0) {
      container.innerHTML = '<p class="hint">Noch keine Runden</p>';
      return;
    }
    var html = '';
    for (var i = 0; i < recent.length; i++) {
      var entry = recent[i];
      var member = findMember(entry.memberId);
      var drink = findDrink(entry.drinkId);
      var time = new Date(entry.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      html += '<div class="recent-entry">'
        + '<span>' + (member ? member.avatar + ' ' + escapeHtml(member.name) : (entry.memberAvatar || '👤') + ' ' + escapeHtml(entry.memberName || 'Unbekannt')) + '</span>'
        + '<span>' + getDrinkIcon(drink || { id: entry.drinkId, emoji: '' }) + ' ' + escapeHtml(entry.drinkName || 'Unbekannt') + '</span>'
        + '<span class="time">' + time + '</span>'
        + '</div>';
    }
    container.innerHTML = html;
  }

  function updateAddButton() {
    document.getElementById('btn-add-drink').disabled = !selectedMemberId || !selectedDrinkId;
  }

  function selectMember(id) {
    selectedMemberId = selectedMemberId === id ? null : id;
    renderMemberChips();
    updateAddButton();
  }

  function selectDrink(id) {
    selectedDrinkId = selectedDrinkId === id ? null : id;
    renderDrinkGrid();
    updateAddButton();
  }

  function addDrink() {
    if (!selectedMemberId || !selectedDrinkId) return;
    var member = findMember(selectedMemberId);
    var drink = findDrink(selectedDrinkId);
    if (!member || !drink) return;

    state.log.push({
      id: uuid(),
      memberId: member.id,
      memberName: member.name,
      memberAvatar: member.avatar,
      drinkId: drink.id,
      drinkName: drink.name,
      points: drink.points,
      timestamp: Date.now(),
    });

    saveState();
    showToast(drink.emoji + ' ' + drink.name + ' für ' + member.name + '! +' + drink.points + ' Pkt');

    // Animate button
    var btn = document.getElementById('btn-add-drink');
    btn.classList.add('prost-anim');
    setTimeout(function () { btn.classList.remove('prost-anim'); }, 600);

    selectedDrinkId = null;
    renderDrinksPage();
  }

  // ==========================================
  //  SETTINGS
  // ==========================================
  function renderSettings() {
    renderMembersList();
    renderNewMemberEmojiPicker();
    renderDrinksManage();
    renderLocationStatus();

    if (state.event) {
      document.getElementById('input-event-name').value = state.event.name || '';
      document.getElementById('input-event-date').value = state.event.date || '';
    }
  }

  function renderMembersList() {
    var container = document.getElementById('members-list');
    if (state.members.length === 0) {
      container.innerHTML = '<p class="hint">Noch keine Stammgäste</p>';
      return;
    }
    var html = '';
    for (var i = 0; i < state.members.length; i++) {
      var m = state.members[i];
      html += '<div class="member-row">'
        + '<button class="member-avatar-btn" data-id="' + m.id + '" title="Emoji ändern">' + m.avatar + '</button>'
        + '<span class="member-name-text">' + escapeHtml(m.name) + '</span>'
        + '<button class="btn-icon btn-delete" data-id="' + m.id + '" title="Entfernen">✕</button>'
        + '</div>';
      if (editingMemberEmoji === m.id) {
        html += '<div class="member-emoji-picker">';
        for (var a = 0; a < AVATARS.length; a++) {
          var selClass = AVATARS[a] === m.avatar ? ' selected' : '';
          html += '<button class="emoji-option' + selClass + '" data-member-id="' + m.id + '" data-emoji="' + AVATARS[a] + '">' + AVATARS[a] + '</button>';
        }
        html += '</div>';
      }
    }
    container.innerHTML = html;

    var avatarBtns = container.querySelectorAll('.member-avatar-btn');
    for (var k = 0; k < avatarBtns.length; k++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          toggleMemberEmojiPicker(btn.getAttribute('data-id'));
        });
      })(avatarBtns[k]);
    }

    var emojiOpts = container.querySelectorAll('.member-emoji-picker .emoji-option');
    for (var e = 0; e < emojiOpts.length; e++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          changeMemberEmoji(btn.getAttribute('data-member-id'), btn.getAttribute('data-emoji'));
        });
      })(emojiOpts[e]);
    }

    var delBtns = container.querySelectorAll('.btn-delete');
    for (var j = 0; j < delBtns.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          removeMember(btn.getAttribute('data-id'));
        });
      })(delBtns[j]);
    }
  }

  function toggleMemberEmojiPicker(memberId) {
    editingMemberEmoji = editingMemberEmoji === memberId ? null : memberId;
    renderMembersList();
  }

  function changeMemberEmoji(memberId, emoji) {
    var member = findMember(memberId);
    if (member) {
      member.avatar = emoji;
      editingMemberEmoji = null;
      saveState();
      renderMembersList();
    }
  }

  function renderDrinksManage() {
    var container = document.getElementById('drinks-manage');
    var sorted = state.drinks.slice().sort(function (a, b) { return b.points - a.points; });
    var html = '';
    for (var i = 0; i < sorted.length; i++) {
      var d = sorted[i];
      html += '<div class="drink-manage-row">'
        + '<span>' + getDrinkIcon(d) + ' ' + escapeHtml(d.name) + '</span>'
        + '<span class="drink-points-badge">' + d.points + ' Pkt</span>'
        + '</div>';
    }
    container.innerHTML = html;
  }

  function renderLocationStatus() {
    var el = document.getElementById('location-status');
    if (state.pubLocation) {
      el.textContent = 'Standort gespeichert (' + state.pubLocation.lat.toFixed(4) + ', ' + state.pubLocation.lng.toFixed(4) + ')';
    } else {
      el.textContent = 'Kein Standort gespeichert';
    }
  }

  function renderNewMemberEmojiPicker() {
    var container = document.getElementById('emoji-picker-new');
    if (!container) return;
    var html = '';
    for (var i = 0; i < AVATARS.length; i++) {
      var selClass = AVATARS[i] === selectedAvatar ? ' selected' : '';
      html += '<button class="emoji-option' + selClass + '" data-emoji="' + AVATARS[i] + '">' + AVATARS[i] + '</button>';
    }
    container.innerHTML = html;

    var opts = container.querySelectorAll('.emoji-option');
    for (var j = 0; j < opts.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          selectedAvatar = btn.getAttribute('data-emoji');
          renderNewMemberEmojiPicker();
        });
      })(opts[j]);
    }
  }

  function addMember() {
    var input = document.getElementById('input-new-member');
    var name = input.value.trim();
    if (!name) return;

    state.members.push({
      id: uuid(),
      name: name,
      avatar: selectedAvatar || AVATARS[0],
    });

    saveState();
    input.value = '';
    selectedAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    renderMembersList();
    renderNewMemberEmojiPicker();
    showToast(name + ' hinzugefügt!');
  }

  function removeMember(id) {
    var member = findMember(id);
    if (!member) return;
    if (!confirm(member.name + ' wirklich entfernen?')) return;

    state.members = state.members.filter(function (m) { return m.id !== id; });
    state.checkedIn = state.checkedIn.filter(function (cid) { return cid !== id; });
    if (state.event && state.event.rsvp) delete state.event.rsvp[id];
    saveState();
    renderMembersList();
    showToast(member.name + ' entfernt');
  }

  function setEvent() {
    var name = document.getElementById('input-event-name').value.trim();
    var date = document.getElementById('input-event-date').value;

    if (!date) {
      showToast('Bitte Datum auswählen!');
      return;
    }

    state.event = { name: name || 'Pub-Abend', date: date };
    resetCountdownExpired();
    saveState();
    renderCountdown();
    showToast('Termin gesetzt!');
  }

  function setLocation() {
    if (!navigator.geolocation) {
      showToast('Geolocation nicht verfügbar');
      return;
    }

    showToast('Ermittle Standort...');
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        state.pubLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        saveState();
        renderLocationStatus();
        showToast('Standort gespeichert!');
      },
      function () {
        showToast('Standort konnte nicht ermittelt werden');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function resetData() {
    if (!confirm('Wirklich ALLE Daten löschen?')) return;
    if (!confirm('Bist du sicher? Alle Getränke, Mitglieder und Termine werden gelöscht.')) return;

    state = {
      members: [],
      drinks: DEFAULT_DRINKS.map(function (d) { return Object.assign({}, d); }),
      log: [],
      event: null,
      pubLocation: null,
      checkedIn: [],
      photos: [],
    };
    if (firebaseReady && db) {
      db.ref('winchester/photos').remove().catch(function () {});
    }
    selectedMemberId = null;
    selectedDrinkId = null;
    if (countdownInterval) clearInterval(countdownInterval);
    saveState();
    renderSettings();
    renderHome();
    showToast('Alle Daten gelöscht');
  }

  // ==========================================
  //  GEOLOCATION PROXIMITY CHECK
  // ==========================================
  function checkProximity() {
    if (!state.pubLocation || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var dist = haversineDistance(
          pos.coords.latitude, pos.coords.longitude,
          state.pubLocation.lat, state.pubLocation.lng
        );
        if (dist < 200) {
          showGeoBanner();
        }
      },
      function () { /* silent fail */ },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function haversineDistance(lat1, lon1, lat2, lon2) {
    var R = 6371e3;
    var toRad = Math.PI / 180;
    var dLat = (lat2 - lat1) * toRad;
    var dLon = (lon2 - lon1) * toRad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad)
      * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function showGeoBanner() {
    document.getElementById('geo-banner').classList.add('show');
  }

  function dismissGeoBanner() {
    document.getElementById('geo-banner').classList.remove('show');
  }

  // ==========================================
  //  HELPERS
  // ==========================================
  function findMember(id) {
    for (var i = 0; i < state.members.length; i++) {
      if (state.members[i].id === id) return state.members[i];
    }
    return null;
  }

  function findDrink(id) {
    for (var i = 0; i < state.drinks.length; i++) {
      if (state.drinks[i].id === id) return state.drinks[i];
    }
    return null;
  }

  // ==========================================
  //  PUBLIC API (for onclick handlers)
  // ==========================================
  window.app = {
    openCheckIn: openCheckIn,
    closeCheckInModal: closeCheckInModal,
    openRsvp: openRsvp,
    closeRsvpModal: closeRsvpModal,
    addDrink: addDrink,
    addMember: addMember,
    setEvent: setEvent,
    setLocation: setLocation,
    resetData: resetData,
    dismissGeoBanner: dismissGeoBanner,
    goToSettings: function () { navigateTo('settings'); },
    triggerPhotoUpload: triggerPhotoUpload,
    handlePhotoSelected: handlePhotoSelected,
    openLightbox: openLightbox,
    closeLightbox: closeLightbox,
    deleteCurrentPhoto: deleteCurrentPhoto,
  };

  // ==========================================
  //  INIT
  // ==========================================
  function init() {
    loadState();
    initFirebase();
    initNavigation();
    renderHome();

    // Check proximity after short delay
    setTimeout(checkProximity, 2000);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(function (err) {
        console.error('SW registration failed:', err);
      });
    }

    // Enter key for member input
    var memberInput = document.getElementById('input-new-member');
    memberInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') addMember();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
