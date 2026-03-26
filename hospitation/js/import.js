// ============================================================
// import.js - Excel-Upload, Copy-Paste, Manuelle Eingabe
// ============================================================

let pendingImportTours = [];

function initImport() {
  // Accordion toggles
  document.querySelectorAll('.accordion-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById('accordion-' + btn.dataset.accordion);
      const isOpen = !target.classList.contains('hidden');
      // Close all
      document.querySelectorAll('.accordion-content').forEach(c => c.classList.add('hidden'));
      document.querySelectorAll('.accordion-toggle').forEach(b => b.removeAttribute('aria-expanded'));
      if (!isOpen) {
        target.classList.remove('hidden');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Excel upload
  const dropzone = document.getElementById('excel-dropzone');
  const fileInput = document.getElementById('excel-file');
  document.getElementById('excel-browse').addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('border-primary-500', 'bg-primary-50'); });
  dropzone.addEventListener('dragleave', () => { dropzone.classList.remove('border-primary-500', 'bg-primary-50'); });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-primary-500', 'bg-primary-50');
    if (e.dataTransfer.files.length) handleExcelFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => { if (fileInput.files.length) handleExcelFile(fileInput.files[0]); });

  document.getElementById('excel-import-btn').addEventListener('click', () => importPendingTours('excel'));
  document.getElementById('excel-cancel-btn').addEventListener('click', () => {
    document.getElementById('excel-preview').classList.add('hidden');
    pendingImportTours = [];
  });

  // Copy-Paste
  document.getElementById('paste-preview-btn').addEventListener('click', handlePastePreview);
  document.getElementById('paste-import-btn').addEventListener('click', () => importPendingTours('paste'));
  document.getElementById('paste-cancel-btn').addEventListener('click', () => {
    document.getElementById('paste-preview').classList.add('hidden');
    pendingImportTours = [];
  });

  // Manual form
  const manualType = document.getElementById('manual-type');
  Object.entries(TOUR_TYPES).forEach(([key, val]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = val.label;
    manualType.appendChild(opt);
  });
  manualType.addEventListener('change', () => {
    document.getElementById('manual-subtype-wrap').classList.toggle('hidden', manualType.value !== 'gaenge');
  });

  document.getElementById('manual-form').addEventListener('submit', handleManualSubmit);
}

// ---- Excel Upload ----

function handleExcelFile(file) {
  if (!file.name.match(/\.xlsx?$/i)) {
    showToast('Bitte eine .xlsx-Datei wählen', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const tours = parseWorkbook(wb);
      if (tours.length === 0) {
        showToast('Keine Termine in der Datei gefunden', 'warning');
        return;
      }
      pendingImportTours = tours;
      showExcelPreview(tours);
    } catch (err) {
      console.error('Excel parse error:', err);
      showToast('Fehler beim Lesen der Datei: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function parseWorkbook(wb) {
  const allTours = [];
  const parsers = {
    'Öffentlich': parseOeffentlich,
    'Sex & Crime': parseSexCrime,
    'Marzipan': parseMarzipan,
    'Mystica': parseMystica,
    'Bierführung': parseBierfuehrung,
    'Lukullisch': parseLukullisch,
    'Gänge': parseGaenge,
    'Glanz &Gloria': parseGlanzGloria,
    'Kostume': parseKostueme,
    'Nachtwächter': parseNachtwaechter
  };

  wb.SheetNames.forEach(sheetName => {
    // Try exact match first, then fuzzy
    let parser = parsers[sheetName];
    if (!parser) {
      const key = Object.keys(parsers).find(k => sheetName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(sheetName.toLowerCase()));
      if (key) parser = parsers[key];
    }
    if (!parser) {
      console.warn(`No parser for sheet: ${sheetName}`);
      return;
    }
    try {
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const tours = parser(rows, sheetName);
      allTours.push(...tours);
    } catch (err) {
      console.error(`Error parsing sheet "${sheetName}":`, err);
    }
  });

  return allTours;
}

// ---- Sheet Parsers ----

function parseOeffentlich(rows) {
  const tours = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dateRaw = row[1];
    const timeRaw = row[2];
    const guide = cleanString(row[3]);
    if (!dateRaw && !guide) continue;

    const date = parseDateCell(dateRaw);
    const time = excelTimeToString(timeRaw);
    if (!date || !time) continue;

    const trainee1 = matchTrainee(cleanString(row[5]));
    const trainee2 = matchTrainee(cleanString(row[6]));

    tours.push({
      type: 'oeffentlich', category: 'oeffentlich', subtype: null,
      date, time, guides: guide ? [guide] : [],
      trainee1, trainee2, source: 'excel'
    });
  }
  return tours;
}

function parseSexCrime(rows) {
  const tours = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const combined = String(row[0] || '');
    if (!combined || combined.toLowerCase().includes('einteilung') || combined.toLowerCase().includes('start') || combined.toLowerCase().includes('ticket')) continue;

    const { date, time } = parseCombinedDateTime(combined);
    if (!date) continue;
    const guide = cleanString(row[1]);
    const trainee1 = matchTrainee(cleanString(row[2]));
    const trainee2 = matchTrainee(cleanString(row[3]));

    tours.push({
      type: 'sex-crime', category: 'abend', subtype: null,
      date, time: time || '20:30', guides: guide ? [guide] : [],
      trainee1, trainee2, source: 'excel'
    });
  }
  return tours;
}

function parseMarzipan(rows) {
  const tours = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dateRaw = row[1];
    const timeRaw = row[2];
    const guide1 = cleanString(row[3]);
    const guide2 = cleanString(row[4]);
    if (!dateRaw && !guide1) continue;

    const date = parseDateCell(dateRaw);
    if (!date) continue;
    const time = parseTimeCell(timeRaw) || '17:00';
    const guides = [guide1, guide2].filter(Boolean);
    const trainee1 = matchTrainee(cleanString(row[5]));
    const trainee2 = matchTrainee(cleanString(row[6]));

    tours.push({
      type: 'marzipan', category: 'verkostigung', subtype: null,
      date, time, guides, trainee1, trainee2, source: 'excel'
    });
  }
  return tours;
}

