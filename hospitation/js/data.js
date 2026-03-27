// ============================================================
// data.js - Konstanten, Datenmodell, Hilfsfunktionen
// ============================================================

const DEFAULT_TRAINEES = [
  'Bärbel', 'Cornelia', 'Frauke', 'Karsten', 'Lara',
  'Liv', 'Martin', 'Max', 'Norbert', 'Stef',
  'Tanja', 'Thomas', 'Volker'
];

// Mutable array — gets updated from Firebase
let TRAINEES = [...DEFAULT_TRAINEES];

const TOUR_TYPES = {
  'oeffentlich':          { label: 'Öffentliche Führung', short: 'Öff', category: 'oeffentlich' },
  'gaenge':               { label: 'Gängeführung', short: 'Gäng', category: 'gaenge' },
  'sex-crime':            { label: 'Sex & Crime', short: 'S&C', category: 'abend' },
  'nachtwaechter':        { label: 'Nachtwächter', short: 'NW', category: 'abend' },
  'mystica':              { label: 'Lubeca Mystica', short: 'Myst', category: 'abend' },
  'kostueme':             { label: 'Kostümführung', short: 'Kost', category: 'abend' },
  'weihnachten':          { label: 'Weihnachtsführung', short: 'Weih', category: 'abend' },
  'marzipan':             { label: 'Marzipanführung', short: 'Marz', category: 'verkostigung' },
  'lukullisch':           { label: 'Lübeck Lukullisch', short: 'Luk', category: 'verkostigung' },
  'bierfuehrung':         { label: 'Bierführung', short: 'Bier', category: 'verkostigung' },
  'schueler':             { label: 'Schülerführung', short: 'Schü', category: 'schueler' },
  'privat':               { label: 'Private Gruppe', short: 'Priv', category: 'privat' },
  'luebsche-verfuehrung': { label: 'Lübsche Verführung', short: 'LübV', category: 'luebsche-verfuehrung' },
  'glanz-gloria':         { label: 'Glanz & Gloria', short: 'G&G', category: 'optional' }
};

const REQUIREMENTS = {
  'oeffentlich': {
    label: 'Öffentliche Führungen',
    min: 6,
    note: 'Bei verschiedenen Guides!'
  },
  'gaenge': {
    label: 'Gängeführungen',
    min: 6,
    subcategories: {
      'handwerker': { label: 'Handwerkerviertel', min: 2 },
      'seefahrer':  { label: 'Seefahrerviertel', min: 2 },
      'domviertel': { label: 'Domviertel', min: 2 }
    }
  },
  'abend': {
    label: 'Abendführungen',
    min: 3,
    note: 'Sex & Crime, Nachtwächter, Mystica, Kostüm, Weihnachten'
  },
  'verkostigung': {
    label: 'Verköstigungstouren',
    min: 1,
    note: 'Marzipan, Lukullisch oder Bier'
  },
  'schueler': {
    label: 'Schülerführungen',
    min: 3
  },
  'privat': {
    label: 'Private Gruppen',
    min: 4
  },
  'luebsche-verfuehrung': {
    label: 'Lübsche Verführung',
    min: 1
  }
};

const TOTAL_REQUIRED = Object.values(REQUIREMENTS).reduce((sum, r) => sum + r.min, 0); // 24

const GAENGE_SUBTYPES = {
  'handwerker': 'Handwerkerviertel',
  'seefahrer': 'Seefahrerviertel',
  'domviertel': 'Domviertel'
};

const WEEKDAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

// ---- Hilfsfunktionen ----

function parseGermanDate(str) {
  if (!str || typeof str !== 'string') return null;
  str = str.trim();
  const match = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (!match) return null;
  let [, day, month, year] = match;
  day = day.padStart(2, '0');
  month = month.padStart(2, '0');
  if (year.length === 2) year = '20' + year;
  return `${year}-${month}-${day}`;
}

function formatDateDE(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  return timeStr.replace(/^(\d{1,2}):(\d{2}).*/, (_, h, m) => `${h.padStart(2, '0')}:${m}`);
}

function getDayOfWeek(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  return WEEKDAYS_DE[d.getDay()];
}

function generateTourId(type, date, time) {
  const t = (time || '0000').replace(':', '');
  const d = (date || '').replace(/-/g, '');
  return `${type}_${d}_${t}`;
}

function isDatePast(isoDate) {
  if (!isoDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(isoDate + 'T00:00:00') < today;
}

function getTypeLabel(type) {
  return TOUR_TYPES[type]?.label || type;
}

function getTypeShort(type) {
  return TOUR_TYPES[type]?.short || type;
}

function getTypeCategory(type) {
  return TOUR_TYPES[type]?.category || 'optional';
}

function getTypeBadgeClass(type) {
  return `type-badge type-badge-${type}`;
}

function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function excelSerialToDate(serial) {
  if (typeof serial !== 'number') return null;
  // Use only integer part (fractional part is time, not date)
  serial = Math.floor(serial);
  const epoch = new Date(1899, 11, 30);
  const d = new Date(epoch.getTime() + serial * 86400000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function excelTimeToString(serial) {
  if (typeof serial !== 'number') {
    if (typeof serial === 'string') {
      const m = serial.match(/(\d{1,2})[.:](\d{2})/);
      if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
    }
    return null;
  }
  // Time serials should be between 0 and 1 (fraction of a day)
  // Values > 1 are invalid (e.g. broken Marzipan value 1700.708)
  if (serial < 0 || serial >= 1) return null;
  const totalMinutes = Math.round(serial * 1440);
  const h = Math.floor(totalMinutes / 60);
  const min = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
