// Simple SPA Router
const router = {
    currentPage: 'dashboard',

    pages: {
        dashboard: { page: () => DashboardPage, title: 'Dashboard', subtitle: 'Dein Tagesüberblick' },
        capture: { page: () => CapturePage, title: 'Foto-Analyse', subtitle: 'Mahlzeit erfassen' },
        diary: { page: () => DiaryPage, title: 'Tagebuch', subtitle: 'Deine Mahlzeiten' },
        profile: { page: () => ProfilePage, title: 'Profil', subtitle: 'Deine Einstellungen' },
    },

    navigate(page) {
        if (!this.pages[page]) return;
        this.currentPage = page;
        this.render();
    },

    refresh() {
        this.render();
    },

    render() {
        const config = this.pages[this.currentPage];
        const pageObj = config.page();

        // Update header
        document.getElementById('header-subtitle').textContent = config.subtitle;

        // Update content
        const main = document.getElementById('main-content');
        main.innerHTML = pageObj.render();
        main.style.animation = 'none';
        main.offsetHeight; // trigger reflow
        main.style.animation = 'fadeIn 0.2s ease-out';

        // Update nav
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === this.currentPage);
        });

        // Scroll to top
        main.scrollTop = 0;
    },

    init() {
        // Check if profile exists, redirect if not
        const profile = Store.getProfile();
        if (!profile) {
            this.currentPage = 'dashboard'; // Will show welcome screen
        }
        this.render();
    }
};
