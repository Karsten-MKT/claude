// Capture / Photo Analysis Page
const CapturePage = {
    state: {
        imageData: null,
        analyzing: false,
        result: null,
        error: null,
    },

    render() {
        if (this.state.analyzing) {
            return this.renderAnalyzing();
        }
        if (this.state.result) {
            return this.renderResult();
        }
        return this.renderCapture();
    },

    renderCapture() {
        return `
            <div class="px-5 py-4 space-y-4">
                <div class="card">
                    <h2 class="text-lg font-semibold mb-1">Mahlzeit fotografieren</h2>
                    <p class="text-sm text-charcoal-light mb-4">Mach ein Foto von deinem Essen und die KI analysiert die Nährwerte.</p>

                    <!-- Camera / Upload Area -->
                    <div class="capture-area p-8 text-center" onclick="document.getElementById('photo-input').click()">
                        ${this.state.imageData ? `
                            <img src="${this.state.imageData}" alt="Vorschau" class="max-h-64 mx-auto rounded-xl mb-4 object-cover"/>
                        ` : `
                            <svg class="w-16 h-16 mx-auto text-sand mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            <p class="text-sm font-medium text-charcoal-light">Tippe hier, um ein Foto aufzunehmen</p>
                            <p class="text-xs text-sand mt-1">oder ein Bild aus der Galerie zu wählen</p>
                        `}
                    </div>

                    <input type="file" id="photo-input" accept="image/*" capture="environment"
                        class="hidden" onchange="CapturePage.handleImageSelect(event)">

                    ${this.state.imageData ? `
                        <div class="flex gap-3 mt-4">
                            <button onclick="CapturePage.reset()" class="btn-secondary flex-1">Neues Foto</button>
                            <button onclick="CapturePage.analyze()" class="btn-primary flex-1">Analysieren</button>
                        </div>
                    ` : ''}

                    ${this.state.error ? `
                        <div class="mt-4 p-3 bg-red-50 rounded-xl text-red-600 text-sm">
                            ${this.state.error}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    renderAnalyzing() {
        return `
            <div class="px-5 py-4">
                <div class="card text-center py-12">
                    <div class="spinner mx-auto mb-4"></div>
                    <h3 class="text-lg font-semibold mb-1">Wird analysiert...</h3>
                    <p class="text-sm text-charcoal-light">Die KI erkennt deine Mahlzeit</p>
                    ${this.state.imageData ? `
                        <img src="${this.state.imageData}" alt="Analyse" class="max-h-32 mx-auto rounded-xl mt-4 opacity-60 object-cover"/>
                    ` : ''}
                </div>
            </div>
        `;
    },

    renderResult() {
        const r = this.state.result;
        return `
            <div class="px-5 py-4 space-y-4">
                <div class="card">
                    ${this.state.imageData ? `
                        <img src="${this.state.imageData}" alt="${r.gericht}" class="w-full h-48 object-cover rounded-xl mb-4"/>
                    ` : ''}
                    <h2 class="text-xl font-bold mb-1">${r.gericht}</h2>
                    <p class="text-sm text-charcoal-light mb-4">Portion: ${r.portionsgroesse}</p>

                    <!-- Kalorien -->
                    <div class="text-center p-4 bg-sage/10 rounded-xl mb-4">
                        <p class="text-3xl font-bold text-sage">${r.kalorien}</p>
                        <p class="text-sm text-sage-dark">Kalorien (kcal)</p>
                    </div>

                    <!-- Nährwerte Grid -->
                    <div class="grid grid-cols-2 gap-3 mb-4">
                        ${this.renderNutrientBox('Protein', r.protein, 'g', '#8B9E7E')}
                        ${this.renderNutrientBox('Fett', r.fett, 'g', '#B8956A')}
                        ${this.renderNutrientBox('Kohlenhydrate', r.kohlenhydrate, 'g', '#7BA3C4')}
                        ${this.renderNutrientBox('Ballaststoffe', r.ballaststoffe, 'g', '#9B8EC4')}
                    </div>

                    <div class="flex gap-3">
                        <button onclick="CapturePage.discard()" class="btn-secondary flex-1">Verwerfen</button>
                        <button onclick="CapturePage.save()" class="btn-primary flex-1">Speichern</button>
                    </div>
                </div>
            </div>
        `;
    },

    renderNutrientBox(label, value, unit, color) {
        return `
            <div class="p-3 rounded-xl bg-cream text-center">
                <p class="text-lg font-bold" style="color: ${color}">${value}${unit}</p>
                <p class="text-[11px] text-charcoal-light">${label}</p>
            </div>
        `;
    },

    compressImage(dataUrl, maxSizeBytes = 4 * 1024 * 1024) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // Scale down large images
                const maxDim = 1600;
                if (width > maxDim || height > maxDim) {
                    const ratio = Math.min(maxDim / width, maxDim / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);

                // Try decreasing quality until under limit
                let quality = 0.8;
                let result = canvas.toDataURL('image/jpeg', quality);
                while (result.length * 0.75 > maxSizeBytes && quality > 0.2) {
                    quality -= 0.1;
                    result = canvas.toDataURL('image/jpeg', quality);
                }
                resolve(result);
            };
            img.src = dataUrl;
        });
    },

    handleImageSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            this.state.imageData = await this.compressImage(e.target.result);
            this.state.error = null;
            this.state.result = null;
            router.refresh();
        };
        reader.readAsDataURL(file);
    },

    async analyze() {
        if (!this.state.imageData) return;

        this.state.analyzing = true;
        this.state.error = null;
        router.refresh();

        try {
            this.state.result = await API.analyzeFood(this.state.imageData);
        } catch (err) {
            this.state.error = `Fehler bei der Analyse: ${err.message}`;
            this.state.result = null;
        }

        this.state.analyzing = false;
        router.refresh();
    },

    save() {
        if (!this.state.result) return;
        Store.addMeal({ ...this.state.result });
        this.reset();
        router.navigate('dashboard');
    },

    discard() {
        this.state.result = null;
        router.refresh();
    },

    reset() {
        this.state.imageData = null;
        this.state.analyzing = false;
        this.state.result = null;
        this.state.error = null;
        const input = document.getElementById('photo-input');
        if (input) input.value = '';
        router.refresh();
    }
};
