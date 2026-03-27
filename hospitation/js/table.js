// ============================================================
// table.js - Anmeldetabelle mit Filter, Sortierung, Echtzeit-Sync
// ============================================================

let tableSortField = 'date';
let tableSortDir = 'asc';

function initTable() {
  // Sort headers
  document.querySelectorAll('#tours-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (tableSortField === field) {
        tableSortDir = tableSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        tableSortField = field;
        tableSortDir = 'asc';
      }
      renderTable();
    });
  });

  // Filters
  document.getElementById('filter-type').addEventListener('change', renderTable);
  document.getElementById('filter-from').addEventListener('change', renderTable);
  document.getElementById('filter-to').addEventListener('change', renderTable);
  document.getElementById('filter-free').addEventListener('change', renderTable);
  document.getElementById('filter-reset').addEventListener('click', () => {
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-from').value = '';
    document.getElementById('filter-to').value = '';
    document.getElementById('filter-free').checked = false;
    renderTable();
  });

  populateTypeFilter();
}

function populateTypeFilter() {
  const select = document.getElementById('filter-type');
  const existing = select.querySelectorAll('option:not([value=""])');
  existing.forEach(o => o.remove());
  Object.entries(TOUR_TYPES).forEach(([key, val]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = val.label;
    select.appendChild(opt);
  });
}

function renderTable() {
  if (firebasePermissionDenied) return; // Don't overwrite permission error message
  let tours = getToursArray();

  // Apply filters
  const filterType = document.getElementById('filter-type').value;
  const filterFrom = document.getElementById('filter-from').value;
  const filterTo = document.getElementById('filter-to').value;
  const filterFree = document.getElementById('filter-free').checked;

  if (filterType) tours = tours.filter(t => t.type === filterType);
  if (filterFrom) tours = tours.filter(t => t.date >= filterFrom);
  if (filterTo) tours = tours.filter(t => t.date <= filterTo);
  if (filterFree) tours = tours.filter(t => !t.trainee1 || !t.trainee2);

  // Sort
  tours.sort((a, b) => {
    let va = a[tableSortField] || '';
    let vb = b[tableSortField] || '';
    if (tableSortField === 'date') {
      va = a.date + (a.time || '');
      vb = b.date + (b.time || '');
    }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return tableSortDir === 'asc' ? cmp : -cmp;
  });

  // Update sort indicators
  document.querySelectorAll('#tours-table th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === tableSortField) {
      th.classList.add(tableSortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });

  // Render rows
  const tbody = document.getElementById('tours-tbody');
  if (tours.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="px-3 py-8 text-center text-gray-400">Keine Termine gefunden</td></tr>';
    document.getElementById('tour-count').textContent = '0';
    return;
  }

  tbody.innerHTML = tours.map(tour => {
    const past = isDatePast(tour.date);
    const count = (tour.trainee1 ? 1 : 0) + (tour.trainee2 ? 1 : 0);
    const rowClass = past ? 'tour-row-past' : count === 2 ? 'tour-row-full' : count === 1 ? 'tour-row-partial' : 'tour-row-free';
    const guides = Array.isArray(tour.guides) ? tour.guides.join(', ') : (tour.guides || '-');
    const subtypeLabel = tour.subtype ? ` (${GAENGE_SUBTYPES[tour.subtype] || tour.subtype})` : '';

    return `<tr class="${rowClass} border-b border-gray-100 hover:bg-gray-50/50" data-tour-id="${tour.id}">
      <td class="px-3 py-2"><span class="${getTypeBadgeClass(tour.type)}">${getTypeLabel(tour.type)}${subtypeLabel}</span></td>
      <td class="px-3 py-2 whitespace-nowrap">${getDayOfWeek(tour.date)}, ${formatDateDE(tour.date)}</td>
      <td class="px-3 py-2 whitespace-nowrap">${formatTime(tour.time) || '-'}${tour.endTime ? ' – ' + formatTime(tour.endTime) : ''}</td>
      <td class="px-3 py-2">${guides}</td>
      <td class="px-3 py-2">${renderTraineeSelect(tour.id, 'trainee1', tour.trainee1, tour.trainee2, past)}</td>
      <td class="px-3 py-2">${renderTraineeSelect(tour.id, 'trainee2', tour.trainee2, tour.trainee1, past)}</td>
      <td class="px-2 py-2"><button class="edit-tour-btn text-gray-400 hover:text-primary-600 transition-colors" data-tour-id="${tour.id}" title="Bearbeiten">&#9998;</button></td>
    </tr>`;
  }).join('');

  document.getElementById('tour-count').textContent = tours.length;

  // Attach change handlers
  tbody.querySelectorAll('.trainee-select').forEach(select => {
    select.addEventListener('change', onTraineeSelectChange);
  });
  tbody.querySelectorAll('.edit-tour-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.tourId));
  });
}

function renderTraineeSelect(tourId, field, currentValue, otherValue, disabled) {
  const opts = ['<option value="">-</option>'];
  TRAINEES.forEach(name => {
    const selected = name === currentValue ? ' selected' : '';
    const disabledAttr = name === otherValue ? ' disabled' : '';
    opts.push(`<option value="${name}"${selected}${disabledAttr}>${name}</option>`);
  });
  return `<select class="trainee-select" data-tour-id="${tourId}" data-field="${field}" ${disabled ? 'disabled' : ''}>${opts.join('')}</select>`;
}