function parseMystica(rows) {
  const tours = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const combined = String(row[0] || '');
    if (!combined || combined.toLowerCase().includes('einteilung') || combined.toLowerCase().includes('start') || combined.toLowerCase().includes('ticket')) continue;

    const { date, time } = parseCombinedDateTime(combined);
    if (!date) continue;
    const guidesRaw = String(row[1] || '');
    const guides = guidesRaw.split(/\n|,|\//).map(g => g.trim()).filter(Boolean);
    const trainee1 = matchTrainee(cleanString(row[2]));
    const trainee2 = matchTrainee(cleanString(row[3]));

    tours.push({
      type: 'mystica', category: 'abend', subtype: null,
      date, time: time || '20:30', guides, trainee1, trainee2, source: 'excel'
    });
  }
  return tours;
}

function parseBierfuehrung(rows) {
  const tours = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dateRaw = row[1];
    const timeRaw = row[2];
    const guide = cleanString(row[3]);
    if (!dateRaw && !guide) continue;

    const date = parseDateCell(dateRaw);
    if (!date) continue;
    const time = parseTimeCell(timeRaw) || '16:30';
    const trainee1 = matchTrainee(cleanString(row[4]));
    const trainee2 = matchTrainee(cleanString(row[5]));

    tours.push({
      type: 'bierfuehrung', category: 'verkostigung', subtype: null,
      date, time, guides: guide ? [guide] : [], trainee1, trainee2, source: 'excel'
    });
  }
  return tours;
}

function parseLukullisch(rows) {
  const tours = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dateRaw = row[0];
    const timeRaw = row[1];
    const guide = cleanString(row[2]);
    if (!dateRaw && !guide) continue;

    const date = parseDateCell(dateRaw);
    if (!date) continue;
    const time = parseTimeCell(timeRaw) || '10:45';
    const trainee1 = matchTrainee(cleanString(row[3]));
    const trainee2 = matchTrainee(cleanString(row[4]));

    tours.push({
      type: 'lukullisch', category: 'verkostigung', subtype: null,
      date, time, guides: guide ? [guide] : [], trainee1, trainee2, source: 'excel'
    });
  }
  return tours;
}

function parseGaenge(rows) {
  const tours = [];
  // Find header row
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    if (rows[i].some(c => String(c).toLowerCase().includes('datum') || String(c).toLowerCase().includes('thema'))) {
      headerIdx = i;
      break;
    }
  }

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const dateRaw = row[0];
    const themaRaw = cleanString(row[1] || row[2]);
    const guide = cleanString(row[2] || row[3]);
    if (!dateRaw) continue;

    const date = parseDateCell(dateRaw);
    if (!date) continue;

    let subtype = null;
    const themaLower = (themaRaw || '').toLowerCase();
    if (themaLower.includes('handwerk')) subtype = 'handwerker';
    else if (themaLower.includes('seefahrer') || themaLower.includes('seefahr')) subtype = 'seefahrer';
    else if (themaLower.includes('dom')) subtype = 'domviertel';

    const trainee1 = matchTrainee(cleanString(row[3] || row[4]));
    const trainee2 = matchTrainee(cleanString(row[4] || row[5]));

    tours.push({
      type: 'gaenge', category: 'gaenge', subtype,
      date, time: '14:00', guides: guide ? [guide] : [],
      trainee1, trainee2, source: 'excel'
    });
  }
  return tours;
}

