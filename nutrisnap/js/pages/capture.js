// Capture / Photo Analysis Page
const CapturePage = {
    state: {
        imageData: null,
        foodDescription: '',
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
                            <svg class="w-16 h-16 mx-auto text-mint/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <!-- Food description -->
                        <textarea id="food-description" class="input-field mt-4" rows="2"
                            placeholder="Optional: Beschreibe das Essen (z.B. 'Pasta mit Tomatensauce und Parmesan')"
                            oninput="CapturePage.state.foodDescription = this.value"
                        >${this.state.foodDescription}</textarea>

                        <div class="flex gap-3 mt-3">
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
                    <div class="text-center p-4 bg-mint-light rounded-xl mb-4">
                        <p class="text-3xl font-bold text-mint">${r.kalorien}</p>
                        <p class="text-sm text-mint-dark">Kalorien (kcal)</p>
                    </div>

                    <!-- Makronährstoffe -->
                    <h3 class="text-xs font-semibold text-charcoal-light uppercase tracking-wide mb-2">Makronährstoffe</h3>
                    <div class="grid grid-cols-2 gap-3 mb-4">
                        ${this.renderNutrientBox('Protein', r.protein, 'g', '#5CB88A')}
                        ${this.renderNutrientBox('Fett', r.fett, 'g', '#F28B73')}
                        ${this.renderNutrientBox('Kohlenhydrate', r.kohlenhydrate, 'g', '#7BBBDD')}
                        ${this.renderNutrientBox('Ballaststoffe', r.ballaststoffe, 'g', '#A78BDB')}
                    </div>

                    <!-- Mikronährstoffe (collapsible) -->
                    <button onclick="document.getElementById('micro-details').classList.toggle('hidden')"
                        class="flex items-center gap-2 text-xs font-semibold text-charcoal-light uppercase tracking-wide mb-2 w-full">
                        <span>Vitamine & Mineralstoffe</span>
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    <div id="micro-details" class="grid grid-cols-3 gap-2 mb-4">
                        ${this.renderMicroBox('Eisen', r.eisen, 'mg')}
                        ${this.renderMicroBox('Vit. A', r.vitamin_a, 'mcg')}
                        ${this.renderMicroBox('Vit. B12', r.vitamin_b12, 'mcg')}
                        ${this.renderMicroBox('Vit. C', r.vitamin_c, 'mg')}
                        ${this.renderMicroBox('Vit. D', r.vitamin_d, 'mcg')}
                        ${this.renderMicroBox('Vit. E', r.vitamin_e, 'mg')}
                        ${this.renderMicroBox('Kalzium', r.kalzium, 'mg')}
                        ${this.renderMicroBox('Magnesium', r.magnesium, 'mg')}
                        ${this.renderMicroBox('Zink', r.zink, 'mg')}
                        ${this.renderMicroBox('Kalium', r.kalium, 'mg')}
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
            <div class="p-3 rounded-xl bg-cream text-center nutrient-box">
                <p class="text-lg font-bold" style="color: ${color}">${value}${unit}</p>
                <p class="text-[11px] text-charcoal-light">${label}</p>
            </div>
        `;
    },

    renderMicroBox(label, value, unit) {
        return `
            <div class="p-2 rounded-lg bg-cream/70 text-center">
                <p class="text-sm font-semibold text-charcoal">${value}<span class="text-[10px] text-charcoal-light ml-0.5">${unit}</span></p>
                <p class="text-[10px] text-charcoal-light">${label}</p>
            </div>
        `;
    },

    compressImage(dataUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                const maxDim = 1024;
                if (width > maxDim || height > maxDim) {
                    const ratio = Math.min(maxDim / width, maxDim / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
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
        this.state.foodDescription = document.getElementById('food-description')?.value || '';
        this.state.analyzing = true;
        this.state.error = null;
        router.refresh();

        try {
            this.state.result = await API.analyzeFood(this.state.imageData, this.state.foodDescription);
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
        this.state.foodDescription = '';
        this.state.analyzing = false;
        this.state.result = null;
        this.state.error = null;
        const input = document.getElementById('photo-input');
        if (input) input.value = '';
        router.refresh();
    }
};
