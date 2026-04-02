// NutriSnap - Nutrient Reference Data, RDA, and Food Suggestions
const Nutrients = {
    // Recommended Daily Allowances by gender
    getRDA(profile) {
        const male = profile?.geschlecht === 'maennlich';
        return {
            eisen:      { label: 'Eisen',      unit: 'mg',  target: male ? 8 : 18 },
            vitamin_a:  { label: 'Vitamin A',   unit: 'mcg', target: male ? 900 : 700 },
            vitamin_b12:{ label: 'Vitamin B12', unit: 'mcg', target: 2.4 },
            vitamin_c:  { label: 'Vitamin C',   unit: 'mg',  target: male ? 90 : 75 },
            vitamin_d:  { label: 'Vitamin D',   unit: 'mcg', target: 15 },
            vitamin_e:  { label: 'Vitamin E',   unit: 'mg',  target: 15 },
            kalzium:    { label: 'Kalzium',     unit: 'mg',  target: 1000 },
            magnesium:  { label: 'Magnesium',   unit: 'mg',  target: male ? 400 : 310 },
            zink:       { label: 'Zink',        unit: 'mg',  target: male ? 11 : 8 },
            kalium:     { label: 'Kalium',      unit: 'mg',  target: male ? 3400 : 2600 },
        };
    },

    // Food suggestions for each nutrient (German)
    foodSuggestions: {
        eisen: ['Spinat', 'Rotes Fleisch', 'Linsen', 'Kichererbsen', 'Kürbiskerne', 'Quinoa', 'Tofu'],
        vitamin_a: ['Süßkartoffeln', 'Karotten', 'Spinat', 'Grünkohl', 'Leber', 'Eier', 'Mango'],
        vitamin_b12: ['Lachs', 'Thunfisch', 'Eier', 'Milch', 'Käse', 'Joghurt', 'Rindfleisch'],
        vitamin_c: ['Paprika', 'Orangen', 'Brokkoli', 'Kiwi', 'Erdbeeren', 'Zitronen', 'Tomaten'],
        vitamin_d: ['Lachs', 'Makrele', 'Eigelb', 'Pilze', 'Thunfisch', 'Angereicherte Milch'],
        vitamin_e: ['Mandeln', 'Sonnenblumenkerne', 'Avocado', 'Olivenöl', 'Haselnüsse', 'Spinat'],
        kalzium: ['Milch', 'Käse', 'Joghurt', 'Brokkoli', 'Grünkohl', 'Mandeln', 'Sesam'],
        magnesium: ['Nüsse', 'Dunkle Schokolade', 'Avocado', 'Bananen', 'Vollkornbrot', 'Spinat'],
        zink: ['Rindfleisch', 'Austern', 'Kürbiskerne', 'Cashews', 'Hähnchen', 'Kichererbsen'],
        kalium: ['Bananen', 'Kartoffeln', 'Spinat', 'Avocado', 'Süßkartoffeln', 'Bohnen', 'Lachs'],
    },

    // Get deficiencies: nutrients below threshold
    getDeficiencies(totals, profile, thresholdPct = 60) {
        const rda = this.getRDA(profile);
        const deficiencies = [];

        for (const [key, info] of Object.entries(rda)) {
            const current = totals[key] || 0;
            const pct = (current / info.target) * 100;
            if (pct < thresholdPct) {
                deficiencies.push({
                    key,
                    label: info.label,
                    unit: info.unit,
                    current,
                    target: info.target,
                    percentage: Math.round(pct),
                    missing: parseFloat((info.target - current).toFixed(1)),
                    foods: this.foodSuggestions[key] || [],
                });
            }
        }

        return deficiencies.sort((a, b) => a.percentage - b.percentage);
    },

    // Color for percentage: green > 80%, yellow 50-80%, red < 50%
    getColor(pct) {
        if (pct >= 80) return '#5CB88A';
        if (pct >= 50) return '#F2C94C';
        return '#F28B73';
    },

    getColorClass(pct) {
        if (pct >= 80) return 'text-mint';
        if (pct >= 50) return 'text-sunshine';
        return 'text-coral';
    },

    getBgClass(pct) {
        if (pct >= 80) return 'bg-mint-light';
        if (pct >= 50) return 'bg-yellow-50';
        return 'bg-coral-light';
    }
};
