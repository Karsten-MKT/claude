// Dashboard Page
const DashboardPage = {
    render() {
        const profile = Store.getProfile();
        const totals = Store.getTodaysTotals();
        const meals = Store.getTodaysMeals();
        const dailyNeeds = Store.calculateDailyNeeds(profile);
        const macroTargets = Store.getMacroTargets(dailyNeeds);

        const remaining = dailyNeeds - totals.kalorien;
        const percentage = Math.min((totals.kalorien / dailyNeeds) * 100, 100);
        const isDeficit = remaining > 0;

        // SVG ring calculations
        const radius = 70;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;
        const ringColor = isDeficit ? '#8B9E7E' : '#D4644A';

        if (!profile) {
            return `
                <div class="px-5 py-8">
                    <div class="card text-center">
                        <div class="text-4xl mb-4">👋</div>
                        <h2 class="text-lg font-semibold mb-2">Willkommen bei NutriSnap!</h2>
                        <p class="text-charcoal-light text-sm mb-6">Richte zuerst dein Profil ein, damit wir deinen Kalorienbedarf berechnen können.</p>
                        <button onclick="router.navigate('profile')" class="btn-primary">Profil einrichten</button>
                    </div>
                </div>
            `;
        }

        const today = new Date();
        const dateStr = today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

        return `
            <div class="px-5 py-4 space-y-4">
                <!-- Date -->
                <p class="text-sm text-charcoal-light">${dateStr}</p>

                <!-- Calorie Ring Card -->
                <div class="card flex items-center gap-6">
                    <div class="relative flex-shrink-0">
                        <svg class="calorie-ring" width="160" height="160" viewBox="0 0 160 160">
                            <circle cx="80" cy="80" r="${radius}" fill="none" stroke="#F5F0EB" stroke-width="10"/>
                            <circle cx="80" cy="80" r="${radius}" fill="none" stroke="${ringColor}" stroke-width="10"
                                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                                stroke-linecap="round"/>
                        </svg>
                        <div class="absolute inset-0 flex flex-col items-center justify-center">
                            <span class="text-2xl font-bold">${totals.kalorien}</span>
                            <span class="text-[11px] text-charcoal-light">von ${dailyNeeds} kcal</span>
                        </div>
                    </div>
                    <div class="flex-1 space-y-1">
                        <div class="text-center px-3 py-2 rounded-xl ${isDeficit ? 'bg-sage/10' : 'bg-red-50'}">
                            <p class="text-xs ${isDeficit ? 'text-sage-dark' : 'text-red-600'} font-medium">
                                ${isDeficit ? 'Kaloriendefizit' : 'Kalorienüberschuss'}
                            </p>
                            <p class="text-lg font-bold ${isDeficit ? 'text-sage' : 'text-red-500'}">
                                ${isDeficit ? '-' : '+'}${Math.abs(remaining)} kcal
                            </p>
                        </div>
                        <p class="text-[11px] text-charcoal-light text-center">
                            ${isDeficit ? 'Noch verfügbar heute' : 'Über deinem Tagesziel'}
                        </p>
                    </div>
                </div>

                <!-- Macros Card -->
                <div class="card">
                    <h3 class="text-sm font-semibold mb-3">Makronährstoffe</h3>
                    <div class="space-y-3">
                        ${this.renderMacroBar('Protein', totals.protein, macroTargets.protein, '#8B9E7E')}
                        ${this.renderMacroBar('Fett', totals.fett, macroTargets.fett, '#B8956A')}
                        ${this.renderMacroBar('Kohlenhydrate', totals.kohlenhydrate, macroTargets.kohlenhydrate, '#7BA3C4')}
                    </div>
                </div>

                <!-- Today's Meals -->
                <div class="card">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-sm font-semibold">Heutige Mahlzeiten</h3>
                        <span class="text-xs text-charcoal-light">${meals.length} Einträge</span>
                    </div>
                    ${meals.length === 0 ? `
                        <div class="text-center py-6">
                            <p class="text-charcoal-light text-sm">Noch keine Mahlzeiten heute</p>
                            <button onclick="router.navigate('capture')" class="text-sage text-sm font-medium mt-2">+ Mahlzeit hinzufügen</button>
                        </div>
                    ` : `
                        <div class="space-y-2">
                            ${meals.map(meal => this.renderMealItem(meal)).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    renderMacroBar(label, current, target, color) {
        const pct = Math.min((current / target) * 100, 100);
        return `
            <div>
                <div class="flex justify-between text-xs mb-1">
                    <span class="text-charcoal-light">${label}</span>
                    <span class="font-medium">${current}g / ${target}g</span>
                </div>
                <div class="macro-bar">
                    <div class="macro-bar-fill" style="width: ${pct}%; background: ${color}"></div>
                </div>
            </div>
        `;
    },

    renderMealItem(meal) {
        const time = new Date(meal.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        return `
            <div class="meal-item flex items-center gap-3 p-3 rounded-xl bg-cream/50 hover:bg-beige/50">
                <div class="w-10 h-10 rounded-xl bg-beige flex items-center justify-center text-lg flex-shrink-0">
                    🍽️
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate">${meal.gericht}</p>
                    <p class="text-[11px] text-charcoal-light">${time} · ${meal.portionsgroesse || ''}</p>
                </div>
                <div class="text-right flex-shrink-0">
                    <p class="text-sm font-semibold">${meal.kalorien} kcal</p>
                    <p class="text-[10px] text-charcoal-light">P${meal.protein}g F${meal.fett}g K${meal.kohlenhydrate}g</p>
                </div>
            </div>
        `;
    }
};
