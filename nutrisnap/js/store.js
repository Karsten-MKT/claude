// NutriSnap Data Store (localStorage)
const Store = {
    KEYS: {
        PROFILE: 'nutrisnap_profile',
        MEALS: 'nutrisnap_meals',
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
        // dateStr format: 'YYYY-MM-DD'
        return this.getAllMeals().filter(m => m.timestamp.startsWith(dateStr));
    },

    getTodaysMeals() {
        const today = new Date().toISOString().split('T')[0];
        return this.getMealsForDate(today);
    },

    getTodaysTotals() {
        const meals = this.getTodaysMeals();
        return {
            kalorien: meals.reduce((sum, m) => sum + (m.kalorien || 0), 0),
            protein: meals.reduce((sum, m) => sum + (m.protein || 0), 0),
            fett: meals.reduce((sum, m) => sum + (m.fett || 0), 0),
            kohlenhydrate: meals.reduce((sum, m) => sum + (m.kohlenhydrate || 0), 0),
            ballaststoffe: meals.reduce((sum, m) => sum + (m.ballaststoffe || 0), 0),
            zucker: meals.reduce((sum, m) => sum + (m.zucker || 0), 0),
        };
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
            sedentaer: 1.2,
            leicht: 1.375,
            moderat: 1.55,
            aktiv: 1.725,
            sehr_aktiv: 1.9
        };

        return Math.round(bmr * (factors[aktivitaet] || 1.4));
    },

    // Calculate macro targets based on daily calories
    getMacroTargets(dailyCalories) {
        return {
            protein: Math.round(dailyCalories * 0.25 / 4),    // 25% from protein, 4 cal/g
            fett: Math.round(dailyCalories * 0.30 / 9),        // 30% from fat, 9 cal/g
            kohlenhydrate: Math.round(dailyCalories * 0.45 / 4) // 45% from carbs, 4 cal/g
        };
    },

    // Get unique dates that have meals
    getMealDates() {
        const meals = this.getAllMeals();
        const dates = [...new Set(meals.map(m => m.timestamp.split('T')[0]))];
        return dates.sort().reverse();
    }
};
