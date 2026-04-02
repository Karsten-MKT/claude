// NutriSnap - Water Reminder System (Browser Notifications)
const WaterReminder = {
    intervalId: null,
    CHECK_INTERVAL: 60 * 60 * 1000, // Check every 60 minutes

    init() {
        const profile = Store.getProfile();
        if (profile?.waterReminders && Notification.permission === 'granted') {
            this.start();
        }
    },

    async requestPermission() {
        if (!('Notification' in window)) {
            alert('Dein Browser unterstützt keine Benachrichtigungen.');
            return false;
        }
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    },

    start() {
        this.stop();
        // Check immediately, then every hour
        this.check();
        this.intervalId = setInterval(() => this.check(), this.CHECK_INTERVAL);
    },

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    },

    check() {
        const profile = Store.getProfile();
        if (!profile) return;

        const now = new Date();
        const hour = now.getHours();

        // Only check between 8am and 10pm
        if (hour < 8 || hour > 22) return;

        const dailyTarget = Store.calculateDailyWaterNeed(profile);
        const water = Store.getTodaysWater();

        // Expected progress: assume 8am-10pm = 14 hours awake
        const hoursAwake = Math.max(0, hour - 8);
        const expectedPct = (hoursAwake / 14) * 100;
        const actualPct = (water.total / dailyTarget) * 100;

        // Alert if more than 20% behind expected
        if (actualPct < expectedPct - 20) {
            const missing = Math.round((dailyTarget * expectedPct / 100) - water.total);
            this.sendNotification(
                `Du bist ${missing}ml hinter deinem Wasserziel. Trink ein Glas Wasser! 💧`
            );
        }
    },

    sendNotification(message) {
        if (Notification.permission !== 'granted') return;
        try {
            new Notification('NutriSnap - Trink-Erinnerung 💧', {
                body: message,
                tag: 'water-reminder',
                renotify: true,
            });
        } catch (e) {
            // Notification might fail on some mobile browsers
            console.log('Notification failed:', e);
        }
    }
};
