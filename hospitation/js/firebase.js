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

function initTrainees() {
  const traineesRef = db.ref('hospitation/trainees');
  traineesRef.once('value').then((snap) => {
    if (!snap.exists()) {
      const data = {};
      TRAINEES.forEach(name => {
        data[name] = { name, active: true };
      });
      traineesRef.set(data);
    }
  }).catch(() => {}); // Silently fail if no permission yet
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