function onTraineeSelectChange(e) {
  const tourId = e.target.dataset.tourId;
  const field = e.target.dataset.field;
  const value = e.target.value || null;

  // Check for duplicate guide warning (Öffentliche Führungen)
  const tour = toursCache[tourId];
  if (value && tour && tour.type === 'oeffentlich') {
    checkDuplicateGuide(value, tour, tourId);
  }

  updateTourField(tourId, field, value).catch(err => {
    console.error('Update failed:', err);
    showToast('Fehler beim Speichern', 'error');
  });
}

function checkDuplicateGuide(traineeName, tour, excludeTourId) {
  if (!tour.guides || !tour.guides.length) return;
  const tourGuides = tour.guides.map(g => g.trim().toLowerCase());
  const allTours = getToursArray();
  const duplicates = allTours.filter(t =>
    t.id !== excludeTourId &&
    t.type === 'oeffentlich' &&
    (t.trainee1 === traineeName || t.trainee2 === traineeName) &&
    t.guides && t.guides.some(g => tourGuides.includes(g.trim().toLowerCase()))
  );
  if (duplicates.length > 0) {
    const guideNames = tour.guides.join(', ');
    showToast(`Hinweis: ${traineeName} war schon bei Guide "${guideNames}" angemeldet. Für Öffentliche Führungen werden verschiedene Guides empfohlen!`, 'warning', 5000);
  }
}

// ---- Edit Modal ----

function initEditModal() {
  // Populate type dropdown
  const typeSelect = document.getElementById('edit-type');
  Object.entries(TOUR_TYPES).forEach(([key, val]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = val.label;
    typeSelect.appendChild(opt);
  });

  // Show/hide subtype when type changes
  typeSelect.addEventListener('change', () => {
    document.getElementById('edit-subtype-wrap').classList.toggle('hidden', typeSelect.value !== 'gaenge');
  });

  // Close handlers
  document.getElementById('edit-modal-close').addEventListener('click', closeEditModal);
  document.getElementById('edit-cancel').addEventListener('click', closeEditModal);
  document.getElementById('edit-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeEditModal();
  });

  // Save
  document.getElementById('edit-save').addEventListener('click', saveEditModal);

  // Delete
  document.getElementById('edit-delete').addEventListener('click', deleteFromEditModal);
}

function openEditModal(tourId) {
  const tour = toursCache[tourId];
  if (!tour) return;

  document.getElementById('edit-tour-id').value = tourId;
  document.getElementById('edit-type').value = tour.type || '';
  document.getElementById('edit-date').value = tour.date || '';
  document.getElementById('edit-time').value = tour.time || '';
  document.getElementById('edit-guides').value = Array.isArray(tour.guides) ? tour.guides.join(', ') : (tour.guides || '');

  // Subtype
  const isGaenge = tour.type === 'gaenge';
  document.getElementById('edit-subtype-wrap').classList.toggle('hidden', !isGaenge);
  document.getElementById('edit-subtype').value = tour.subtype || '';

  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
}

function saveEditModal() {
  const tourId = document.getElementById('edit-tour-id').value;
  const tour = toursCache[tourId];
  if (!tour) return;

  const newType = document.getElementById('edit-type').value;
  const newDate = document.getElementById('edit-date').value;
  const newTime = document.getElementById('edit-time').value;
  const guidesStr = document.getElementById('edit-guides').value;
  const newGuides = guidesStr ? guidesStr.split(',').map(g => g.trim()).filter(Boolean) : [];
  const newSubtype = newType === 'gaenge' ? (document.getElementById('edit-subtype').value || null) : null;
  const newCategory = getTypeCategory(newType);

  if (!newDate) {
    showToast('Bitte ein Datum angeben', 'error');
    return;
  }

  // Check if ID needs to change (type, date, or time changed)
  const newId = generateTourId(newType, newDate, newTime);
  const idChanged = newId !== tourId;

  const updatedTour = {
    ...tour,
    type: newType,
    category: newCategory,
    subtype: newSubtype,
    date: newDate,
    time: newTime,
    guides: newGuides
  };
  delete updatedTour.id;

  if (idChanged) {
    // Delete old entry, create new one
    deleteTour(tourId).then(() => {
      updatedTour.createdAt = tour.createdAt || Date.now();
      return toursRef.child(newId).set(updatedTour);
    }).then(() => {
      showToast('Tour aktualisiert', 'success');
      closeEditModal();
    }).catch(err => {
      console.error('Edit failed:', err);
      showToast('Fehler beim Speichern', 'error');
    });
  } else {
    // Update in place
    toursRef.child(tourId).update({
      type: newType,
      category: newCategory,
      subtype: newSubtype,
      date: newDate,
      time: newTime,
      guides: newGuides
    }).then(() => {
      showToast('Tour aktualisiert', 'success');
      closeEditModal();
    }).catch(err => {
      console.error('Edit failed:', err);
      showToast('Fehler beim Speichern', 'error');
    });
  }
}

function deleteFromEditModal() {
  const tourId = document.getElementById('edit-tour-id').value;
  if (!tourId) return;

  const tour = toursCache[tourId];
  const label = tour ? `${getTypeLabel(tour.type)} am ${formatDateDE(tour.date)}` : tourId;

  if (!confirm(`Tour "${label}" wirklich löschen?`)) return;
  if (!confirm('Sicher? Diese Aktion kann nicht rückgängig gemacht werden.')) return;

  deleteTour(tourId).then(() => {
    showToast('Tour gelöscht', 'success');
    closeEditModal();
  }).catch(err => {
    console.error('Delete failed:', err);
    showToast('Fehler beim Löschen', 'error');
  });
}
