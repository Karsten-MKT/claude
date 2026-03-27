// ============================================================
// settings.js - Azubi-Verwaltung & Daten-Management
// ============================================================

function initSettings() {
  document.getElementById('add-trainee-btn').addEventListener('click', () => {
    const input = document.getElementById('new-trainee-name');
    const name = input.value.trim();
    if (!name) return;
    addTrainee(name).then(() => {
      input.value = '';
      showToast(`"${name}" hinzugefügt`, 'success');
    }).catch(err => {
      if (err === 'Exists') showToast(`"${name}" existiert bereits`, 'warning');
      else showToast('Fehler beim Hinzufügen', 'error');
    });
  });

  document.getElementById('new-trainee-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('add-trainee-btn').click();
    }
  });

  document.getElementById('delete-all-tours-btn').addEventListener('click', () => {
    if (!confirm('Wirklich ALLE Touren löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) return;
    deleteAllTours().then(() => {
      showToast('Alle Touren gelöscht', 'success');
    }).catch(() => {
      showToast('Fehler beim Löschen', 'error');
    });
  });
}

function renderTraineeManagement() {
  const container = document.getElementById('trainee-list');
  if (!container) return;

  container.innerHTML = TRAINEES.map(name => {
    return `<div class="flex items-center gap-2 py-1.5 px-3 bg-gray-50 rounded-lg group" data-trainee="${name}">
      <span class="trainee-display flex-1 font-medium text-gray-800">${name}</span>
      <input type="text" class="trainee-edit-input input-field flex-1 hidden" value="${name}">
      <button class="trainee-rename-btn text-gray-400 hover:text-primary-600 transition-colors text-sm" title="Umbenennen">&#9998;</button>
      <button class="trainee-save-btn text-green-600 hover:text-green-800 transition-colors text-sm hidden font-bold" title="Speichern">&#10003;</button>
      <button class="trainee-cancel-btn text-gray-400 hover:text-gray-600 transition-colors text-sm hidden" title="Abbrechen">&#10005;</button>
      <button class="trainee-delete-btn text-gray-300 hover:text-red-600 transition-colors text-sm" title="Entfernen">&#128465;</button>
    </div>`;
  }).join('');

  // Rename handlers
  container.querySelectorAll('.trainee-rename-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('[data-trainee]');
      row.querySelector('.trainee-display').classList.add('hidden');
      row.querySelector('.trainee-edit-input').classList.remove('hidden');
      row.querySelector('.trainee-edit-input').focus();
      row.querySelector('.trainee-rename-btn').classList.add('hidden');
      row.querySelector('.trainee-delete-btn').classList.add('hidden');
      row.querySelector('.trainee-save-btn').classList.remove('hidden');
      row.querySelector('.trainee-cancel-btn').classList.remove('hidden');
    });
  });

  container.querySelectorAll('.trainee-save-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('[data-trainee]');
      const oldName = row.dataset.trainee;
      const newName = row.querySelector('.trainee-edit-input').value.trim();
      if (!newName || newName === oldName) {
        resetTraineeRow(row);
        return;
      }
      renameTrainee(oldName, newName).then(() => {
        showToast(`"${oldName}" umbenannt zu "${newName}"`, 'success');
      }).catch(() => {
        showToast('Fehler beim Umbenennen', 'error');
        resetTraineeRow(row);
      });
    });
  });

  container.querySelectorAll('.trainee-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      resetTraineeRow(btn.closest('[data-trainee]'));
    });
  });

  container.querySelectorAll('.trainee-edit-input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.closest('[data-trainee]').querySelector('.trainee-save-btn').click();
      }
      if (e.key === 'Escape') {
        resetTraineeRow(input.closest('[data-trainee]'));
      }
    });
  });

  // Delete handlers
  container.querySelectorAll('.trainee-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.closest('[data-trainee]').dataset.trainee;
      if (!confirm(`"${name}" wirklich entfernen?`)) return;
      removeTrainee(name).then(() => {
        showToast(`"${name}" entfernt`, 'success');
      }).catch(() => {
        showToast('Fehler beim Entfernen', 'error');
      });
    });
  });
}

function resetTraineeRow(row) {
  const name = row.dataset.trainee;
  row.querySelector('.trainee-display').classList.remove('hidden');
  row.querySelector('.trainee-edit-input').classList.add('hidden');
  row.querySelector('.trainee-edit-input').value = name;
  row.querySelector('.trainee-rename-btn').classList.remove('hidden');
  row.querySelector('.trainee-delete-btn').classList.remove('hidden');
  row.querySelector('.trainee-save-btn').classList.add('hidden');
  row.querySelector('.trainee-cancel-btn').classList.add('hidden');
}
