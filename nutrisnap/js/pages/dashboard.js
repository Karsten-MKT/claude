// Dashboard Page
const DashboardPage = {
    microExpanded: false,

    render() {
        const profile = Store.getProfile();
        const totals = Store.getTodaysTotals();
        const meals = Store.getTodaysMeals();
        const dailyNeeds = Store.calculateDailyNeeds(profile);
        const macroTargets = Store.getMacroTargets(dailyNeeds);

        const remaining = dailyNeeds - totals.kalorien;
        const percentage = Math.min((totals.kalorien / dailyNeeds) * 100, 100);
        const isDeficit = remaining > 0;

        const radius = 70;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;
        const ringColor = isDeficit ? '#5CB88A' : '#F28B73';

        if (!profile) {
            return `
                <div class="px-5 py-8">
                    <div class="card card-leaf text-center">
                        <div class="text-4xl mb-4">🌱</div>
                        <h2 class="text-lg font-semibold mb-2">Willkommen bei NutriSnap!</h2>
                        <p class="text-charcoal-light text-sm mb-6">Richte zuerst dein Profil ein, damit wir deinen Kalorienbedarf berechnen können.</p>
                        <button onclick="router.navigate('profile')" class="btn-primary">Profil einrichten</button>
                    </div>
                </div>
            `;
        }

        const today = new Date();
        const dateStr = today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

        // Water
        const water = Store.getTodaysWater();
        const waterTarget = Store.calculateDailyWaterNeed(profile);
        const waterPct = Math.min((water.total / waterTarget) * 100, 100);

        // Deficiencies (only alert after noon)
        const hour = today.getHours();
        const deficiencies = Nutrients.getDeficiencies(totals, profile, 60);
        const criticalDeficiencies = deficiencies.filter(d => d.percentage < 30 && hour >= 18);
        const warningDeficiencies = deficiencies.filter(d => d.percentage < 50 && hour >= 12);

        return `
            <div class="px-5 py-4 space-y-4">
                <p class="text-sm text-charcoal-light">${dateStr}</p>

                <!-- Deficiency Alert -->
                ${criticalDeficiencies.length > 0 ? `
                    <div class="p-3 rounded-xl bg-coral-light border border-coral/20">
                        <p class="text-sm font-medium text-coral flex items-center gap-1.5">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
                            Nährstoff-Hinweis
                        </p>
                        <p class="text-xs text-charcoal-light mt-1">Dir fehlen heute: ${criticalDeficiencies.map(d => d.label).join(', ')}</p>
                    </div>
                ` : warningDeficiencies.length > 0 ? `
                    <div class="p-3 rounded-xl bg-yellow-50 border border-yellow-200">
                        <p class="text-sm font-medium text-yellow-700 flex items-center gap-1.5">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            Tipp
                        </p>
                        <p class="text-xs text-charcoal-light mt-1">Achte heute noch auf: ${warningDeficiencies.slice(0, 3).map(d => d.label).join(', ')}</p>
                    </div>
                ` : ''}

                <!-- Calorie Ring Card -->
                <div class="card card-hero card-leaf flex items-center gap-6">
                    <div class="relative flex-shrink-0">
                        <svg class="calorie-ring" width="160" height="160" viewBox="0 0 160 160">
                            <circle cx="80" cy="80" r="${radius}" fill="none" stroke="#E8F5EE" stroke-width="10"/>
                            <circle cx="80" cy="80" r="${radius}" fill="none" stroke="${ringColor}" stroke-width="10"
                                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
                        </svg>
                        <div class="absolute inset-0 flex flex-col items-center justify-center">
                            <span class="text-2xl font-bold">${totals.kalorien}</span>
                            <span class="text-[11px] text-charcoal-light">von ${dailyNeeds} kcal</span>
                        </div>
                    </div>
                    <div class="flex-1 space-y-1">
                        <div class="text-center px-3 py-2 rounded-xl ${isDeficit ? 'bg-mint-light' : 'bg-coral-light'}">
                            <p class="text-xs ${isDeficit ? 'text-mint-dark' : 'text-coral'} font-medium">
                                ${isDeficit ? 'Kaloriendefizit' : 'Kalorienüberschuss'}
                            </p>
                            <p class="text-lg font-bold ${isDeficit ? 'text-mint' : 'text-coral'}">
                                ${isDeficit ? '-' : '+'}${Math.abs(remaining)} kcal
                            </p>
                        </div>
                        <p class="text-[11px] text-charcoal-light text-center">
                            ${isDeficit ? 'Noch verfügbar heute' : 'Über deinem Tagesziel'}
                        </p>
                    </div>
                </div>

                <!-- Water Card -->
                <div class="card">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-sm font-semibold flex items-center gap-1.5">
                            💧 Wasseraufnahme
                        </h3>
                        <span class="text-xs text-charcoal-light">${water.total}ml / ${waterTarget}ml</span>
                    </div>
                    <div class="water-bar mb-3">
                        <div class="water-bar-fill" style="width: ${waterPct}%"></div>
                    </div>
                    <div class="flex gap-2 justify-center">
                        <button onclick="Store.addWaterIntake(150); router.refresh()" class="water-btn">+150ml</button>
                        <button onclick="Store.addWaterIntake(250); router.refresh()" class="water-btn water-btn-main">+250ml</button>
                        <button onclick="Store.addWaterIntake(500); router.refresh()" class="water-btn">+500ml</button>
                        <button onclick="Store.removeLastWaterIntake(); router.refresh()" class="water-btn text-charcoal-light" title="Rückgängig">↩</button>
                    </div>
                </div>

                <!-- Macros Card -->
                <div class="card card-leaf">
                    <h3 class="text-sm font-semibold mb-3">Makronährstoffe</h3>
                    <div class="space-y-3">
                        ${this.renderMacroBar('Protein', totals.protein, macroTargets.protein, '#5CB88A')}
                        ${this.renderMacroBar('Fett', totals.fett, macroTargets.fett, '#F28B73')}
                        ${this.renderMacroBar('Kohlenhydrate', totals.kohlenhydrate, macroTargets.kohlenhydrate, '#7BBBDD')}
                    </div>
                </div>

                <!-- Micronutrients Card -->
                <div class="card">
                    <button onclick="DashboardPage.microExpanded = !DashboardPage.microExpanded; router.refresh()"
                        class="flex justify-between items-center w-full">
                        <h3 class="text-sm font-semibold">Vitamine & Mineralstoffe</h3>
                        <svg class="w-4 h-4 text-charcoal-light transition-transform ${this.microExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </button>
                    ${this.microExpanded ? this.renderMicronutrients(totals, profile) : ''}
                </div>

                <!-- Food Suggestions -->
                ${deficiencies.length > 0 ? `
                    <div class="card">
                        <h3 class="text-sm font-semibold mb-3 flex items-center gap-1.5">
                            🌿 Ernährungsvorschläge
                        </h3>
                        <div class="space-y-3">
                            ${deficiencies.slice(0, 4).map(d => `
                                <div>
                                    <div class="flex justify-between items-center mb-1">
                                        <span class="text-xs font-medium ${Nutrients.getColorClass(d.percentage)}">${d.label}</span>
                                        <span class="text-[10px] text-charcoal-light">${d.current}/${d.target}${d.unit} (${d.percentage}%)</span>
                                    </div>
                                    <div class="flex flex-wrap gap-1.5">
                                        ${d.foods.slice(0, 4).map(f => `
                                            <span class="text-[11px] px-2 py-0.5 rounded-full bg-mint-light text-mint-dark">${f}</span>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Today's Meals -->
                <div class="card">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-sm font-semibold">Heutige Mahlzeiten</h3>
                        <span class="text-xs text-charcoal-light">${meals.length} Einträge</span>
                    </div>
                    ${meals.length === 0 ? `
                        <div class="text-center py-6">
                            <p class="text-charcoal-light text-sm">Noch keine Mahlzeiten heute</p>
                            <button onclick="router.navigate('capture')" class="text-mint text-sm font-medium mt-2">+ Mahlzeit hinzufügen</button>
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

    renderMicronutrients(totals, profile) {
        const rda = Nutrients.getRDA(profile);
        return `
            <div class="grid grid-cols-2 gap-2 mt-3">
                ${Object.entries(rda).map(([key, info]) => {
                    const current = totals[key] || 0;
                    const pct = Math.min(Math.round((current / info.target) * 100), 100);
                    const color = Nutrients.getColor(pct);
                    return `
                        <div class="p-2 rounded-lg bg-cream/70">
                            <div class="flex justify-between items-center mb-1">
                                <span class="text-[11px] text-charcoal-light">${info.label}</span>
                                <span class="text-[10px] font-medium" style="color:${color}">${pct}%</span>
                            </div>
                            <div class="macro-bar" style="height:5px">
                                <div class="macro-bar-fill" style="width:${pct}%; background:${color}"></div>
                            </div>
                            <p class="text-[10px] text-charcoal-light mt-0.5">${current}/${info.target}${info.unit}</p>
                        </div>
                    `;
                }).join('')}
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
            <div class="meal-item flex items-center gap-3 p-3 rounded-xl bg-mint-light/30 hover:bg-mint-light/50">
                <div class="w-10 h-10 rounded-xl bg-mint-light flex items-center justify-center text-lg flex-shrink-0">
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
