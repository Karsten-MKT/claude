// ============================================================
// firebase.js - Firebase-Konfiguration und Datenbank-Operationen
// ============================================================

const FIREBASE_CONFIG = {
  databaseURL: 'https://winchester-app-c8241-default-rtdb.europe-west1.firebasedatabase.app'
};

let db = null;
let toursRef = null;
let toursCache = {};
let firebasePermissionDenied = false;

function initFirebase() {
  firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.database();
  toursRef = db.ref('hospitation/tours');

  // Anonymous Auth — required by security rules
  firebase.auth().signInAnonymously().then(() => {
    startFirebaseListeners();
  }).catch((e) => {
    console.error('Firebase auth error:', e);
    // Fallback: try without auth (works if rules are still open)
    startFirebaseListeners();
  });
}

function startFirebaseListeners() {
  toursRef.on('value', (snapshot) => {
    toursCache = snapshot.val() || {};
    updateConnectionStatus(true);
    onToursUpdated();
  }, (error) => {
    console.error('Firebase read error:', error);
    updateConnectionStatus(false);
    if (error.message && error.message.includes('permission_denied')) {
      firebasePermissionDenied = true;
      showPermissionError();
    } else {
      showToast('Verbindungsfehler zur Datenbank', 'error');
    }
  });

  db.ref('.info/connected').on('value', (snap) => {
    updateConnectionStatus(snap.val() === true);
  });

  initTrainees();
}

let traineesRef = null;

function initTrainees() {
  traineesRef = db.ref('hospitation/trainees');

  traineesRef.on('value', (snap) => {
    const data = snap.val();
    if (!data) {
      // First time: seed from defaults
      const seed = {};
      DEFAULT_TRAINEES.forEach(name => { seed[name] = { name, active: true }; });
      traineesRef.set(seed);
      return;
    }
    // Update global TRAINEES array from Firebase
    TRAINEES = Object.values(data)
      .filter(t => t.active !== false)
      .map(t => t.name)
      .sort((a, b) => a.localeCompare(b, 'de'));
    onTraineesUpdated();
  }, () => {}); // Silently fail if no permission
}

function addTrainee(name) {
  if (!traineesRef || !name.trim()) return Promise.reject('Invalid');
  const key = name.trim();
  if (TRAINEES.includes(key)) return Promise.reject('Exists');
  return traineesRef.child(key).set({ name: key, active: true });
}

function renameTrainee(oldName, newName) {
  if (!traineesRef || !newName.trim()) return Promise.reject('Invalid');
  const updates = {};
  updates[oldName] = null; // remove old
  updates[newName.trim()] = { name: newName.trim(), active: true };
  // Also update all tour registrations
  const tourUpdates = {};
  Object.entries(toursCache).forEach(([id, tour]) => {
    if (tour.trainee1 === oldName) tourUpdates[`${id}/trainee1`] = newName.trim();
    if (tour.trainee2 === oldName) tourUpdates[`${id}/trainee2`] = newName.trim();
  });
  return traineesRef.update(updates).then(() => {
    if (Object.keys(tourUpdates).length > 0) {
      return toursRef.update(tourUpdates);
    }
  });
}

function removeTrainee(name) {
  if (!traineesRef) return Promise.reject('No ref');
  return traineesRef.child(name).remove();
}

function deleteAllTours() {
  return toursRef.remove();
}

function updateConnectionStatus(connected) {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (connected) {
    dot.className = 'w-2 h-2 rounded-full bg-green-400';
    text.textContent = 'Verbunden';
  } else {
    dot.className = 'w-2 h-2 rounded-full bg-red-400 animate-pulse';
    text.textContent = 'Offline';
  }
}

function getToursArray() {
  return Object.entries(toursCache).map(([id, tour]) => ({ ...tour, id }));
}

function saveTour(tour) {
  const id = tour.id || generateTourId(tour.type, tour.date, tour.time);
  const data = { ...tour };
  delete data.id;
  if (!data.createdAt) data.createdAt = Date.now();
  return toursRef.child(id).set(data).then(() => id);
}

function updateTourField(tourId, field, value) {
  return toursRef.child(tourId).child(field).set(value);
}

function saveToursBatch(tours) {
  const updates = {};
  tours.forEach(tour => {
    const id = tour.id || generateTourId(tour.type, tour.date, tour.time);
    const data = { ...tour };
    delete data.id;
    if (!data.createdAt) data.createdAt = Date.now();
    updates[id] = data;
  });
  return toursRef.update(updates).then(() => {
    showToast(`${tours.length} Termine importiert`, 'success');
    return Object.keys(updates);
  });
}

function deleteTour(tourId) {
  return toursRef.child(tourId).remove();
}

function tourExists(tourId) {
  return !!toursCache[tourId];
}

function showPermissionError() {
  const tbody = document.getElementById('tours-tbody');
  tbody.innerHTML = `<tr><td colspan="6" class="px-3 py-8 text-center">
    <div style="color:#dc2626;font-weight:600;margin-bottom:0.5rem;">Firebase-Berechtigung fehlt</div>
    <div style="color:#6b7280;font-size:0.875rem;max-width:500px;margin:0 auto;">
      Bitte in der <a href="https://console.firebase.google.com/project/winchester-app-c8241/database/winchester-app-c8241-default-rtdb/rules" target="_blank" style="color:#2563eb;text-decoration:underline;">Firebase Console</a> die Regeln anpassen:
      <pre style="text-align:left;background:#f3f4f6;padding:0.75rem;border-radius:0.5rem;margin-top:0.5rem;font-size:0.75rem;overflow-x:auto;">{
  "rules": {
    "winchester": { ... },
    "hospitation": {
      ".read": true,
      ".write": true
    }
  }
}</pre>
    </div>
  </td></tr>`;
}
