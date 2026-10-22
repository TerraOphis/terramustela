import { reproducteurs, portees } from './furets-data.js';

const STATUTS = {
    repro: 'Reproducteur',
    dispo: 'Disponible',
    reserve: 'Réservé',
    avenir: 'À venir'
};

const escapeHtml = (str = '') => String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// =========================================================
// NAVBAR & FOOTER
// =========================================================
async function loadNavbar() {
    const navElement = document.getElementById('main-navbar');
    if (!navElement) return;

    try {
        const response = await fetch('components/navbar.html');
        navElement.innerHTML = await response.text();

        const currentPage = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
        navElement.querySelectorAll('.nav-links a').forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage || (currentPage === '/' && link.id === 'nav-accueil')) {
                link.classList.add('active');
            }
        });

        const hamburgerBtn = navElement.querySelector('#hamburger-btn');
        const navLinks = navElement.querySelector('#nav-links');
        const closeMenu = () => {
            navLinks.classList.remove('open');
            hamburgerBtn.classList.remove('active');
            hamburgerBtn.setAttribute('aria-expanded', 'false');
        };

        hamburgerBtn?.addEventListener('click', () => {
            const open = navLinks.classList.toggle('open');
            hamburgerBtn.classList.toggle('active', open);
            hamburgerBtn.setAttribute('aria-expanded', String(open));
        });
        navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

        const onScroll = () => navElement.classList.toggle('scrolled', window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    } catch (error) {
        console.error('Erreur lors du chargement de la navbar :', error);
    }
}

async function loadFooter() {
    const footerElement = document.getElementById('main-footer');
    if (!footerElement) return;

    try {
        const response = await fetch('components/footer.html');
        footerElement.innerHTML = await response.text();
        footerElement.querySelectorAll('.js-year').forEach(el => { el.textContent = new Date().getFullYear(); });
        initContactForms(footerElement);

        // Arrivée directe sur /page#contact : le footer est injecté après le chargement
        if (window.location.hash === '#contact') {
            document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Erreur chargement footer :', error);
    }
}

// =========================================================
// FORMULAIRES (contact + pré-réservation)
// =========================================================
function initContactForms(root = document) {
    root.querySelectorAll('form.js-contact-form').forEach(form => {
        if (form.dataset.ready) return;
        form.dataset.ready = '1';

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const status = form.querySelector('.form-status');
            const btn = form.querySelector('button[type="submit"]');
            const data = Object.fromEntries(new FormData(form).entries());
            data.subject = form.dataset.subject || 'Contact site';

            btn.disabled = true;
            status.className = 'form-status';
            status.textContent = 'Envoi en cours…';

            try {
                const res = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Erreur serveur');
                status.classList.add('ok');
                status.textContent = 'Merci ! Votre message est bien parti, on vous répond très vite 🐾';
                form.reset();
            } catch (err) {
                console.error('Erreur envoi formulaire :', err);
                status.classList.add('err');
                status.textContent = "Oups, l'envoi a échoué. Réessayez ou écrivez-nous directement par e-mail.";
            } finally {
                btn.disabled = false;
            }
        });
    });
}

// =========================================================
// FURETS
// =========================================================
function photoHtml(photo, alt) {
    return photo
        ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(alt)}" loading="lazy">`
        : `<img src="assets/img/emblem.png" alt="" class="is-placeholder" loading="lazy">`;
}

