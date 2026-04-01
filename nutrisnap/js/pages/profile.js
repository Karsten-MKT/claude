// Profile Page
const ProfilePage = {
    render() {
        const profile = Store.getProfile() || {
            geschlecht: 'maennlich',
            alter: '',
            groesse: '',
            gewicht: '',
            aktivitaet: 'moderat',
            ziel: 'abnehmen'
        };

        const dailyNeeds = profile.alter ? Store.calculateDailyNeeds(profile) : null;

        return `
            <div class="px-5 py-4 space-y-4">
                <div class="card">
                    <h2 class="text-lg font-semibold mb-1">Dein Profil</h2>
                    <p class="text-sm text-charcoal-light mb-5">Diese Daten werden für die Berechnung deines Kalorienbedarfs benötigt.</p>

                    <form onsubmit="ProfilePage.save(event)" class="space-y-4">
                        <!-- Geschlecht -->
                        <div>
                            <label class="text-xs font-medium text-charcoal-light uppercase tracking-wide">Geschlecht</label>
                            <div class="flex gap-2 mt-1.5">
                                <button type="button" onclick="ProfilePage.setGender('maennlich', this)"
                                    class="gender-btn flex-1 py-3 rounded-xl text-sm font-medium transition-all
                                    ${profile.geschlecht === 'maennlich' ? 'bg-sage text-white' : 'bg-beige text-charcoal'}">
                                    Männlich
                                </button>
                                <button type="button" onclick="ProfilePage.setGender('weiblich', this)"
                                    class="gender-btn flex-1 py-3 rounded-xl text-sm font-medium transition-all
                                    ${profile.geschlecht === 'weiblich' ? 'bg-sage text-white' : 'bg-beige text-charcoal'}">
                                    Weiblich
                                </button>
                            </div>
                            <input type="hidden" id="geschlecht" value="${profile.geschlecht}">
                        </div>

                        <!-- Alter -->
                        <div>
                            <label for="alter" class="text-xs font-medium text-charcoal-light uppercase tracking-wide">Alter</label>
                            <input type="number" id="alter" class="input-field mt-1.5" placeholder="z.B. 28"
                                value="${profile.alter}" min="10" max="120" required>
                        </div>

                        <!-- Größe -->
                        <div>
                            <label for="groesse" class="text-xs font-medium text-charcoal-light uppercase tracking-wide">Größe (cm)</label>
                            <input type="number" id="groesse" class="input-field mt-1.5" placeholder="z.B. 175"
                                value="${profile.groesse}" min="100" max="250" required>
                        </div>

                        <!-- Gewicht -->
                        <div>
                            <label for="gewicht" class="text-xs font-medium text-charcoal-light uppercase tracking-wide">Gewicht (kg)</label>
                            <input type="number" id="gewicht" class="input-field mt-1.5" placeholder="z.B. 75"
                                value="${profile.gewicht}" min="30" max="300" step="0.1" required>
                        </div>

                        <!-- Aktivitätslevel -->
                        <div>
                            <label for="aktivitaet" class="text-xs font-medium text-charcoal-light uppercase tracking-wide">Aktivitätslevel</label>
                            <select id="aktivitaet" class="input-field mt-1.5">
                                <option value="sedentaer" ${profile.aktivitaet === 'sedentaer' ? 'selected' : ''}>Sitzend (wenig Bewegung)</option>
                                <option value="leicht" ${profile.aktivitaet === 'leicht' ? 'selected' : ''}>Leicht aktiv (1-2x Sport/Woche)</option>
                                <option value="moderat" ${profile.aktivitaet === 'moderat' ? 'selected' : ''}>Moderat aktiv (3-5x Sport/Woche)</option>
                                <option value="aktiv" ${profile.aktivitaet === 'aktiv' ? 'selected' : ''}>Sehr aktiv (6-7x Sport/Woche)</option>
                                <option value="sehr_aktiv" ${profile.aktivitaet === 'sehr_aktiv' ? 'selected' : ''}>Extrem aktiv (Leistungssport)</option>
                            </select>
                        </div>

                        <button type="submit" class="btn-primary mt-2">Profil speichern</button>
                    </form>
                </div>

                ${dailyNeeds ? `
                    <div class="card text-center">
                        <p class="text-xs text-charcoal-light uppercase tracking-wide mb-1">Dein täglicher Kalorienbedarf</p>
                        <p class="text-3xl font-bold text-sage">${dailyNeeds}</p>
                        <p class="text-sm text-charcoal-light">kcal pro Tag</p>
                    </div>
                ` : ''}

                <!-- Data Management -->
                <div class="card">
                    <h3 class="text-sm font-semibold mb-3">Daten verwalten</h3>
                    <button onclick="ProfilePage.clearAllData()"
                        class="w-full py-2 px-4 text-sm text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                        Alle Daten löschen
                    </button>
                </div>
            </div>
        `;
    },

    setGender(gender) {
        document.getElementById('geschlecht').value = gender;
        document.querySelectorAll('.gender-btn').forEach(btn => {
            btn.className = btn.className.replace(/bg-sage text-white|bg-beige text-charcoal/g, '');
            if (btn.textContent.trim().toLowerCase().startsWith(gender === 'maennlich' ? 'm' : 'w')) {
                btn.classList.add('bg-sage', 'text-white');
            } else {
                btn.classList.add('bg-beige', 'text-charcoal');
            }
        });
    },

    save(event) {
        event.preventDefault();
        const profile = {
            geschlecht: document.getElementById('geschlecht').value,
            alter: parseInt(document.getElementById('alter').value),
            groesse: parseInt(document.getElementById('groesse').value),
            gewicht: parseFloat(document.getElementById('gewicht').value),
            aktivitaet: document.getElementById('aktivitaet').value,
        };
        Store.saveProfile(profile);
        router.navigate('dashboard');
    },

    clearAllData() {
        if (confirm('Wirklich alle Daten (Profil und Mahlzeiten) löschen? Dies kann nicht rückgängig gemacht werden.')) {
            localStorage.removeItem(Store.KEYS.PROFILE);
            localStorage.removeItem(Store.KEYS.MEALS);
            router.refresh();
        }
    }
};