function parseGlanzGloria(rows) {
  return parseGenericSheet(rows, 'glanz-gloria', 'optional');
}

function parseKostueme(rows) {
  return parseGenericSheet(rows, 'kostueme', 'abend');
}

function parseNachtwaechter(rows) {
  return parseGenericSheet(rows, 'nachtwaechter', 'abend');
}

function parseGenericSheet(rows, type, category) {
  const tours = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    let date = null;
    let guide = '';
    let time = null;

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (!date) {
        const d = parseDateCell(cell);
        if (d) { date = d; continue; }
      }
      if (!time && typeof cell === 'number' && cell < 1 && cell > 0) {
        time = excelTimeToString(cell);
        continue;
      }
      if (date && !guide && typeof cell === 'string' && cell.trim().length > 2 && !cell.match(/^\d/)) {
        guide = cell.trim();
      }
    }
    if (!date) continue;

    const trainee1 = matchTrainee(cleanString(row[row.length - 2]));
    const trainee2 = matchTrainee(cleanString(row[row.length - 1]));

    tours.push({
      type, category, subtype: null,
      date, time: time || '20:00', guides: guide ? [guide] : [],
      trainee1, trainee2, source: 'excel'
    });
  }
  return tours;
}

// ---- Parse Helpers ----

function parseDateCell(val) {
  if (typeof val === 'number') return excelSerialToDate(val);
  if (typeof val !== 'string') return null;
  val = val.trim();

  // "DD.MM." format (without year, assume 2026)
  let m = val.match(/^(\d{1,2})\.(\d{1,2})\.?$/);
  if (m) return `2026-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;

  // Full date
  return parseGermanDate(val);
}

function parseTimeCell(val) {
  if (typeof val === 'number') return excelTimeToString(val);
  if (typeof val !== 'string') return null;
  const m = val.match(/(\d{1,2})[.:](\d{2})/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  return null;
}

function parseCombinedDateTime(str) {
  str = str.replace(/^(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)\s*/i, '');
  const dateMatch = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  const timeMatch = str.match(/(\d{1,2})[.:](\d{2})\s*(Uhr)?/);
  const date = dateMatch ? parseGermanDate(dateMatch[0]) : null;
  const time = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null;
  return { date, time };
}

function cleanString(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function matchTrainee(name) {
  if (!name) return null;
  name = name.trim();
  const exact = TRAINEES.find(t => t === name);
  if (exact) return exact;
  const lower = name.toLowerCase();
  const partial = TRAINEES.find(t => lower.includes(t.toLowerCase()) || t.toLowerCase().includes(lower));
  return partial || null;
}

// ---- Preview & Import ----

function showExcelPreview(tours) {
  const tbody = document.getElementById('excel-preview-tbody');
  const deduplicated = tours.map(t => {
    const id = generateTourId(t.type, t.date, t.time);
    const exists = tourExists(id);
    return { ...t, id, exists };
  });

  tbody.innerHTML = deduplicated.map((t, i) => {
    const guides = (t.guides || []).join(', ');
    const existsClass = t.exists ? 'bg-yellow-50' : '';
    const existsLabel = t.exists ? ' (existiert)' : '';
    return `<tr class="${existsClass}">
      <td class="px-2 py-1"><span class="${getTypeBadgeClass(t.type)}">${getTypeLabel(t.type)}</span></td>
      <td class="px-2 py-1">${formatDateDE(t.date)}</td>
      <td class="px-2 py-1">${formatTime(t.time)}</td>
      <td class="px-2 py-1">${guides}</td>
      <td class="px-2 py-1"><label><input type="checkbox" class="import-check" data-index="${i}" ${t.exists ? '' : 'checked'}> ${t.exists ? 'Überschreiben' + existsLabel : 'Ja'}</label></td>
    </tr>`;
  }).join('');

  document.getElementById('excel-preview-count').textContent = tours.length;
  document.getElementById('excel-preview').classList.remove('hidden');
  pendingImportTours = deduplicated;
}

function handlePastePreview() {
  const text = document.getElementById('paste-input').value.trim();
  if (!text) {
    showToast('Bitte Text einfügen', 'warning');
    return;
  }

  const tours = parsePasteText(text);
  if (tours.length === 0) {
    showToast('Keine Termine erkannt. Format: "07.04.26 von 10:00 Uhr – 12:00 Uhr Schüler Führung"', 'warning');
    return;
  }

  const tbody = document.getElementById('paste-preview-tbody');
  const deduplicated = tours.map(t => {
    const id = generateTourId(t.type, t.date, t.time);
    const exists = tourExists(id);
    return { ...t, id, exists };
  });

  tbody.innerHTML = deduplicated.map((t, i) => {
    const existsLabel = t.exists ? ' (existiert)' : '';
    return `<tr class="${t.exists ? 'bg-yellow-50' : ''}">
      <td class="px-2 py-1"><span class="${getTypeBadgeClass(t.type)}">${getTypeLabel(t.type)}</span></td>
      <td class="px-2 py-1">${formatDateDE(t.date)}</td>
      <td class="px-2 py-1">${formatTime(t.time)}${t.endTime ? ' – ' + formatTime(t.endTime) : ''}</td>
      <td class="px-2 py-1"><label><input type="checkbox" class="import-check" data-index="${i}" ${t.exists ? '' : 'checked'}> ${t.exists ? 'Überschreiben' + existsLabel : 'Ja'}</label></td>
    </tr>`;
  }).join('');

  document.getElementById('paste-preview-count').textContent = tours.length;
  document.getElementById('paste-preview').classList.remove('hidden');
  pendingImportTours = deduplicated;
}

function parsePasteText(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const tours = [];
  const regex = /(\d{1,2}\.\d{1,2}\.\d{2,4})\s+von\s+(\d{1,2}:\d{2})\s*Uhr\s*[–\-]\s*(\d{1,2}:\d{2})\s*Uhr\s+(.+)/i;

  lines.forEach(line => {
    const m = line.trim().match(regex);
    if (!m) return;

    const date = parseGermanDate(m[1]);
    const time = m[2];
    const endTime = m[3];
    const label = m[4].trim();

    let type, category;
    const labelLower = label.toLowerCase();

    if (labelLower.includes('schüler') && (labelLower.includes('kostüm') || labelLower.includes('nachtwächter'))) {
      type = labelLower.includes('kostüm') ? 'kostueme' : 'nachtwaechter';
      category = 'abend';
    } else if (labelLower.includes('schüler')) {
      type = 'schueler';
      category = 'schueler';
    } else if (labelLower.includes('privat') || labelLower.includes('gruppe')) {
      type = 'privat';
      category = 'privat';
    } else if (labelLower.includes('allg')) {
      type = 'privat';
      category = 'privat';
    } else {
      type = 'privat';
      category = 'privat';
    }

    tours.push({
      type, category, subtype: null,
      date, time, endTime,
      guides: [], trainee1: null, trainee2: null,
      source: 'paste', notes: label
    });
  });

  return tours;
}

function importPendingTours(source) {
  const checkboxes = document.querySelectorAll(`#${source === 'excel' ? 'excel' : 'paste'}-preview-tbody .import-check`);
  const toImport = [];
  checkboxes.forEach(cb => {
    if (cb.checked) {
      const idx = parseInt(cb.dataset.index);
      if (pendingImportTours[idx]) toImport.push(pendingImportTours[idx]);
    }
  });

  if (toImport.length === 0) {
    showToast('Keine Termine zum Importieren ausgewählt', 'warning');
    return;
  }

  saveToursBatch(toImport).then(() => {
    document.getElementById(`${source === 'excel' ? 'excel' : 'paste'}-preview`).classList.add('hidden');
    pendingImportTours = [];
    if (source === 'paste') document.getElementById('paste-input').value = '';
  }).catch(err => {
    console.error('Import error:', err);
    showToast('Fehler beim Import: ' + err.message, 'error');
  });
}

