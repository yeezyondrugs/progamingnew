document.addEventListener('DOMContentLoaded', () => {
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');

    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
            const icon = mobileToggle.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });

        navLinks.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
                const icon = mobileToggle.querySelector('i');
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
            });
        });
    }

    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    const tabs = document.querySelectorAll('.price-tab');
    const contents = document.querySelectorAll('.price-content');

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            tabs.forEach((t) => t.classList.remove('active'));
            contents.forEach((c) => c.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.tab);
            if (target) target.classList.add('active');
        });
    });

    const calc = document.getElementById('calc');
    if (calc) {
        const PRICES = {
            vip: {
                week: { '1h': 25, '3h': 60, '6h': 100, night: 100 },
                weekend: { '1h': 30, '3h': 75, '6h': 120, night: 120 },
            },
            vipplus: {
                week: { '1h': 35, '3h': 90, '6h': 140, night: 140 },
                weekend: { '1h': 40, '3h': 105, '6h': 160, night: 160 },
            },
            ps5: {
                week: { '1h': 50, '3h': 120, '6h': 200, night: 200 },
                weekend: { '1h': 60, '3h': 150, '6h': 200, night: 200 },
            },
        };
        const NAMES = { vip: 'VIP PC', vipplus: 'VIP PC+', ps5: 'PS5' };
        const DAYS = { week: 'Luni–Joi', weekend: 'Vineri–Duminică' };
        const DURS = { '1h': '1 oră', '3h': '3 ore', '6h': '6 ore', night: 'Noapte 23:00–06:00' };
        const state = { type: 'vip', day: 'week', dur: '1h' };

        const valueEl = document.getElementById('calcValue');
        const priceEl = document.getElementById('calcPrice');
        const summaryEl = document.getElementById('calcSummary');

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let shown = Number(valueEl.textContent);
        let raf;

        const animateValue = (to) => {
            cancelAnimationFrame(raf);
            if (reduceMotion) {
                shown = to;
                valueEl.textContent = to;
                return;
            }
            const from = shown;
            const start = performance.now();
            const duration = 350;
            const tick = (now) => {
                const t = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - t, 3);
                shown = Math.round(from + (to - from) * eased);
                valueEl.textContent = shown;
                if (t < 1) raf = requestAnimationFrame(tick);
            };
            raf = requestAnimationFrame(tick);
        };

        const renderCalc = () => {
            animateValue(PRICES[state.type][state.day][state.dur]);
            summaryEl.textContent = `${DURS[state.dur]} · ${NAMES[state.type]} · ${DAYS[state.day]}`;
            priceEl.classList.remove('pop');
            void priceEl.offsetWidth;
            priceEl.classList.add('pop');
        };

        calc.addEventListener('click', (e) => {
            const btn = e.target.closest('.calc-opt');
            if (!btn) return;
            state[btn.dataset.group] = btn.dataset.value;
            calc.querySelectorAll(`.calc-opt[data-group="${btn.dataset.group}"]`).forEach((b) => {
                b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
            });
            renderCalc();
        });

        const FORM_TYPES = { vip: 'vip-pc', vipplus: 'vip-pc-plus', ps5: 'ps5' };
        const reserveBtn = calc.querySelector('.calc-result .btn');
        if (reserveBtn) {
            reserveBtn.addEventListener('click', () => {
                const typeSelect = document.getElementById('type');
                const durSelect = document.getElementById('duration');
                if (typeSelect) typeSelect.value = FORM_TYPES[state.type];
                if (durSelect) durSelect.value = state.dur;
            });
        }
    }

    const mapFab = document.getElementById('mapFab');
    const mapSection = document.getElementById('harta');
    if (mapFab && mapSection && 'IntersectionObserver' in window) {
        new IntersectionObserver(
            ([entry]) => {
                mapFab.classList.toggle('hidden', entry.isIntersecting);
            },
            { threshold: 0.3 },
        ).observe(mapSection);
    }

    const copyToast = document.getElementById('copyToast');
    document.querySelectorAll('[data-copy]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(btn.dataset.copy);
            } catch {
                return;
            }
            if (copyToast) {
                copyToast.classList.add('show');
                setTimeout(() => copyToast.classList.remove('show'), 2500);
            }
        });
    });

    const form = document.getElementById('reservationForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const toast = document.getElementById('toast');
            if (toast) {
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 4000);
            }
            form.reset();
        });
    }

    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.min = new Date().toISOString().split('T')[0];
    }
});
