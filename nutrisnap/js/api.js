// NutriSnap API - Claude Vision Integration via Cloudflare Worker Proxy
const API = {
    async analyzeFood(imageBase64, foodDescription = '') {
        const mediaType = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const descriptionHint = foodDescription.trim()
            ? `\n\nDer Benutzer beschreibt das Essen als: "${foodDescription}". Nutze diese Information zusätzlich zum Bild für eine genauere Schätzung.`
            : '';

        const response = await fetch(CONFIG.WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: CONFIG.ANTHROPIC_MODEL,
                max_tokens: 1500,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mediaType,
                                data: base64Data,
                            }
                        },
                        {
                            type: 'text',
                            text: `Analysiere dieses Foto einer Mahlzeit. Schätze die Nährwerte so genau wie möglich.${descriptionHint}

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt in diesem Format (keine weiteren Erklärungen):
{
  "gericht": "Name des Gerichts",
  "portionsgroesse": "geschätzte Menge in Gramm",
  "kalorien": 0,
  "protein": 0,
  "fett": 0,
  "kohlenhydrate": 0,
  "ballaststoffe": 0,
  "zucker": 0,
  "eisen": 0,
  "vitamin_a": 0,
  "vitamin_b12": 0,
  "vitamin_c": 0,
  "vitamin_d": 0,
  "vitamin_e": 0,
  "kalzium": 0,
  "magnesium": 0,
  "zink": 0,
  "kalium": 0
}

Einheiten: Kalorien in kcal, Makronährstoffe in g, Eisen/Vitamin C/Vitamin E/Magnesium/Zink in mg, Vitamin A/B12/D in mcg, Kalzium/Kalium in mg. Falls kein Essen erkennbar ist, setze "gericht" auf "Nicht erkannt" und alle Werte auf 0.`
                        }
                    ]
                }]
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API-Fehler: ${response.status}`);
        }

        const data = await response.json();
        const text = data.content[0].text;

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Konnte die Antwort nicht verarbeiten');
        }

        const result = JSON.parse(jsonMatch[0]);

        return {
            gericht: result.gericht || 'Unbekannt',
            portionsgroesse: result.portionsgroesse || 'unbekannt',
            kalorien: Math.round(Number(result.kalorien) || 0),
            protein: Math.round(Number(result.protein) || 0),
            fett: Math.round(Number(result.fett) || 0),
            kohlenhydrate: Math.round(Number(result.kohlenhydrate) || 0),
            ballaststoffe: Math.round(Number(result.ballaststoffe) || 0),
            zucker: Math.round(Number(result.zucker) || 0),
            eisen: parseFloat((Number(result.eisen) || 0).toFixed(1)),
            vitamin_a: Math.round(Number(result.vitamin_a) || 0),
            vitamin_b12: parseFloat((Number(result.vitamin_b12) || 0).toFixed(1)),
            vitamin_c: Math.round(Number(result.vitamin_c) || 0),
            vitamin_d: parseFloat((Number(result.vitamin_d) || 0).toFixed(1)),
            vitamin_e: parseFloat((Number(result.vitamin_e) || 0).toFixed(1)),
            kalzium: Math.round(Number(result.kalzium) || 0),
            magnesium: Math.round(Number(result.magnesium) || 0),
            zink: parseFloat((Number(result.zink) || 0).toFixed(1)),
            kalium: Math.round(Number(result.kalium) || 0),
        };
    }
};