function ferretCard(f) {
    const [c1, c2] = f.couleurs || [];
    const style = c1 ? ` style="--c1:${c1};--c2:${c2 || c1}"` : '';
    const tags = (f.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join('');
    const naissance = f.naissance ? `<span>Né${f.sexe === 'f' ? 'e' : ''} en ${escapeHtml(f.naissance)}</span>` : '';

    return `
        <article class="ferret-card reveal" data-statut="${f.statut || 'repro'}">
            <div class="ferret-photo"${style}>
                ${photoHtml(f.photo, f.nom)}
                <span class="ferret-status ${f.statut || 'repro'}">${STATUTS[f.statut || 'repro']}</span>
                <span class="ferret-sex ${f.sexe}" title="${f.sexe === 'f' ? 'Femelle' : 'Mâle'}">${f.sexe === 'f' ? '♀' : '♂'}</span>
            </div>
            <div class="ferret-body">
                <h3>${escapeHtml(f.nom)}</h3>
                <div class="ferret-robe">${escapeHtml(f.robe)}</div>
                <p>${escapeHtml(f.description)}</p>
                <div class="ferret-tags">${naissance}${tags}</div>
            </div>
        </article>`;
}

function renderReproducteurs() {
    const grid = document.getElementById('reproGrid');
    if (!grid) return;
    const limit = parseInt(grid.dataset.limit) || reproducteurs.length;
    grid.innerHTML = reproducteurs.slice(0, limit).map(f => ferretCard({ ...f, statut: 'repro' })).join('');
}

function renderPortees() {
    const container = document.getElementById('litters');
    if (!container) return;

    if (portees.length === 0) {
        container.innerHTML = `<p style="text-align:center;color:var(--muted)">Aucune portée annoncée pour le moment. Revenez vite !</p>`;
        return;
    }

    container.innerHTML = portees.map(p => {
        const parents = p.parents.map(nom => reproducteurs.find(r => r.nom === nom) || { nom });
        const parentsHtml = parents.map((r, i) => `
            ${i > 0 ? '<span class="litter-heart"><svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.8 4.3 7.3C19.5 16.4 12 21 12 21Z"/></svg></span>' : ''}
            <div class="parent" title="${escapeHtml(r.nom)}">${photoHtml(r.photo, r.nom)}</div>`).join('');

        const petits = (p.petits || []).length
            ? `<div class="ferret-grid" style="margin-top:30px">${p.petits.map(ferretCard).join('')}</div>`
            : '';

        return `
            <article class="litter reveal">
                <div class="litter-parents">${parentsHtml}</div>
                <div>
                    <span class="ferret-status ${p.statut}" style="position:static;display:inline-block;margin-bottom:12px">${STATUTS[p.statut]}</span>
                    <h3>${escapeHtml(p.nom)}</h3>
                    <div class="litter-meta">
                        <span>Parents : <b>${parents.map(r => escapeHtml(r.nom)).join(' × ')}</b></span>
                        <span>Naissance : <b>${escapeHtml(p.naissance)}</b></span>
                        <span>Départ : <b>${escapeHtml(p.depart)}</b></span>
                    </div>
                    <p style="color:var(--choco-soft);margin:0 0 20px">${escapeHtml(p.description)}</p>
                    <a href="/adoption#reservation" class="btn btn-leaf">Rejoindre la liste d'attente
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </a>
                </div>
                ${petits ? `<div style="grid-column:1/-1">${petits}</div>` : ''}
            </article>`;
    }).join('');
}

function initFilters() {
    const filters = document.querySelectorAll('.filter-btn');
    filters.forEach(btn => btn.addEventListener('click', () => {
        filters.forEach(b => b.classList.toggle('active', b === btn));
        const sexe = btn.dataset.filter;
        document.querySelectorAll('#reproGrid .ferret-card').forEach(card => {
            const show = sexe === 'all' || card.querySelector(`.ferret-sex.${sexe}`);
            card.style.display = show ? '' : 'none';
        });
    }));
}

// =========================================================
// ANIMATIONS
// =========================================================
function initReveal() {
    const items = document.querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) {
        items.forEach(el => el.classList.add('in'));
        return;
    }
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(el => observer.observe(el));
}

function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const target = parseFloat(el.dataset.count);
            const suffix = el.dataset.suffix || '';
            const start = performance.now();
            const tick = (now) => {
                const p = Math.min((now - start) / 1400, 1);
                el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
                if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            observer.unobserve(el);
        });
    }, { threshold: 0.5 });
    counters.forEach(el => observer.observe(el));
}

// Une seule FAQ ouverte à la fois
function initFaq() {
    document.querySelectorAll('.faq').forEach(faq => {
        const items = faq.querySelectorAll('details');
        items.forEach(d => d.addEventListener('toggle', () => {
            if (d.open) items.forEach(o => { if (o !== d) o.open = false; });
        }));
    });
}

// =========================================================
// LANCEMENT
// =========================================================
loadNavbar();
loadFooter();
renderReproducteurs();
renderPortees();
initFilters();
initContactForms();
initFaq();
initCounters();
initReveal();
