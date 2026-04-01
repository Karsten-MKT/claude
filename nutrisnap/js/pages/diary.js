// Diary / Tagebuch Page
const DiaryPage = {
    selectedDate: null,

    render() {
        const dates = Store.getMealDates();
        const today = new Date().toISOString().split('T')[0];

        if (!this.selectedDate) {
            this.selectedDate = today;
        }

        const meals = Store.getMealsForDate(this.selectedDate);
        const profile = Store.getProfile();
        const dailyNeeds = Store.calculateDailyNeeds(profile);

        const totals = {
            kalorien: meals.reduce((s, m) => s + (m.kalorien || 0), 0),
            protein: meals.reduce((s, m) => s + (m.protein || 0), 0),
            fett: meals.reduce((s, m) => s + (m.fett || 0), 0),
            kohlenhydrate: meals.reduce((s, m) => s + (m.kohlenhydrate || 0), 0),
        };

        // Get last 7 days for date picker
        const recentDates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            recentDates.push(d.toISOString().split('T')[0]);
        }

        return `
            <div class="px-5 py-4 space-y-4">
                <!-- Date Selector -->
                <div class="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                    ${recentDates.map(date => {
                        const d = new Date(date + 'T12:00:00');
                        const isSelected = date === this.selectedDate;
                        const hasMeals = dates.includes(date);
                        const dayName = d.toLocaleDateString('de-DE', { weekday: 'short' });
                        const dayNum = d.getDate();
                        return `
                            <button onclick="DiaryPage.selectDate('${date}')"
                                class="flex-shrink-0 w-14 py-2 rounded-xl text-center transition-all
                                    ${isSelected ? 'bg-sage text-white' : 'bg-white text-charcoal hover:bg-beige'}">
                                <p class="text-[10px] font-medium uppercase">${dayName}</p>
                                <p class="text-lg font-bold">${dayNum}</p>
                                ${hasMeals ? `<div class="w-1.5 h-1.5 rounded-full mx-auto mt-0.5 ${isSelected ? 'bg-white/60' : 'bg-sage'}"></div>` : '<div class="h-2"></div>'}
                            </button>
                        `;
                    }).join('')}
                </div>

                <!-- Day Summary -->
                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="text-sm font-semibold">Tageszusammenfassung</h3>
                        <span class="text-xs px-2 py-1 rounded-lg ${totals.kalorien <= dailyNeeds ? 'bg-sage/10 text-sage-dark' : 'bg-red-50 text-red-600'}">
                            ${totals.kalorien <= dailyNeeds ? 'Im Defizit' : 'Überschuss'}
                        </span>
                    </div>
                    <div class="grid grid-cols-4 gap-2 text-center">
                        <div class="p-2 rounded-lg bg-cream">
                            <p class="text-lg font-bold">${totals.kalorien}</p>
                            <p class="text-[10px] text-charcoal-light">kcal</p>
                        </div>
                        <div class="p-2 rounded-lg bg-cream">
                            <p class="text-lg font-bold text-sage">${totals.protein}g</p>
                            <p class="text-[10px] text-charcoal-light">Protein</p>
                        </div>
                        <div class="p-2 rounded-lg bg-cream">
                            <p class="text-lg font-bold text-warm">${totals.fett}g</p>
                            <p class="text-[10px] text-charcoal-light">Fett</p>
                        </div>
                        <div class="p-2 rounded-lg bg-cream">
                            <p class="text-lg font-bold" style="color:#7BA3C4">${totals.kohlenhydrate}g</p>
                            <p class="text-[10px] text-charcoal-light">Karbs</p>
                        </div>
                    </div>
                </div>

                <!-- Meals List -->
                <div class="card">
                    <h3 class="text-sm font-semibold mb-3">Mahlzeiten</h3>
                    ${meals.length === 0 ? `
                        <div class="text-center py-8">
                            <p class="text-charcoal-light text-sm">Keine Mahlzeiten an diesem Tag</p>
                        </div>
                    ` : `
                        <div class="space-y-2">
                            ${meals.map(meal => this.renderMealEntry(meal)).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    renderMealEntry(meal) {
        const time = new Date(meal.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        return `
            <div class="meal-item flex items-center gap-3 p-3 rounded-xl bg-cream/50 group">
                <div class="w-10 h-10 rounded-xl bg-beige flex items-center justify-center text-lg flex-shrink-0">
                    🍽️
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate">${meal.gericht}</p>
                    <p class="text-[11px] text-charcoal-light">${time} · ${meal.kalorien} kcal</p>
                    <p class="text-[10px] text-charcoal-light">P${meal.protein}g · F${meal.fett}g · K${meal.kohlenhydrate}g</p>
                </div>
                <button onclick="DiaryPage.deleteMeal('${meal.id}')"
                    class="opacity-0 group-hover:opacity-100 p-2 text-charcoal-light hover:text-red-500 transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        `;
    },

    selectDate(date) {
        this.selectedDate = date;
        router.refresh();
    },

    deleteMeal(id) {
        if (confirm('Mahlzeit wirklich löschen?')) {
            Store.deleteMeal(id);
            router.refresh();
        }
    }
};
