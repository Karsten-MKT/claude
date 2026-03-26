// ============================================================
// calendar.js - FullCalendar-Integration
// ============================================================

let calendarInstance = null;

function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  calendarInstance = new FullCalendar.Calendar(calendarEl, {
    locale: 'de',
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,listMonth'
    },
    height: 'auto',
    events: [],
    eventClick: (info) => {
      openCalendarModal(info.event.extendedProps.tourId);
    },
    eventDidMount: (info) => {
      const count = info.event.extendedProps.traineeCount;
      const el = info.el;
      if (count === 0) el.classList.add('cal-event-free');
      else if (count === 1) el.classList.add('cal-event-partial');
      else el.classList.add('cal-event-full');
    }
  });
  calendarInstance.render();

  document.getElementById('modal-close').addEventListener('click', closeCalendarModal);
  document.getElementById('calendar-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCalendarModal();
  });

  // Populate legend
  const legendEl = document.getElementById('calendar-legend');
  if (legendEl) {
    legendEl.innerHTML = Object.entries(TOUR_TYPES).map(([key, val]) => {
      return `<span class="whitespace-nowrap"><span class="${getTypeBadgeClass(key)} text-xs">${val.short}</span> = ${val.label}</span>`;
    }).join('');
  }
}

function renderCalendar() {
  if (!calendarInstance) return;
  calendarInstance.removeAllEvents();

  const tours = getToursArray();
  const events = tours.map(tour => {
    const count = (tour.trainee1 ? 1 : 0) + (tour.trainee2 ? 1 : 0);
    const subtypeLabel = tour.subtype ? `-${tour.subtype.charAt(0).toUpperCase()}` : '';
    return {
      id: tour.id,
      title: `${getTypeShort(tour.type)}${subtypeLabel} ${count}/2`,
      start: tour.date + (tour.time ? 'T' + tour.time : ''),
      allDay: !tour.time,
      extendedProps: { tourId: tour.id, traineeCount: count }
    };
  });
  calendarInstance.addEventSource(events);
}

function openCalendarModal(tourId) {
  const tour = toursCache[tourId];
  if (!tour) return;

  const modal = document.getElementById('calendar-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  const guides = Array.isArray(tour.guides) ? tour.guides.join(', ') : (tour.guides || '-');
  const subtypeLabel = tour.subtype ? ` (${GAENGE_SUBTYPES[tour.subtype] || tour.subtype})` : '';

  title.innerHTML = `<span class="${getTypeBadgeClass(tour.type)}">${getTypeLabel(tour.type)}${subtypeLabel}</span>`;

  body.innerHTML = `
    <div class="text-sm space-y-2">
      <div class="flex justify-between">
        <span class="text-gray-500">Datum:</span>
        <span class="font-medium">${getDayOfWeek(tour.date)}, ${formatDateDE(tour.date)}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Uhrzeit:</span>
        <span class="font-medium">${formatTime(tour.time) || '-'}${tour.endTime ? ' – ' + formatTime(tour.endTime) : ''}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Guide(s):</span>
        <span class="font-medium">${guides}</span>
      </div>
      <hr class="my-2">
      <div>
        <label class="block text-gray-500 mb-1">Azubi 1:</label>
        ${renderModalTraineeSelect(tourId, 'trainee1', tour.trainee1, tour.trainee2)}
      </div>
      <div>
        <label class="block text-gray-500 mb-1">Azubi 2:</label>
        ${renderModalTraineeSelect(tourId, 'trainee2', tour.trainee2, tour.trainee1)}
      </div>
    </div>
  `;

  body.querySelectorAll('.trainee-select').forEach(select => {
    select.addEventListener('change', onTraineeSelectChange);
  });

  modal.classList.remove('hidden');
}

function renderModalTraineeSelect(tourId, field, currentValue, otherValue) {
  const past = isDatePast(toursCache[tourId]?.date);
  return renderTraineeSelect(tourId, field, currentValue, otherValue, past);
}

function closeCalendarModal() {
  document.getElementById('calendar-modal').classList.add('hidden');
}