// ---- Manual Entry ----

function handleManualSubmit(e) {
  e.preventDefault();
  const type = document.getElementById('manual-type').value;
  const subtype = type === 'gaenge' ? document.getElementById('manual-subtype').value || null : null;
  const date = document.getElementById('manual-date').value;
  const time = document.getElementById('manual-time').value;
  const guide = document.getElementById('manual-guide').value.trim();
  const notes = document.getElementById('manual-notes').value.trim();

  if (!type || !date || !time) {
    showToast('Bitte Pflichtfelder ausfüllen', 'warning');
    return;
  }

  const tour = {
    type,
    category: getTypeCategory(type),
    subtype,
    date,
    time: formatTime(time),
    guides: guide ? [guide] : [],
    trainee1: null,
    trainee2: null,
    source: 'manual',
    notes: notes || null
  };

  const id = generateTourId(type, date, formatTime(time));
  if (tourExists(id)) {
    showToast('Dieser Termin existiert bereits', 'warning');
    return;
  }

  saveTour(tour).then(() => {
    showToast('Termin angelegt', 'success');
    document.getElementById('manual-form').reset();
    document.getElementById('manual-subtype-wrap').classList.add('hidden');
  }).catch(err => {
    showToast('Fehler: ' + err.message, 'error');
  });
}
