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
    { id: 'gingerale', name: 'Ginger Ale', emoji: '🫚', points: 1 },
  ];

  // --- Inventory config for spirits (cl-based tracking) ---
  // Drinks that consume from a spirit inventory rather than 1:1
  var SPIRIT_CONFIG = {
    whiskey:     { clPerServing: 4, clPerBottle: 75, defaultUnit: 'Flaschen' },
    shot:        { clPerServing: 4, clPerBottle: 75, defaultUnit: 'Flaschen' },
    jgl:         { consumesFrom: 'whiskey', clPerServing: 4 },
    irishcoffee: { consumesFrom: 'whiskey', clPerServing: 4 },
  };

  // Default units per drink type
  var DEFAULT_UNITS = {
    guinness: 'Dosen',
    kilkenny: 'Dosen',
    beer: 'Dosen',
  };

  // --- Alcohol content per drink in grams ---
  var DRINK_ALCOHOL = {
    guinness: 14.6,    // 0.44l Dose, 4.2% vol
    kilkenny: 17.0,    // 0.5l, 4.3% vol
    beer: 19.7,        // 0.5l, 5% vol (Durchschnitt)
    whiskey: 12.6,     // 4cl, 40% vol
    irishcoffee: 12.6, // 4cl Whiskey
    cider: 17.8,       // 0.5l, 4.5% vol
    shot: 12.6,        // 4cl, 40% vol
    jgl: 12.6,         // 4cl Whiskey + Ginger Ale + Limette
    wine: 18.9,        // 0.2l, 12% vol
    softdrink: 0,
    gingerale: 0,
  };

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
    inventory: {},          // { drinkId: { stock: number, unit: string } }
    inventoryResetAt: 0,    // timestamp — only count log entries after this
  };

  var selectedMemberId = null;
  var selectedDrinkId = null;
  var selectedGalleryMemberId = null;
  var currentLightboxPhotoId = null;
  var countdownInterval = null;
  var selectedAvatar = AVATARS[0];
  var editingMemberEmoji = null;

  // --- Device ID (persistent per device, for photo ownership) ---
  var deviceId = (function () {
    var key = 'winchester-device-id';
    var id = localStorage.getItem(key);
    if (!id) {
      id = 'dev-' + uuid() + '-' + uuid() + '-' + Date.now().toString(36);
      localStorage.setItem(key, id);
    }
    return id;
  })();

  // Track last known event to detect new events from Firebase
  var lastKnownEventDate = null;

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
  var ignorePhotoUpdate = false;
  var renderDebounceTimer = null;

  // Debounced save+render to avoid rapid-fire when multiple Firebase listeners fire
  function debouncedSaveAndRender() {
    saveLocal();
    if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
    renderDebounceTimer = setTimeout(function () {
      renderDebounceTimer = null;
      renderAll();
    }, 50);
  }

  function initFirebase() {
    if (!FIREBASE_CONFIG.databaseURL || typeof firebase === 'undefined') return;
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.database();
      firebaseReady = true;
      migrateFirebaseLog();
      listenToFirebase();
      console.log('Firebase connected');
    } catch (e) {
      console.error('Firebase init error:', e);
    }
  }

  // One-time migration: convert old array-style data to individual entries
  function migrateFirebaseLog() {
    if (!firebaseReady || !db) return;

    // Migrate log from array to {id: entry} object
    db.ref('winchester/log').once('value', function (snapshot) {
      var data = snapshot.val();
      if (!data) return;
      if (Array.isArray(data)) {
        var updates = {};
        for (var i = 0; i < data.length; i++) {
          if (!data[i]) continue;
          var entry = data[i];
          var id = entry.id || uuid();
          var entryData = Object.assign({}, entry);
          delete entryData.id;
          updates[id] = entryData;
        }
        db.ref('winchester/log').set(updates).then(function () {
          console.log('Migrated log from array to individual entries');
        }).catch(function (e) {
          console.error('Log migration error:', e);
        });
      }
    });

    // Migrate checkedIn from array to {memberId: true} object
    db.ref('winchester/checkedIn').once('value', function (snapshot) {
      var data = snapshot.val();
      if (!data) return;
      if (Array.isArray(data)) {
        var updates = {};
        for (var i = 0; i < data.length; i++) {
          if (data[i]) updates[data[i]] = true;
        }
        db.ref('winchester/checkedIn').set(updates).then(function () {
          console.log('Migrated checkedIn from array to object');
        }).catch(function (e) {
          console.error('CheckedIn migration error:', e);
        });
      }
    });
  }

  function syncToFirebase() {
    if (!firebaseReady || !db) return;
    // Write each field directly to its own path for reliable sub-listener triggering
    var fields = {
      members: state.members,
      event: state.event,
      drinks: state.drinks,
      inventory: state.inventory,
      inventoryResetAt: state.inventoryResetAt
    };
    var keys = Object.keys(fields);
    for (var i = 0; i < keys.length; i++) {
      (function (key) {
        var val = fields[key];
        // Firebase deletes null/undefined — write empty marker to preserve structure
        if (val === null || val === undefined) val = null;
        db.ref('winchester/' + key).set(val).catch(function (e) {
          console.error('Firebase sync error (' + key + '):', e);
        });
      })(keys[i]);
    }
  }

  // Write a single log entry to Firebase
  function syncLogEntry(entry) {
    if (!firebaseReady || !db) return;
    var data = Object.assign({}, entry);
    delete data.id; // id is the key, not stored in value
    db.ref('winchester/log/' + entry.id).set(data).catch(function (e) {
      console.error('Firebase log sync error:', e);
    });
  }

  // Remove a single log entry from Firebase
  function removeLogEntry(entryId) {
    if (!firebaseReady || !db) return;
    db.ref('winchester/log/' + entryId).remove().catch(function (e) {
      console.error('Firebase log remove error:', e);
    });
  }

  // Remove all log entries from Firebase
  function clearFirebaseLog() {
    if (!firebaseReady || !db) return;
    db.ref('winchester/log').remove().catch(function (e) {
      console.error('Firebase log clear error:', e);
    });
  }

  // Check in a member (add to Firebase)
  function syncCheckIn(memberId) {
    if (!firebaseReady || !db) return;
    db.ref('winchester/checkedIn/' + memberId).set(true).catch(function (e) {
      console.error('Firebase checkin sync error:', e);
    });
  }

  // Check out a member (remove from Firebase)
  function syncCheckOut(memberId) {
    if (!firebaseReady || !db) return;
    db.ref('winchester/checkedIn/' + memberId).remove().catch(function (e) {
      console.error('Firebase checkout sync error:', e);
    });
  }

  // Clear all check-ins from Firebase
  function clearFirebaseCheckIns() {
    if (!firebaseReady || !db) return;
    db.ref('winchester/checkedIn').remove().catch(function (e) {
      console.error('Firebase checkin clear error:', e);
    });
  }

  function listenToFirebase() {
    if (!firebaseReady || !db) return;

    // Listen for non-log state changes
    var stateKeys = ['members', 'event', 'drinks', 'inventory', 'inventoryResetAt'];
    for (var k = 0; k < stateKeys.length; k++) {
      (function (key) {
        db.ref('winchester/' + key).on('value', function (snapshot) {
          var data = snapshot.val();
          switch (key) {
            case 'members':
              state.members = data || [];
              break;
            case 'event':
              var oldEventDate = state.event ? state.event.date : null;
              state.event = data || null;
              var newEventDate = state.event ? state.event.date : null;
              if (newEventDate && newEventDate !== oldEventDate && newEventDate !== lastKnownEventDate) {
                notifyNewEvent(state.event);
              }
              lastKnownEventDate = newEventDate;
              break;
            case 'drinks':
              if (data && data.length > 0) {
                state.drinks = data;
                migrateDrinkPoints();
              }
              break;
            case 'inventory':
              state.inventory = data || {};
              break;
            case 'inventoryResetAt':
              state.inventoryResetAt = data || 0;
              break;
          }
          debouncedSaveAndRender();
        });
      })(stateKeys[k]);
    }

    // Separate log listener — reconstructs array from individual entries
    db.ref('winchester/log').on('value', function (snapshot) {
      var data = snapshot.val();
      state.log = [];
      if (data) {
        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) {
          state.log.push(Object.assign({ id: keys[i] }, data[keys[i]]));
        }
        state.log.sort(function (a, b) { return a.timestamp - b.timestamp; });
      }
      debouncedSaveAndRender();
    });

    // Separate checkedIn listener — stores as {memberId: true} object
    db.ref('winchester/checkedIn').on('value', function (snapshot) {
      var data = snapshot.val();
      state.checkedIn = [];
      if (data) {
        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) {
          state.checkedIn.push(keys[i]);
        }
      }
      debouncedSaveAndRender();
    });

    // Separate photo listener — avoids race conditions with main state
    db.ref('winchester/photos').on('value', function (snapshot) {
      if (ignorePhotoUpdate) return;
      var data = snapshot.val();
      state.photos = [];
      if (data) {
        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) {
          state.photos.push(Object.assign({ id: keys[i] }, data[keys[i]]));
        }
        state.photos.sort(function (a, b) { return b.timestamp - a.timestamp; });
      }
      saveLocal();
      var galleryPage = document.getElementById('page-gallery');
      if (galleryPage && galleryPage.classList.contains('active')) {
        renderGalleryGrid();
      }
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
        state.inventory = parsed.inventory || {};
        state.inventoryResetAt = parsed.inventoryResetAt || 0;

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

        // Migrate: add Ginger Ale if missing
        var hasGingerAle = false;
        for (var g = 0; g < state.drinks.length; g++) {
          if (state.drinks[g].id === 'gingerale') { hasGingerAle = true; break; }
        }
        if (!hasGingerAle) {
          state.drinks.push({ id: 'gingerale', name: 'Ginger Ale', emoji: '\uD83E\uDEDA', points: 1 });
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
    renderLowStockWarning();
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

  // --- New Event Notification ---
  function notifyNewEvent(event) {
    if (!event || !event.date) return;
    var eventName = event.name || 'Pub-Abend';
    var d = new Date(event.date);
    var dateStr = d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });

    playEventChime();
    showEventBanner(eventName, dateStr);
  }

  function playEventChime() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Ascending pub-bell chime: G4, B4, D5, G5
      var notes = [392.00, 493.88, 587.33, 783.99];
      for (var i = 0; i < notes.length; i++) {
        (function (freq, idx) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.35, ctx.currentTime + idx * 0.18);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.18 + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.18);
          osc.stop(ctx.currentTime + idx * 0.18 + 0.5);
        })(notes[i], i);
      }
    } catch (e) {}
  }

  function showEventBanner(eventName, dateStr) {
    var banner = document.getElementById('event-notification');
    if (!banner) return;
    document.getElementById('event-notif-title').textContent = eventName;
    document.getElementById('event-notif-date').textContent = dateStr;
    banner.classList.add('show');

    // Auto-dismiss after 8 seconds
    setTimeout(function () {
      banner.classList.remove('show');
    }, 8000);
  }

  function dismissEventNotification() {
    var banner = document.getElementById('event-notification');
    if (banner) banner.classList.remove('show');
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

  function renderLowStockWarning() {
    var container = document.getElementById('low-stock-warning');
    if (!container) return;
    var lowDrinks = getLowStockDrinks();
    if (lowDrinks.length === 0) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'block';
    var html = '';
    for (var i = 0; i < lowDrinks.length; i++) {
      var d = lowDrinks[i].drink;
      var s = lowDrinks[i].status;
      var cls = s.remaining <= 0 ? 'stock-empty' : 'stock-low';
      var stockText = s.isSpirit
        ? s.servingsLeft + ' Portionen (' + s.remainingCl + ' cl)'
        : s.remaining + '/' + s.stock + ' ' + escapeHtml(s.unit);
      html += '<span class="low-stock-item ' + cls + '">'
        + getDrinkIcon(d) + ' ' + escapeHtml(d.name)
        + ' <strong>' + stockText + '</strong>'
        + '</span>';
    }
    document.getElementById('low-stock-list').innerHTML = html;
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
      deviceId: deviceId,
      timestamp: Date.now(),
    };

    state.photos.unshift(Object.assign({ id: id }, photoData));
    saveLocal();
    renderGalleryGrid();
    showToast('📸 Foto hochgeladen!');

    if (firebaseReady && db) {
      ignorePhotoUpdate = true;
      db.ref('winchester/photos/' + id).set(photoData).then(function () {
        setTimeout(function () { ignorePhotoUpdate = false; }, 500);
      }).catch(function (e) {
        console.error('Photo upload error:', e);
        ignorePhotoUpdate = false;
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

    var deleteBtn = document.getElementById('lightbox-delete');
    if (photo.deviceId && photo.deviceId !== deviceId) {
      deleteBtn.style.display = 'none';
    } else {
      deleteBtn.style.display = '';
    }

    document.getElementById('photo-lightbox').classList.add('show');
  }

  function closeLightbox() {
    document.getElementById('photo-lightbox').classList.remove('show');
    currentLightboxPhotoId = null;
  }

  function deleteCurrentPhoto() {
    if (!currentLightboxPhotoId) return;
    if (!confirm('Dieses Foto wirklich löschen?')) return;
    var photoId = currentLightboxPhotoId;
    closeLightbox();
    deletePhotoById(photoId, false);
  }

  function deletePhotoById(photoId, silent) {
    state.photos = state.photos.filter(function (p) { return p.id !== photoId; });
    saveLocal();
    renderGalleryGrid();
    if (!silent) showToast('Foto gelöscht');

    if (firebaseReady && db) {
      ignorePhotoUpdate = true;
      db.ref('winchester/photos/' + photoId).remove().then(function () {
        setTimeout(function () { ignorePhotoUpdate = false; }, 500);
      }).catch(function (e) {
        console.error('Photo delete error:', e);
        ignorePhotoUpdate = false;
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
      syncCheckOut(memberId);
    } else {
      state.checkedIn.push(memberId);
      syncCheckIn(memberId);
    }
    saveLocal();
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
    renderBacSection();
  }

  // ==========================================
  //  BAC (Promillerechner)
  // ==========================================
  var bacProfiles = {};

  function loadBacProfiles() {
    try {
      var saved = localStorage.getItem('winchester-bac');
      if (saved) bacProfiles = JSON.parse(saved);
    } catch (e) {}
  }

  function saveBacProfiles() {
    try {
      localStorage.setItem('winchester-bac', JSON.stringify(bacProfiles));
    } catch (e) {}
  }

  function calculateBAC(memberId) {
    var profile = bacProfiles[memberId];
    if (!profile || !profile.weight || !profile.gender) return null;

    var factor = profile.gender === 'm' ? 0.68 : 0.55;
    var totalAlcoholGrams = 0;
    var firstDrinkTime = null;

    for (var i = 0; i < state.log.length; i++) {
      var entry = state.log[i];
      if (entry.memberId !== memberId) continue;
      var grams = DRINK_ALCOHOL[entry.drinkId] || 0;
      if (grams <= 0) continue;
      totalAlcoholGrams += grams;
      if (!firstDrinkTime || entry.timestamp < firstDrinkTime) {
        firstDrinkTime = entry.timestamp;
      }
    }

    if (totalAlcoholGrams === 0 || !firstDrinkTime) return 0;

    var hoursElapsed = (Date.now() - firstDrinkTime) / 3600000;
    var bac = (totalAlcoholGrams / (profile.weight * factor)) - (hoursElapsed * 0.15);
    return Math.max(0, bac);
  }

  function renderBacSection() {
    var container = document.getElementById('bac-section');
    if (!container) return;

    if (state.members.length === 0 || state.log.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    var listEl = document.getElementById('bac-list');
    var html = '';

    // Only show members who have drinks logged
    var membersWithDrinks = [];
    for (var i = 0; i < state.members.length; i++) {
      var m = state.members[i];
      var hasDrinks = false;
      for (var j = 0; j < state.log.length; j++) {
        if (state.log[j].memberId === m.id) { hasDrinks = true; break; }
      }
      if (hasDrinks) membersWithDrinks.push(m);
    }

    if (membersWithDrinks.length === 0) {
      container.style.display = 'none';
      return;
    }

    for (var k = 0; k < membersWithDrinks.length; k++) {
      var member = membersWithDrinks[k];
      var profile = bacProfiles[member.id];
      var bac = calculateBAC(member.id);

      html += '<div class="bac-entry">';
      html += '<div class="bac-member-info">';
      html += '<span>' + member.avatar + ' ' + escapeHtml(member.name) + '</span>';
      html += '</div>';

      if (profile && profile.weight && profile.gender) {
        var bacDisplay = bac !== null ? bac.toFixed(2) : '—';
        var bacClass = 'bac-value';
        if (bac !== null) {
          if (bac >= 1.5) bacClass += ' bac-danger';
          else if (bac >= 0.5) bacClass += ' bac-warn';
          else bacClass += ' bac-ok';
        }
        html += '<div class="bac-result">';
        html += '<span class="' + bacClass + '">' + bacDisplay + ' ‰</span>';
        html += '<button class="btn-icon bac-edit-btn" data-id="' + member.id + '" title="Daten ändern">⚙</button>';
        html += '</div>';
      } else {
        html += '<button class="btn btn-sm btn-secondary bac-setup-btn" data-id="' + member.id + '">Daten eingeben</button>';
      }

      html += '</div>';
    }

    listEl.innerHTML = html;

    var setupBtns = listEl.querySelectorAll('.bac-setup-btn');
    for (var s = 0; s < setupBtns.length; s++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          openBacModal(btn.getAttribute('data-id'));
        });
      })(setupBtns[s]);
    }

    var editBtns = listEl.querySelectorAll('.bac-edit-btn');
    for (var e = 0; e < editBtns.length; e++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          openBacModal(btn.getAttribute('data-id'));
        });
      })(editBtns[e]);
    }
  }

  var bacModalMemberId = null;

  function openBacModal(memberId) {
    bacModalMemberId = memberId;
    var member = findMember(memberId);
    if (!member) return;

    var profile = bacProfiles[memberId] || {};
    document.getElementById('bac-modal-name').textContent = member.avatar + ' ' + member.name;
    document.getElementById('bac-weight').value = profile.weight || '';

    var genderBtns = document.querySelectorAll('.bac-gender-btn');
    for (var i = 0; i < genderBtns.length; i++) {
      genderBtns[i].classList.toggle('active', genderBtns[i].getAttribute('data-gender') === (profile.gender || ''));
    }

    document.getElementById('bac-modal').classList.add('show');
  }

  function closeBacModal() {
    document.getElementById('bac-modal').classList.remove('show');
    bacModalMemberId = null;
  }

  function selectBacGender(gender) {
    var btns = document.querySelectorAll('.bac-gender-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-gender') === gender);
    }
  }

  function saveBacData() {
    if (!bacModalMemberId) return;
    var weight = parseFloat(document.getElementById('bac-weight').value);
    var genderBtn = document.querySelector('.bac-gender-btn.active');
    var gender = genderBtn ? genderBtn.getAttribute('data-gender') : null;

    if (!weight || weight < 30 || weight > 250) {
      showToast('Bitte gültiges Gewicht eingeben (30-250 kg)');
      return;
    }
    if (!gender) {
      showToast('Bitte Geschlecht auswählen');
      return;
    }

    bacProfiles[bacModalMemberId] = { weight: weight, gender: gender };
    saveBacProfiles();
    closeBacModal();
    renderBacSection();
    showToast('Daten gespeichert');
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
      // For drinks that consume from another spirit (jgl, irishcoffee), show the source spirit's status
      var cfg = SPIRIT_CONFIG[d.id];
      var invDrinkId = (cfg && cfg.consumesFrom) ? cfg.consumesFrom : d.id;
      var invStatus = getInventoryStatus(invDrinkId);
      var stockBadge = '';
      if (invStatus) {
        var stockClass = invStatus.pct <= 0 ? 'stock-empty' : invStatus.pct <= 0.25 ? 'stock-low' : invStatus.pct <= 0.5 ? 'stock-medium' : 'stock-ok';
        var badgeText = invStatus.isSpirit
          ? invStatus.servingsLeft + 'x'
          : invStatus.remaining + '/' + invStatus.stock;
        stockBadge = '<span class="stock-badge ' + stockClass + '">' + badgeText + '</span>';
      }
      html += '<button class="drink-card' + sel + (invStatus && invStatus.remaining <= 0 ? ' drink-empty' : '') + '" data-id="' + d.id + '">'
        + stockBadge
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
        + '<button class="btn-icon btn-delete-sm recent-delete" data-id="' + entry.id + '" title="Löschen">✕</button>'
        + '</div>';
    }
    container.innerHTML = html;

    var delBtns = container.querySelectorAll('.recent-delete');
    for (var j = 0; j < delBtns.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          deleteLogEntry(btn.getAttribute('data-id'));
        });
      })(delBtns[j]);
    }
  }

  function deleteLogEntry(logId) {
    if (!confirm('Diesen Eintrag löschen?')) return;
    state.log = state.log.filter(function (e) { return e.id !== logId; });
    saveLocal();
    removeLogEntry(logId);
    renderDrinksPage();
    showToast('Eintrag gelöscht');
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

    var entry = {
      id: uuid(),
      memberId: member.id,
      memberName: member.name,
      memberAvatar: member.avatar,
      drinkId: drink.id,
      drinkName: drink.name,
      points: drink.points,
      timestamp: Date.now(),
    };
    state.log.push(entry);

    saveLocal();
    syncLogEntry(entry);
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
    renderInventoryManage();
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
    syncCheckOut(id);
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
    lastKnownEventDate = date;
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

    var savedPhotos = state.photos.slice();
    state = {
      members: [],
      drinks: DEFAULT_DRINKS.map(function (d) { return Object.assign({}, d); }),
      log: [],
      event: null,
      pubLocation: null,
      checkedIn: [],
      photos: savedPhotos,
      inventory: {},
      inventoryResetAt: 0,
    };
    bacProfiles = {};
    saveBacProfiles();
    selectedMemberId = null;
    selectedDrinkId = null;
    if (countdownInterval) clearInterval(countdownInterval);
    saveLocal();

    if (firebaseReady && db) {
      db.ref('winchester').update({
        members: null,
        event: null,
        drinks: state.drinks,
        inventory: null,
        inventoryResetAt: null
      }).catch(function (e) {
        console.error('Firebase reset error:', e);
      });
      clearFirebaseLog();
      clearFirebaseCheckIns();
    }

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
  //  INVENTORY
  // ==========================================

  // Count how many cl of a spirit have been consumed since reset
  // by all drinks that draw from it (e.g. whiskey, jgl, irishcoffee all draw from whiskey)
  function getConsumedClSinceReset(spiritId) {
    var cl = 0;
    for (var i = 0; i < state.log.length; i++) {
      var entry = state.log[i];
      if (entry.timestamp < state.inventoryResetAt) continue;
      var cfg = SPIRIT_CONFIG[entry.drinkId];
      if (!cfg) continue;
      // Direct spirit (e.g. whiskey logged -> whiskey inventory)
      if (!cfg.consumesFrom && entry.drinkId === spiritId) {
        cl += cfg.clPerServing;
      }
      // Indirect (e.g. jgl logged -> consumes from whiskey)
      if (cfg.consumesFrom === spiritId) {
        cl += cfg.clPerServing;
      }
    }
    return cl;
  }

  // Count simple 1:1 consumed units since reset
  function getConsumedUnitsSinceReset(drinkId) {
    var count = 0;
    for (var i = 0; i < state.log.length; i++) {
      if (state.log[i].drinkId === drinkId && state.log[i].timestamp >= state.inventoryResetAt) {
        count++;
      }
    }
    return count;
  }

  function getDefaultUnit(drinkId) {
    if (SPIRIT_CONFIG[drinkId] && SPIRIT_CONFIG[drinkId].defaultUnit) return SPIRIT_CONFIG[drinkId].defaultUnit;
    if (DEFAULT_UNITS[drinkId]) return DEFAULT_UNITS[drinkId];
    return 'Stk';
  }

  function getInventoryStatus(drinkId) {
    var inv = state.inventory[drinkId];
    if (!inv || !inv.stock) return null;
    var cfg = SPIRIT_CONFIG[drinkId];

    // Spirit with cl-based tracking (whiskey, shot)
    if (cfg && cfg.clPerBottle) {
      var totalCl = inv.stock * cfg.clPerBottle;
      var consumedCl = getConsumedClSinceReset(drinkId);
      var remainingCl = Math.max(0, totalCl - consumedCl);
      var servingsTotal = Math.floor(totalCl / cfg.clPerServing);
      var servingsLeft = Math.floor(remainingCl / cfg.clPerServing);
      var pct = totalCl > 0 ? remainingCl / totalCl : 0;
      return {
        stock: inv.stock, unit: inv.unit || cfg.defaultUnit,
        totalCl: totalCl, consumedCl: consumedCl, remainingCl: remainingCl,
        servingsTotal: servingsTotal, servingsLeft: servingsLeft,
        remaining: servingsLeft, pct: pct, isSpirit: true
      };
    }

    // Drinks that only consume from another spirit (jgl, irishcoffee) — no own inventory
    if (cfg && cfg.consumesFrom) return null;

    // Simple 1:1 drinks (beer, guinness, etc.)
    var consumed = getConsumedUnitsSinceReset(drinkId);
    var remaining = Math.max(0, inv.stock - consumed);
    var pct2 = inv.stock > 0 ? remaining / inv.stock : 0;
    return { stock: inv.stock, unit: inv.unit || getDefaultUnit(drinkId), consumed: consumed, remaining: remaining, pct: pct2, isSpirit: false };
  }

  // Absolute low-stock thresholds (remaining units) for home page warning
  var LOW_STOCK_THRESHOLDS = {
    guinness: 10,
    gingerale: 2,
  };

  function getLowStockDrinks() {
    var low = [];
    for (var i = 0; i < state.drinks.length; i++) {
      var id = state.drinks[i].id;
      var s = getInventoryStatus(id);
      if (!s) continue;
      var threshold = LOW_STOCK_THRESHOLDS[id];
      if (threshold !== undefined) {
        // Absolute threshold
        if (s.remaining < threshold) {
          low.push({ drink: state.drinks[i], status: s });
        }
      } else if (s.pct <= 0.25) {
        // Default: percentage-based
        low.push({ drink: state.drinks[i], status: s });
      }
    }
    return low;
  }

  // Get list of drinks that have their own inventory (exclude jgl/irishcoffee which consume from whiskey)
  function getInventoryDrinks() {
    var drinks = [];
    for (var i = 0; i < state.drinks.length; i++) {
      var d = state.drinks[i];
      var cfg = SPIRIT_CONFIG[d.id];
      // Skip drinks that only consume from another spirit's inventory
      if (cfg && cfg.consumesFrom) continue;
      drinks.push(d);
    }
    return drinks.sort(function (a, b) { return b.points - a.points; });
  }

  function renderInventoryManage() {
    var container = document.getElementById('inventory-manage');
    if (!container) return;
    var sorted = getInventoryDrinks();
    var html = '';
    for (var i = 0; i < sorted.length; i++) {
      var d = sorted[i];
      var defaultUnit = getDefaultUnit(d.id);
      var inv = state.inventory[d.id] || { stock: '', unit: defaultUnit };
      var status = getInventoryStatus(d.id);
      var cfg = SPIRIT_CONFIG[d.id];
      var isSpirit = cfg && cfg.clPerBottle;

      var remainingText = '';
      if (status) {
        var label = status.isSpirit
          ? status.servingsLeft + ' Portionen (' + status.remainingCl + ' cl) übrig'
          : status.remaining + ' ' + escapeHtml(status.unit) + ' übrig';
        remainingText = '<span class="inventory-remaining'
          + (status.pct <= 0 ? ' stock-empty' : status.pct <= 0.25 ? ' stock-low' : status.pct <= 0.5 ? ' stock-medium' : ' stock-ok')
          + '">' + label + '</span>';
      }

      // Unit options depend on drink type
      var unitOptions = '';
      if (isSpirit) {
        unitOptions = '<select class="input input-sm inventory-unit" data-drink="' + d.id + '">'
          + '<option value="Flaschen"' + (inv.unit === 'Flaschen' ? ' selected' : '') + '>Flaschen (75cl)</option>'
          + '</select>';
      } else {
        unitOptions = '<select class="input input-sm inventory-unit" data-drink="' + d.id + '">'
          + '<option value="Stk"' + (inv.unit === 'Stk' ? ' selected' : '') + '>Stk</option>'
          + '<option value="Dosen"' + (inv.unit === 'Dosen' ? ' selected' : '') + '>Dosen</option>'
          + '<option value="Flaschen"' + (inv.unit === 'Flaschen' ? ' selected' : '') + '>Flaschen</option>'
          + '<option value="Fässer"' + (inv.unit === 'Fässer' ? ' selected' : '') + '>Fässer</option>'
          + '<option value="Liter"' + (inv.unit === 'Liter' ? ' selected' : '') + '>Liter</option>'
          + '</select>';
      }

      html += '<div class="inventory-row">'
        + '<span class="inventory-drink-name">' + getDrinkIcon(d) + ' ' + escapeHtml(d.name) + '</span>'
        + '<div class="inventory-inputs">'
        + '<input type="number" class="input input-sm inventory-stock" data-drink="' + d.id + '" '
        + 'value="' + (inv.stock || '') + '" placeholder="0" min="0" step="1">'
        + unitOptions
        + '<button class="btn btn-gold btn-sm inventory-add-btn" data-drink="' + d.id + '" title="Nachfüllen">+</button>'
        + '</div>'
        + remainingText
        + '</div>';
    }

    // Note about JGL/Irish Coffee
    html += '<p class="hint" style="margin-top:8px;">JGL und Irish Coffee werden automatisch vom Whiskey-Vorrat abgezogen (4 cl pro Portion).</p>';

    container.innerHTML = html;

    // Attach change listeners
    var stockInputs = container.querySelectorAll('.inventory-stock');
    for (var s = 0; s < stockInputs.length; s++) {
      (function (input) {
        input.addEventListener('change', function () {
          var drinkId = input.getAttribute('data-drink');
          var defUnit = getDefaultUnit(drinkId);
          if (!state.inventory[drinkId]) state.inventory[drinkId] = { stock: 0, unit: defUnit };
          state.inventory[drinkId].stock = parseInt(input.value) || 0;
          saveState();
          renderInventoryManage();
        });
      })(stockInputs[s]);
    }

    var unitSelects = container.querySelectorAll('.inventory-unit');
    for (var u = 0; u < unitSelects.length; u++) {
      (function (sel) {
        sel.addEventListener('change', function () {
          var drinkId = sel.getAttribute('data-drink');
          var defUnit = getDefaultUnit(drinkId);
          if (!state.inventory[drinkId]) state.inventory[drinkId] = { stock: 0, unit: defUnit };
          state.inventory[drinkId].unit = sel.value;
          saveState();
        });
      })(unitSelects[u]);
    }

    // Restock buttons
    var addBtns = container.querySelectorAll('.inventory-add-btn');
    for (var a = 0; a < addBtns.length; a++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          restockDrink(btn.getAttribute('data-drink'));
        });
      })(addBtns[a]);
    }
  }

  function restockDrink(drinkId) {
    var drink = findDrink(drinkId);
    var unit = (state.inventory[drinkId] && state.inventory[drinkId].unit) || getDefaultUnit(drinkId);
    var amount = prompt((drink ? drink.name : drinkId) + ': Wieviel nachfüllen? (' + unit + ')');
    if (!amount) return;
    var num = parseInt(amount);
    if (isNaN(num) || num <= 0) { showToast('Ungültige Menge'); return; }
    if (!state.inventory[drinkId]) state.inventory[drinkId] = { stock: 0, unit: unit };
    state.inventory[drinkId].stock += num;
    saveState();
    renderInventoryManage();
    showToast(num + ' ' + unit + ' ' + (drink ? drink.name : drinkId) + ' hinzugefügt');
  }

  function resetLog() {
    if (!confirm('Alle Runden wirklich löschen? Die Rangliste wird zurückgesetzt.')) return;
    state.log = [];
    saveLocal();
    clearFirebaseLog();
    renderAll();
    showToast('Runden-Log gelöscht');
  }

  function resetInventory() {
    if (!confirm('Vorrat zurücksetzen? Die Zählung beginnt dann von vorne.')) return;
    state.inventory = {};
    state.inventoryResetAt = Date.now();
    saveState();
    renderInventoryManage();
    showToast('Vorrat zurückgesetzt');
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
    closeBacModal: closeBacModal,
    selectBacGender: selectBacGender,
    saveBacData: saveBacData,
    dismissEventNotification: dismissEventNotification,
    resetInventory: resetInventory,
    resetLog: resetLog,
  };

  // ==========================================
  //  INIT
  // ==========================================
  function init() {
    loadState();
    loadBacProfiles();
    lastKnownEventDate = state.event ? state.event.date : null;
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
