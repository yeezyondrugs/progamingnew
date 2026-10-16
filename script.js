document.addEventListener('DOMContentLoaded', () => {
    if (location.protocol === 'file:') {
        document.querySelectorAll('a[href]').forEach((link) => {
            const href = link.getAttribute('href');
            if (href === './' || href.startsWith('./#')) {
                link.setAttribute('href', 'index.html' + href.slice(2));
            } else if (href === 'cum-ajungi' || href.startsWith('cum-ajungi#')) {
                link.setAttribute('href', href.replace('cum-ajungi', 'cum-ajungi.html'));
            }
        });
    } else if (location.pathname.endsWith('.html')) {
        const cleanPath = location.pathname.replace(/(index)?\.html$/, '');
        history.replaceState(null, '', cleanPath + location.search + location.hash);
    }

    const motionOff = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clamp01 = (value) => Math.min(Math.max(value, 0), 1);

    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    if (mobileToggle && navLinks) {
        const icon = mobileToggle.querySelector('i');
        const setMenu = (open) => {
            navLinks.classList.toggle('open', open);
            icon.classList.toggle('fa-bars', !open);
            icon.classList.toggle('fa-times', open);
        };
        mobileToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
        navLinks.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => setMenu(false));
        });
    }

    const navbar = document.getElementById('navbar');
    const updateNavbar = () => navbar.classList.toggle('scrolled', window.scrollY > 40);

    const offers = document.querySelector('.offers');
    const offersTrack = document.getElementById('offersTrack');
    const offersBar = document.getElementById('offersBar');
    const offersSticky = offers ? offers.querySelector('.offers-sticky') : null;
    const offerCards = offers ? [...offers.querySelectorAll('.offer')] : [];
    const offerTabs = offers ? [...offers.querySelectorAll('.offers-tab')] : [];
    const offersPrev = document.getElementById('offersPrev');
    const offersNext = document.getElementById('offersNext');
    let offerStops = [];
    let offersDist = 0;
    let offersPinned = false;
    let offerActive = 0;
    let offerShift = 0;
    let offerDirection = 0;
    let offerSnapTimer;
    let offerDragId = null;

    const offersTop = () => offers.getBoundingClientRect().top + window.scrollY;
    const setOfferShift = (shift) => {
        if (shift !== offerShift) offerDirection = Math.sign(shift - offerShift);
        offerShift = shift;
        offerActive = offerStops.reduce(
            (best, stop, index) =>
                Math.abs(stop - shift) < Math.abs(offerStops[best] - shift) ? index : best,
            0,
        );
        offerCards.forEach((card, index) => card.classList.toggle('active', index === offerActive));
        offerTabs.forEach((tab, index) => tab.classList.toggle('active', index === offerActive));
        offersPrev.disabled = offerActive === 0;
        offersNext.disabled = offerActive === offerCards.length - 1;
        offersBar.style.width = `${offersDist ? (shift / offersDist) * 100 : 0}%`;
    };
    const scrollOffersTo = (shift) => {
        if (offersPinned) window.scrollTo({ top: offersTop() + shift, behavior: 'smooth' });
        else offersTrack.scrollTo({ left: shift, behavior: 'smooth' });
    };
    const goToOffer = (index) => {
        scrollOffersTo(offerStops[Math.min(Math.max(index, 0), offerCards.length - 1)]);
    };
    const snapOffers = () => {
        clearTimeout(offerSnapTimer);
        if (!offersPinned || offerDragId !== null) return;
        offerSnapTimer = setTimeout(() => {
            if (offerShift <= 2 || offerShift >= offersDist - 2) return;
            let target = offerStops[offerActive];
            if (offerDirection > 0) target = offerStops.find((stop) => stop >= offerShift - 24);
            if (offerDirection < 0) {
                target = [...offerStops].reverse().find((stop) => stop <= offerShift + 24);
            }
            if (target !== undefined && Math.abs(target - offerShift) > 3) scrollOffersTo(target);
        }, 170);
    };
    const layoutOffers = () => {
        if (!offers) return;
        const center = offersSticky.clientWidth / 2;
        const measureStops = () => {
            offerStops = offerCards.map((card) =>
                Math.max(Math.round(card.offsetLeft + card.offsetWidth / 2 - center), 0),
            );
            offersDist = offerStops[offerStops.length - 1];
        };
        const touchScreen = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700;
        offers.classList.toggle('offers-stack', touchScreen);
        if (motionOff || touchScreen) {
            offersPinned = false;
            offers.classList.add('no-pin');
            offers.style.height = '';
            offersTrack.style.transform = '';
            measureStops();
            setOfferShift(offersTrack.scrollLeft);
            return;
        }

        offers.classList.remove('no-pin');
        offers.style.height = '';
        offersTrack.style.transform = '';
        measureStops();
        offersSticky.style.height = 'auto';
        const neededHeight = offersSticky.offsetHeight;
        offersSticky.style.height = '';

        offersPinned = offersDist > 0 && neededHeight <= offersSticky.offsetHeight;
        offers.classList.toggle('no-pin', !offersPinned);
        if (offersPinned) offers.style.height = `${offersSticky.offsetHeight + offersDist}px`;
        setOfferShift(offersPinned ? 0 : offersTrack.scrollLeft);
    };
    const updateOffers = () => {
        if (!offers || !offersPinned) return;
        const shift = clamp01(-offers.getBoundingClientRect().top / offersDist) * offersDist;
        offersTrack.style.transform = `translate3d(${-shift}px, 0, 0)`;
        const moved = shift !== offerShift;
        setOfferShift(shift);
        if (moved) snapOffers();
    };
    if (offers) {
        offersTrack.addEventListener('scroll', () => {
            if (!offersPinned) setOfferShift(offersTrack.scrollLeft);
        });
        offerTabs.forEach((tab, index) => tab.addEventListener('click', () => goToOffer(index)));
        offersPrev.addEventListener('click', () => goToOffer(offerActive - 1));
        offersNext.addEventListener('click', () => goToOffer(offerActive + 1));
        window.addEventListener('keydown', (event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
            const rect = offersSticky.getBoundingClientRect();
            if (rect.top > window.innerHeight * 0.5 || rect.bottom < window.innerHeight * 0.5) return;
            event.preventDefault();
            goToOffer(offerActive + (event.key === 'ArrowRight' ? 1 : -1));
        });

        let dragX = 0;
        let dragMoved = 0;
        offersTrack.addEventListener('pointerdown', (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            offerDragId = event.pointerId;
            dragX = event.clientX;
            dragMoved = 0;
            clearTimeout(offerSnapTimer);
        });
        window.addEventListener('pointermove', (event) => {
            if (event.pointerId !== offerDragId) return;
            const dx = event.clientX - dragX;
            dragX = event.clientX;
            dragMoved += Math.abs(dx);
            if (dragMoved < 6) return;
            offers.classList.add('dragging');
            if (offersPinned) window.scrollBy({ top: -dx, behavior: 'instant' });
            else if (event.pointerType === 'mouse') offersTrack.scrollLeft -= dx;
        });
        const endDrag = (event) => {
            if (event.pointerId !== offerDragId) return;
            offerDragId = null;
            offers.classList.remove('dragging');
            if (dragMoved >= 6) snapOffers();
        };
        window.addEventListener('pointerup', endDrag);
        window.addEventListener('pointercancel', endDrag);
        offersTrack.addEventListener('dragstart', (event) => event.preventDefault());
        offerCards.forEach((card, index) => {
            card.addEventListener('click', () => {
                if (dragMoved < 6 && index !== offerActive) goToOffer(index);
            });
        });
    }

    let scrollTicking = false;
    const onScroll = () => {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(() => {
            scrollTicking = false;
            updateNavbar();
            updateOffers();
        });
    };
    let layoutWidth = 0;
    const onResize = () => {
        if (window.innerWidth === layoutWidth && offers && offers.classList.contains('no-pin')) return;
        layoutWidth = window.innerWidth;
        layoutOffers();
        updateOffers();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('load', onResize);
    updateNavbar();
    onResize();

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
        const FORM_TYPES = { vip: 'vip-pc', vipplus: 'vip-pc-plus', ps5: 'ps5' };
        const state = { type: 'vip', day: 'week', dur: '1h' };

        const valueEl = document.getElementById('calcValue');
        const priceEl = document.getElementById('calcPrice');
        const summaryEl = document.getElementById('calcSummary');
        let shown = Number(valueEl.textContent);
        let raf;

        const animateValue = (to) => {
            cancelAnimationFrame(raf);
            if (motionOff) {
                shown = to;
                valueEl.textContent = to;
                return;
            }
            const from = shown;
            const start = performance.now();
            const tick = (now) => {
                const t = Math.min((now - start) / 350, 1);
                shown = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3)));
                valueEl.textContent = shown;
                if (t < 1) raf = requestAnimationFrame(tick);
            };
            raf = requestAnimationFrame(tick);
        };

        calc.addEventListener('click', (event) => {
            const button = event.target.closest('.calc-opt');
            if (!button) return;
            state[button.dataset.group] = button.dataset.value;
            calc.querySelectorAll(`.calc-opt[data-group="${button.dataset.group}"]`).forEach((other) => {
                other.setAttribute('aria-pressed', other === button ? 'true' : 'false');
            });
            animateValue(PRICES[state.type][state.day][state.dur]);
            summaryEl.textContent = `${DURS[state.dur]} · ${NAMES[state.type]} · ${DAYS[state.day]}`;
            priceEl.classList.remove('pop');
            void priceEl.offsetWidth;
            priceEl.classList.add('pop');
        });

        document.getElementById('calcReserve').addEventListener('click', () => {
            document.getElementById('type').value = FORM_TYPES[state.type];
            document.getElementById('duration').value = state.dur;
        });
    }

    const revealTargets = document.querySelectorAll(
        '.statement-text, .statement-stats li, .section-header, .calc, .service-card, .contact-info, .contact-form, .stop-card, .hero-content',
    );
    if (!motionOff && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('in');
                    revealObserver.unobserve(entry.target);
                });
            },
            { threshold: 0.15 },
        );
        revealTargets.forEach((target, index) => {
            target.classList.add('reveal');
            target.style.transitionDelay = `${(index % 3) * 90}ms`;
            revealObserver.observe(target);
        });
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

    const showToast = (toast, duration) => {
        if (!toast) return;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), duration);
    };

    const copyToast = document.getElementById('copyToast');
    document.querySelectorAll('[data-copy]').forEach((button) => {
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(button.dataset.copy);
            } catch {
                return;
            }
            showToast(copyToast, 2500);
        });
    });

    const form = document.getElementById('reservationForm');
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            showToast(document.getElementById('toast'), 4000);
            form.reset();
        });
    }

    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];
});
