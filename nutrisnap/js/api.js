// NutriSnap API - Claude Vision Integration via Cloudflare Worker Proxy
const API = {
    async analyzeFood(imageBase64) {
        const mediaType = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const response = await fetch(CONFIG.WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: CONFIG.ANTHROPIC_MODEL,
                max_tokens: 1024,
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
                            text: `Analysiere dieses Foto einer Mahlzeit. Schätze die Nährwerte so genau wie möglich.

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt in diesem Format (keine weiteren Erklärungen):
{
  "gericht": "Name des Gerichts",
  "portionsgroesse": "geschätzte Menge in Gramm",
  "kalorien": 0,
  "protein": 0,
  "fett": 0,
  "kohlenhydrate": 0,
  "ballaststoffe": 0,
  "zucker": 0
}

Alle Nährwerte in Gramm (außer Kalorien in kcal). Falls kein Essen erkennbar ist, setze "gericht" auf "Nicht erkannt" und alle Werte auf 0.`
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

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Konnte die Antwort nicht verarbeiten');
        }

        const result = JSON.parse(jsonMatch[0]);

        // Ensure all numeric fields are numbers
        return {
            gericht: result.gericht || 'Unbekannt',
            portionsgroesse: result.portionsgroesse || 'unbekannt',
            kalorien: Math.round(Number(result.kalorien) || 0),
            protein: Math.round(Number(result.protein) || 0),
            fett: Math.round(Number(result.fett) || 0),
            kohlenhydrate: Math.round(Number(result.kohlenhydrate) || 0),
            ballaststoffe: Math.round(Number(result.ballaststoffe) || 0),
            zucker: Math.round(Number(result.zucker) || 0),
        };
    }
};
