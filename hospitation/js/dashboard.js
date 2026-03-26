// ============================================================
// dashboard.js - Fortschritt pro Azubi
// ============================================================

function initDashboard() {
  const select = document.getElementById('dashboard-trainee');
  TRAINEES.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
  select.addEventListener('change', renderDashboard);
}

function renderDashboard() {
  const trainee = document.getElementById('dashboard-trainee').value;
  const content = document.getElementById('dashboard-content');
  const empty = document.getElementById('dashboard-empty');

  if (!trainee) {
    content.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  content.classList.remove('hidden');
  empty.classList.add('hidden');

  const tours = getToursArray();
  const myTours = tours.filter(t => t.trainee1 === trainee || t.trainee2 === trainee);
  const completed = myTours.filter(t => isDatePast(t.date));
  const upcoming = myTours.filter(t => !isDatePast(t.date)).sort((a, b) => a.date.localeCompare(b.date));

  // Count per category
  const categoryCounts = {};
  const subtypeCounts = {};
  const guidesUsed = {};

  completed.forEach(t => {
    const cat = getTypeCategory(t.type);
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

    if (t.subtype) {
      const key = `${cat}_${t.subtype}`;
      subtypeCounts[key] = (subtypeCounts[key] || 0) + 1;
    }

    if (cat === 'oeffentlich' && t.guides) {
      t.guides.forEach(g => {
        const gn = g.trim().toLowerCase();
        guidesUsed[gn] = (guidesUsed[gn] || 0) + 1;
      });
    }
  });

  // Total progress
  let totalCompleted = 0;
  Object.entries(REQUIREMENTS).forEach(([cat, req]) => {
    totalCompleted += Math.min(categoryCounts[cat] || 0, req.min);
  });

  const totalPct = Math.round((totalCompleted / TOTAL_REQUIRED) * 100);
  document.getElementById('total-progress-text').textContent = `${totalCompleted}/${TOTAL_REQUIRED}`;
  const totalBar = document.getElementById('total-progress-bar');
  totalBar.style.width = totalPct + '%';
  totalBar.classList.toggle('complete', totalCompleted >= TOTAL_REQUIRED);

  // Category cards
  const cardsContainer = document.getElementById('category-cards');
  cardsContainer.innerHTML = '';

  Object.entries(REQUIREMENTS).forEach(([cat, req]) => {
    const count = categoryCounts[cat] || 0;
    const pct = Math.min(Math.round((count / req.min) * 100), 100);
    const done = count >= req.min;

    let subcatHtml = '';
    if (req.subcategories) {
      subcatHtml = Object.entries(req.subcategories).map(([sub, subReq]) => {
        const subCount = subtypeCounts[`${cat}_${sub}`] || 0;
        const subPct = Math.min(Math.round((subCount / subReq.min) * 100), 100);
        const subDone = subCount >= subReq.min;
        return `<div class="subcategory-row">
          <span class="w-28 truncate">${subReq.label}</span>
          <div class="progress-bar-bg"><div class="progress-bar-fill ${subDone ? 'complete' : ''}" style="width:${subPct}%"></div></div>
          <span class="text-xs font-medium w-8 text-right">${subCount}/${subReq.min}</span>
        </div>`;
      }).join('');
    }

    let warningHtml = '';
    if (cat === 'oeffentlich') {
      const duplicateGuides = Object.entries(guidesUsed).filter(([, c]) => c > 1);
      if (duplicateGuides.length > 0) {
        warningHtml = `<div class="warning-badge mt-2">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          Guide(s) mehrfach besucht: ${duplicateGuides.map(([g]) => g).join(', ')}
        </div>`;
      }
    }

    const card = document.createElement('div');
    card.className = 'category-card';
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="category-label">${req.label}</div>
        <span class="text-sm font-bold ${done ? 'text-green-600' : 'text-gray-600'}">${count}/${req.min} ${done ? '✓' : ''}</span>
      </div>
      ${req.note ? `<div class="text-xs text-gray-400 mb-2">${req.note}</div>` : ''}
      <div class="progress-bar-bg mb-1">
        <div class="progress-bar-fill ${done ? 'complete' : ''}" style="width:${pct}%"></div>
      </div>
      ${subcatHtml}
      ${warningHtml}
    `;
    cardsContainer.appendChild(card);
  });

  // Upcoming tours
  const upcomingEl = document.getElementById('upcoming-tours');
  if (upcoming.length === 0) {
    upcomingEl.innerHTML = '<p class="text-sm text-gray-400">Keine kommenden Termine</p>';
  } else {
    upcomingEl.innerHTML = upcoming.map(t => {
      const guides = Array.isArray(t.guides) ? t.guides.join(', ') : (t.guides || '');
      return `<div class="flex items-center gap-3 text-sm py-1">
        <span class="${getTypeBadgeClass(t.type)}">${getTypeShort(t.type)}</span>
        <span class="font-medium">${getDayOfWeek(t.date)}, ${formatDateDE(t.date)}</span>
        <span class="text-gray-500">${formatTime(t.time) || ''}</span>
        <span class="text-gray-400">${guides}</span>
      </div>`;
    }).join('');
  }

  // Completed tours
  const completedEl = document.getElementById('completed-tours');
  if (completed.length === 0) {
    completedEl.innerHTML = '<p class="text-sm text-gray-400">Noch keine absolvierten Termine</p>';
  } else {
    completedEl.innerHTML = completed.sort((a, b) => b.date.localeCompare(a.date)).map(t => {
      const guides = Array.isArray(t.guides) ? t.guides.join(', ') : (t.guides || '');
      return `<div class="flex items-center gap-3 text-sm py-1 text-gray-500">
        <span class="${getTypeBadgeClass(t.type)}">${getTypeShort(t.type)}</span>
        <span>${formatDateDE(t.date)}</span>
        <span>${guides}</span>
        <svg class="w-4 h-4 text-green-500 ml-auto" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
      </div>`;
    }).join('');
  }
}
