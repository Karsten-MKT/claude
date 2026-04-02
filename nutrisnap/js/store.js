// NutriSnap Data Store (localStorage)
const Store = {
    KEYS: {
        PROFILE: 'nutrisnap_profile',
        MEALS: 'nutrisnap_meals',
        WATER: 'nutrisnap_water',
    },

    // Profile
    getProfile() {
        const data = localStorage.getItem(this.KEYS.PROFILE);
        return data ? JSON.parse(data) : null;
    },

    saveProfile(profile) {
        localStorage.setItem(this.KEYS.PROFILE, JSON.stringify(profile));
    },

    // Meals
    getAllMeals() {
        const data = localStorage.getItem(this.KEYS.MEALS);
        return data ? JSON.parse(data) : [];
    },

    addMeal(meal) {
        const meals = this.getAllMeals();
        meal.id = Date.now().toString();
        meal.timestamp = new Date().toISOString();
        meals.push(meal);
        localStorage.setItem(this.KEYS.MEALS, JSON.stringify(meals));
        return meal;
    },

    deleteMeal(id) {
        const meals = this.getAllMeals().filter(m => m.id !== id);
        localStorage.setItem(this.KEYS.MEALS, JSON.stringify(meals));
    },

    getMealsForDate(dateStr) {
        return this.getAllMeals().filter(m => m.timestamp.startsWith(dateStr));
    },

    getTodaysMeals() {
        const today = new Date().toISOString().split('T')[0];
        return this.getMealsForDate(today);
    },

    // Compute totals for a list of meals (macro + micro)
    computeTotals(meals) {
        const fields = [
            'kalorien', 'protein', 'fett', 'kohlenhydrate', 'ballaststoffe', 'zucker',
            'eisen', 'vitamin_a', 'vitamin_b12', 'vitamin_c', 'vitamin_d', 'vitamin_e',
            'kalzium', 'magnesium', 'zink', 'kalium'
        ];
        const totals = {};
        fields.forEach(f => {
            const sum = meals.reduce((s, m) => s + (Number(m[f]) || 0), 0);
            totals[f] = f === 'kalorien' || ['protein','fett','kohlenhydrate','ballaststoffe','zucker','vitamin_a','vitamin_c','kalzium','magnesium','kalium'].includes(f)
                ? Math.round(sum)
                : parseFloat(sum.toFixed(1));
        });
        return totals;
    },

    getTodaysTotals() {
        return this.computeTotals(this.getTodaysMeals());
    },

    getTotalsForDate(dateStr) {
        return this.computeTotals(this.getMealsForDate(dateStr));
    },

    // Calculate daily calorie needs (Mifflin-St Jeor)
    calculateDailyNeeds(profile) {
        if (!profile) return 2000;
        const { geschlecht, alter, groesse, gewicht, aktivitaet } = profile;

        let bmr;
        if (geschlecht === 'maennlich') {
            bmr = 10 * gewicht + 6.25 * groesse - 5 * alter + 5;
        } else {
            bmr = 10 * gewicht + 6.25 * groesse - 5 * alter - 161;
        }

        const factors = {
            sedentaer: 1.2, leicht: 1.375, moderat: 1.55, aktiv: 1.725, sehr_aktiv: 1.9
        };

        return Math.round(bmr * (factors[aktivitaet] || 1.4));
    },

    getMacroTargets(dailyCalories) {
        return {
            protein: Math.round(dailyCalories * 0.25 / 4),
            fett: Math.round(dailyCalories * 0.30 / 9),
            kohlenhydrate: Math.round(dailyCalories * 0.45 / 4)
        };
    },

    getMealDates() {
        const meals = this.getAllMeals();
        const dates = [...new Set(meals.map(m => m.timestamp.split('T')[0]))];
        return dates.sort().reverse();
    },

    // --- Water Tracking ---
    _getWaterData() {
        const data = localStorage.getItem(this.KEYS.WATER);
        return data ? JSON.parse(data) : {};
    },

    _saveWaterData(data) {
        localStorage.setItem(this.KEYS.WATER, JSON.stringify(data));
    },

    calculateDailyWaterNeed(profile) {
        if (!profile) return 2500;
        const mlPerKg = { sedentaer: 30, leicht: 33, moderat: 35, aktiv: 38, sehr_aktiv: 40 };
        const factor = mlPerKg[profile.aktivitaet] || 35;
        return Math.round((profile.gewicht * factor) / 50) * 50; // round to nearest 50ml
    },

    getWaterForDate(dateStr) {
        const data = this._getWaterData();
        return data[dateStr] || { intakes: [], total: 0 };
    },

    getTodaysWater() {
        const today = new Date().toISOString().split('T')[0];
        return this.getWaterForDate(today);
    },

    addWaterIntake(amountMl) {
        const today = new Date().toISOString().split('T')[0];
        const data = this._getWaterData();
        if (!data[today]) data[today] = { intakes: [], total: 0 };
        data[today].intakes.push({ amount: amountMl, timestamp: new Date().toISOString() });
        data[today].total += amountMl;
        this._saveWaterData(data);
    },

    removeLastWaterIntake() {
        const today = new Date().toISOString().split('T')[0];
        const data = this._getWaterData();
        if (data[today] && data[today].intakes.length > 0) {
            const removed = data[today].intakes.pop();
            data[today].total -= removed.amount;
            this._saveWaterData(data);
        }
    }
};
