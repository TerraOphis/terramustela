import { firebaseConfig, FIREBASE_SDK, CONTENT_DOC, ADMIN_EMAILS } from '../firebase-config.js';
import * as DEFAULTS from '../defaults.js';

const [{ initializeApp }, authSdk, firestoreSdk] = await Promise.all([
    import(`${FIREBASE_SDK}/firebase-app.js`),
    import(`${FIREBASE_SDK}/firebase-auth.js`),
    import(`${FIREBASE_SDK}/firebase-firestore.js`)
]);
const { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } = authSdk;
const { getFirestore, doc, getDoc, setDoc, serverTimestamp } = firestoreSdk;

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const contentRef = doc(db, CONTENT_DOC.collection, CONTENT_DOC.id);

const SITE_CACHE_KEY = 'tm_content_v1'; // même clé que app.js : le site se met à jour tout de suite dans ce navigateur

// =========================================================
// PAGES ÉDITABLES
// =========================================================
const PAGES = [
    { id: 'home', label: 'Accueil', files: ['/index.html'], url: '/' },
    { id: 'elevage', label: "L'élevage", files: ['/about.html'], url: '/about' },
    { id: 'furets', label: 'Nos furets', files: ['/nos-furets.html'], url: '/nos-furets', hint: 'Les fiches des furets et des portées se gèrent dans « Reproducteurs » et « Portées ».' },
    { id: 'adoption', label: 'Adopter', files: ['/adoption.html'], url: '/adoption', hint: 'Les questions de la FAQ se gèrent dans l\'onglet « FAQ ».' },
    { id: 'conseils', label: 'Conseils', files: ['/conseils.html'], url: '/conseils' },
    { id: 'layout', label: 'Menu & pied de page', files: ['/components/navbar.html', '/components/footer.html'], url: '/' },
    { id: 'mentions', label: 'Mentions légales', files: ['/mentions-legales.html'], url: '/mentions-legales' },
    { id: 'confidentialite', label: 'Confidentialité', files: ['/politique-confidentialite.html'], url: '/politique-confidentialite' }
];

const VIEWS = [
    { group: 'Pages du site' },
    ...PAGES.map(p => ({ id: `page-${p.id}`, label: p.label, page: p })),
    { group: "L'élevage" },
    { id: 'repro', label: 'Reproducteurs', url: '/nos-furets#reproducteurs', hint: 'Les parents de vos portées, affichés sur l\'accueil et la page « Nos furets ».' },
    { id: 'portees', label: 'Portées', url: '/nos-furets#portees', hint: 'Portées à venir ou nées, et les petits disponibles à la réservation.' },
    { group: 'Contenus' },
    { id: 'faq', label: 'FAQ', url: '/adoption#faq', hint: 'Questions fréquentes de la page « Adopter ».' },
    { id: 'settings', label: 'Réglages', url: '/', hint: 'Liens et sauvegarde du contenu.' }
];

const STATUTS = { avenir: 'À venir', dispo: 'Disponible', reserve: 'Réservé' };
const DEFAULT_PHOTO = '/assets/img/emblem.png';

// =========================================================
// ÉTAT
// =========================================================
const clone = (o) => JSON.parse(JSON.stringify(o));

function defaultState() {
    return {
        texts: {},
        images: {},
        hidden: {},
        reproducteurs: clone(DEFAULTS.reproducteurs),
        portees: clone(DEFAULTS.portees),
        faq: clone(DEFAULTS.faq),
        settings: clone(DEFAULTS.settings)
    };
}

let state = defaultState();
let saved = clone(state);
let meta = null;

const isDirty = () => JSON.stringify(state) !== JSON.stringify(saved);

function collectUrls(s) {
    const urls = new Set(Object.values(s.images || {}));
    (s.reproducteurs || []).forEach(r => r.photo && urls.add(r.photo));
    (s.portees || []).forEach(p => (p.petits || []).forEach(k => k.photo && urls.add(k.photo)));
    return urls;
}

// =========================================================
// OUTILS DOM
// =========================================================
const $ = (sel) => document.querySelector(sel);

function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'value' || k === 'checked') node[k] = v;
        else node.setAttribute(k, v === true ? '' : v);
    }
    children.flat(Infinity).forEach(c => { if (c != null && c !== false) node.append(c); });
    return node;
}

const ICONS = {
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>'
};

const iconBtn = (icon, title, onclick, extra = {}) =>
    el('button', { type: 'button', class: `icon-btn ${extra.class || ''}`, title, 'aria-label': title, html: ICONS[icon] || icon, onclick, disabled: extra.disabled });

let toastTimer;
function toast(message, isError = false) {
    const t = $('#toast');
    t.textContent = message;
    t.classList.toggle('error', isError);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), isError ? 6000 : 2800);
}

function changed() {
    const dirty = isDirty();
    $('#saveBtn').disabled = !dirty;
    const stateEl = $('#saveState');
    stateEl.textContent = dirty ? '● Modifications non enregistrées' : 'Tout est enregistré';
    stateEl.classList.toggle('dirty', dirty);
}

// =========================================================
// CHAMPS RÉUTILISABLES
// =========================================================
const cleanHtml = (html) => html
    .replace(/ style="[^"]*"/g, '')
    .replace(/(<br\s*\/?>|\s)+$/g, '')
    .trim();

/** Éditeur de texte enrichi (gras, italique, lien). onChange reçoit le HTML nettoyé. */
function richEditor(value, onChange, { title = false } = {}) {
    const rte = el('div', { class: `rte${title ? ' title' : ''}`, contenteditable: 'true', spellcheck: 'true', html: value });
    rte.addEventListener('input', () => onChange(cleanHtml(rte.innerHTML)));
    rte.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.execCommand('insertLineBreak');
        }
    });
    rte.addEventListener('paste', (e) => {
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    });
    const keepFocus = (fn) => (e) => { e.preventDefault(); rte.focus(); fn(); onChange(cleanHtml(rte.innerHTML)); };
    const tools = [
        el('button', { type: 'button', class: 'icon-btn', title: 'Gras', onmousedown: keepFocus(() => document.execCommand('bold')) }, 'G'),
        el('button', { type: 'button', class: 'icon-btn', title: 'Italique', style: 'font-style:italic', onmousedown: keepFocus(() => document.execCommand('italic')) }, 'I'),
        el('button', {
            type: 'button', class: 'icon-btn', title: 'Lien', html: ICONS.link, onmousedown: keepFocus(() => {
                const url = prompt('Adresse du lien (ex : /adoption ou https://…)');
                if (url) document.execCommand('createLink', false, url);
            })
        })
    ];
    return { rte, tools };
}

async function uploadImage(file, folder) {
    const token = await auth.currentUser.getIdToken();
    const body = new FormData();
    body.append('folder', folder);
    body.append('photo', file);
    const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    return data.url;
}

/** Champ photo : aperçu + envoi + retrait. onChange reçoit l'URL ('' = image par défaut). */
function imageField(value, onChange, { folder, def = DEFAULT_PHOTO, label = 'Photo' } = {}) {
    let current = value;
    const img = el('img', { alt: '' });
    const preview = el('div', { class: 'img-preview' }, img);
    const input = el('input', { type: 'file', accept: 'image/*', hidden: true });
    const removeBtn = el('button', { type: 'button', class: 'btn btn-danger btn-sm' }, 'Retirer la photo');
    const pickBtn = el('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => input.click() }, 'Choisir une photo');

    const refresh = () => {
        img.src = current || def;
        img.classList.toggle('default', !current);
        removeBtn.hidden = !current;
        pickBtn.textContent = current ? 'Changer la photo' : 'Choisir une photo';
    };

    input.addEventListener('change', async () => {
        const file = input.files[0];
        input.value = '';
        if (!file) return;
        preview.classList.add('loading');
        pickBtn.disabled = true;
        try {
            current = await uploadImage(file, folder);
            onChange(current);
            refresh();
        } catch (err) {
            console.error(err);
            toast(`Envoi de la photo impossible : ${err.message}`, true);
        } finally {
            preview.classList.remove('loading');
            pickBtn.disabled = false;
        }
    });
    removeBtn.addEventListener('click', () => { current = ''; onChange(''); refresh(); });
    refresh();

    return el('div', {},
        el('label', { class: 'lbl' }, label),
        el('div', { class: 'img-field' }, preview, el('div', { class: 'img-actions' }, pickBtn, removeBtn, el('p', { class: 'hint' }, 'JPG, PNG ou WebP. Redimensionnée automatiquement.')), input)
    );
}

function inputField(label, value, onInput, { type = 'text', placeholder = '', full = false, hint = '' } = {}) {
    const id = `f-${Math.random().toString(36).slice(2, 9)}`;
    const input = type === 'textarea'
        ? el('textarea', { id, class: 'textarea', placeholder, value: value ?? '', oninput: (e) => onInput(e.target.value) })
        : el('input', { id, type, class: 'input', placeholder, value: value ?? '', oninput: (e) => onInput(e.target.value) });
    return el('div', { class: full ? 'full' : '' }, el('label', { class: 'lbl', for: id }, label), input, hint && el('p', { class: 'hint' }, hint));
}

function selectField(label, value, options, onInput, { full = false } = {}) {
    const id = `f-${Math.random().toString(36).slice(2, 9)}`;
    const select = el('select', { id, class: 'input', onchange: (e) => onInput(e.target.value) },
        Object.entries(options).map(([v, l]) => el('option', { value: v }, l)));
    select.value = value;
    return el('div', { class: full ? 'full' : '' }, el('label', { class: 'lbl', for: id }, label), select);
}

function moveItem(list, i, delta) {
    const j = i + delta;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
}

// =========================================================
// ÉDITION DES PAGES
// =========================================================
const pageCache = new Map();

async function fetchPage(file) {
    if (!pageCache.has(file)) {
        const res = await fetch(file, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`${file} : ${res.status}`);
        pageCache.set(file, await res.text());
    }
    return pageCache.get(file);
}

function labelFor(node) {
    const tag = node.tagName;
    const cls = node.classList;
    const parent = node.parentElement?.classList || { contains: () => false };
    if (tag === 'TITLE') return "Titre de l'onglet (Google)";
    if (tag === 'META') return 'Description (Google)';
    if (parent.contains('btn')) return 'Bouton';
    if (parent.contains('trust-chip')) return 'Pastille';
    if (parent.contains('sticker')) return 'Pastille ronde';
    if (parent.contains('hero-badge')) return 'Badge flottant';
    if (parent.contains('marquee-track')) return 'Texte défilant';
    if (parent.contains('stat')) return tag === 'STRONG' ? 'Chiffre (animé)' : 'Légende du chiffre';
    if (cls.contains('eyebrow')) return 'Étiquette';
    if (cls.contains('hand')) return 'Note manuscrite';
    if (cls.contains('when')) return 'Moment';
    if (tag === 'A') return 'Lien';
    return { H1: 'Titre principal', H2: 'Titre', H3: 'Sous-titre', H4: 'Petit titre', P: 'Texte', LI: 'Élément de liste', SUMMARY: 'Question', FIGCAPTION: 'Légende de la photo', LABEL: 'Libellé du formulaire' }[tag] || 'Texte';
}

function parseBlocks(html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const blocks = [];

    const metaFields = [...parsed.head.querySelectorAll('[data-c]')].map(n => ({
        type: 'plain', key: n.dataset.c, label: labelFor(n),
        def: n.tagName === 'META' ? n.getAttribute('content') : n.textContent
    }));
    if (metaFields.length) blocks.push({ key: null, label: 'Référencement Google', fixed: true, fields: metaFields });

    parsed.querySelectorAll('[data-s]').forEach(b => {
        const seen = new Set();
        const fields = [];
        b.querySelectorAll('[data-c], [data-c-img]').forEach(n => {
            const key = n.dataset.c || n.dataset.cImg;
            if (seen.has(key)) return;
            seen.add(key);
            if (n.dataset.cImg) {
                fields.push({ type: 'image', key, label: 'Photo du bloc', def: '/' + n.getAttribute('src').replace(/^\//, '') });
            } else {
                fields.push({ type: 'rich', key, label: labelFor(n), def: n.innerHTML.trim(), title: /^H[12]$/.test(n.tagName) });
            }
        });
        blocks.push({ key: b.dataset.s, label: b.dataset.sLabel, fixed: Boolean(b.dataset.sFixed), fields });
    });
    return blocks;
}

function countModified(block) {
    return block.fields.filter(f => (f.type === 'image' ? state.images[f.key] : state.texts[f.key]) != null).length;
}

function pageField(field, onCount) {
    const wrap = el('div', { class: 'field' });
    const tag = el('span', { class: 'field-tag' }, 'Modifié');
    const isSet = () => (field.type === 'image' ? state.images[field.key] : state.texts[field.key]) != null;
    const refreshTag = () => { tag.hidden = !isSet(); onCount(); };

    if (field.type === 'image') {
        wrap.append(imageField(state.images[field.key] || '', (url) => {
            if (url) state.images[field.key] = url; else delete state.images[field.key];
            refreshTag();
            changed();
        }, { folder: 'pages', def: field.def, label: field.label }));
        refreshTag();
        return wrap;
    }

    const setValue = (v) => {
        const normalized = field.type === 'plain' ? v.trim() : v;
        const def = field.type === 'plain' ? field.def.trim() : cleanHtml(field.def);
        if (normalized === def) delete state.texts[field.key]; else state.texts[field.key] = normalized;
        refreshTag();
        changed();
    };

    let editor, tools = [];
    if (field.type === 'plain') {
        editor = el('textarea', { class: 'textarea', rows: field.label.startsWith('Description') ? 3 : 1, value: state.texts[field.key] ?? field.def, oninput: (e) => setValue(e.target.value) });
        editor.style.minHeight = 'auto';
    } else {
        ({ rte: editor, tools } = richEditor(state.texts[field.key] ?? field.def, setValue, { title: field.title }));
    }

    const resetBtn = iconBtn('reset', 'Revenir au texte d\'origine', () => {
        delete state.texts[field.key];
        if (field.type === 'plain') editor.value = field.def; else editor.innerHTML = field.def;
        refreshTag();
        changed();
    });

    wrap.append(
        el('div', { class: 'field-head' },
            el('span', { class: 'field-label' }, field.label),
            tag,
            el('div', { class: 'field-tools' }, tools, resetBtn)),
        editor
    );
    refreshTag();
    return wrap;
}

function blockCard(block, open) {
    const count = el('span', { class: 'blk-count' });
    const updateCount = () => {
        const n = countModified(block);
        count.textContent = n ? `${n} modifié${n > 1 ? 's' : ''}` : `${block.fields.length} champ${block.fields.length > 1 ? 's' : ''}`;
        count.classList.toggle('mod', n > 0);
    };

    const card = el('section', { class: `blk${open ? ' open' : ''}` });
    const head = el('div', { class: 'blk-head', onclick: () => card.classList.toggle('open') },
        el('span', { class: 'chev', html: ICONS.chev }),
        el('h2', {}, block.label),
        count);

    if (!block.fixed && block.key) {
        const checkbox = el('input', { type: 'checkbox', checked: !state.hidden[block.key] });
        const sw = el('label', { class: 'switch', title: 'Afficher ou masquer ce bloc sur le site', onclick: (e) => e.stopPropagation() },
            checkbox, el('i'), el('span', {}, 'Affiché'));
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) delete state.hidden[block.key]; else state.hidden[block.key] = true;
            card.classList.toggle('is-hidden', !checkbox.checked);
            sw.lastChild.textContent = checkbox.checked ? 'Affiché' : 'Masqué';
            changed();
        });
        if (state.hidden[block.key]) { card.classList.add('is-hidden'); sw.lastChild.textContent = 'Masqué'; }
        head.append(sw);
    }

    card.append(head, el('div', { class: 'blk-body' }, block.fields.map(f => pageField(f, updateCount))));
    updateCount();
    return card;
}

async function renderPageView(page, container) {
    container.append(el('p', { class: 'loading-page' }, 'Chargement de la page…'));
    const htmls = await Promise.all(page.files.map(fetchPage));
    const blocks = htmls.flatMap(parseBlocks);
    container.innerHTML = '';
    if (page.hint) container.append(el('p', { class: 'hint', style: 'margin:0 0 16px;font-size:.9rem' }, 'ℹ️ ' + page.hint));
    blocks.forEach((b, i) => container.append(blockCard(b, i === (blocks[0].key ? 0 : 1))));
}

// =========================================================
// FURETS (reproducteurs + petits)
// =========================================================
function ferretPhoto(f) {
    const [c1, c2] = f.couleurs || [];
    return el('div', { class: 'f-photo', style: c1 ? `--c1:${c1};--c2:${c2 || c1}` : '' },
        el('img', { src: f.photo || DEFAULT_PHOTO, class: f.photo ? '' : 'default', alt: '' }),
        el('span', { class: 'badge' }, f.statut ? STATUTS[f.statut] : (f.sexe === 'm' ? '♂ Mâle' : '♀ Femelle')));
}

function ferretForm(f, { withStatut, folder }) {
    const ch = (key) => (v) => { f[key] = v; changed(); };
    return [
        el('div', { class: 'form-grid' },
            inputField('Nom', f.nom, ch('nom'), { full: true }),
            selectField('Sexe', f.sexe || 'f', { f: '♀ Femelle', m: '♂ Mâle' }, ch('sexe')),
            withStatut
                ? selectField('Statut', f.statut || 'avenir', STATUTS, ch('statut'))
                : inputField('Année de naissance', f.naissance, ch('naissance'), { placeholder: '2025' }),
            inputField('Robe', f.robe, ch('robe'), { placeholder: 'Putoisée, champagne…', full: true }),
            inputField('Description', f.description, ch('description'), { type: 'textarea', full: true }),
            inputField('Traits de caractère', (f.tags || []).join(', '), (v) => { f.tags = v.split(',').map(t => t.trim()).filter(Boolean); changed(); },
                { full: true, hint: 'Séparés par des virgules. Ex : Câline, Joueuse, Testée santé' })
        ),
        imageField(f.photo || '', ch('photo'), { folder }),
        el('div', {},
            el('label', { class: 'lbl' }, 'Couleurs du fond (sans photo)'),
            el('div', { class: 'colors' },
                [0, 1].map(i => el('input', {
                    type: 'color', value: (f.couleurs || [])[i] || (i ? '#fbe9c6' : '#f4cfae'),
                    oninput: (e) => { f.couleurs = [...(f.couleurs || ['#f4cfae', '#fbe9c6'])]; f.couleurs[i] = e.target.value; changed(); }
                })),
                el('span', { class: 'hint', style: 'margin:0' }, 'Dégradé affiché derrière le logo quand il n\'y a pas de photo.')))
    ];
}

let drawerOnClose = null;
function openDrawer(title, children, onClose) {
    $('#drawerTitle').textContent = title;
    const body = $('#drawerBody');
    body.innerHTML = '';
    body.append(...children);
    body.scrollTop = 0;
    drawerOnClose = onClose;
    $('#drawerOverlay').hidden = false;
    $('#drawer').classList.add('open');
    $('#drawer').setAttribute('aria-hidden', 'false');
}
function closeDrawer() {
    $('#drawer').classList.remove('open');
    $('#drawer').setAttribute('aria-hidden', 'true');
    $('#drawerOverlay').hidden = true;
    const cb = drawerOnClose;
    drawerOnClose = null;
    cb?.();
}

function renderReproView(container) {
    const list = state.reproducteurs;
    const add = () => {
        list.push({ nom: 'Nouveau furet', sexe: 'f', robe: '', naissance: '', description: '', tags: [], photo: '', couleurs: ['#f4cfae', '#fbe9c6'] });
        changed();
        editRepro(list.length - 1);
    };

    container.append(el('div', { class: 'toolbar' },
        el('p', {}, `${list.length} reproducteur${list.length > 1 ? 's' : ''}. Les 3 premiers apparaissent sur l'accueil.`),
        el('button', { class: 'btn btn-leaf', onclick: add }, '+ Ajouter un furet')));

    if (!list.length) {
        container.append(el('div', { class: 'empty' }, 'Aucun reproducteur pour le moment.'));
        return;
    }

    container.append(el('div', { class: 'cards' }, list.map((r, i) => el('article', { class: 'f-card' },
        ferretPhoto(r),
        el('div', { class: 'f-info' }, el('h3', {}, r.nom || 'Sans nom'), el('p', {}, [r.robe, r.naissance].filter(Boolean).join(' · ') || '—')),
        el('div', { class: 'f-actions' },
            el('button', { class: 'btn btn-ghost btn-sm', onclick: () => editRepro(i) }, 'Modifier'),
            iconBtn('up', 'Monter', () => { moveItem(list, i, -1); changed(); render(); }, { disabled: i === 0 }),
            iconBtn('down', 'Descendre', () => { moveItem(list, i, 1); changed(); render(); }, { disabled: i === list.length - 1 }),
            iconBtn('trash', 'Supprimer', () => {
                if (!confirm(`Supprimer ${r.nom} ?`)) return;
                list.splice(i, 1);
                state.portees.forEach(p => { p.parents = (p.parents || []).filter(n => n !== r.nom); });
                changed();
                render();
            }, { class: 'danger' }))
    ))));
}

function editRepro(i) {
    const r = state.reproducteurs[i];
    const oldName = r.nom;
    openDrawer(r.nom || 'Furet', ferretForm(r, { folder: 'furets' }), () => {
        // Les portées référencent les parents par leur nom : on suit le renommage
        if (r.nom !== oldName) {
            state.portees.forEach(p => { p.parents = (p.parents || []).map(n => (n === oldName ? r.nom : n)); });
            changed();
        }
        render();
    });
}

// =========================================================
// PORTÉES
// =========================================================
function renderPorteesView(container) {
    const list = state.portees;
    const add = () => {
        list.push({ nom: 'Nouvelle portée', parents: [], statut: 'avenir', naissance: '', depart: 'À partir de 12 semaines', description: '', petits: [] });
        changed();
        render();
    };

    container.append(el('div', { class: 'toolbar' },
        el('p', {}, `${list.length} portée${list.length > 1 ? 's' : ''}.`),
        el('button', { class: 'btn btn-leaf', onclick: add }, '+ Ajouter une portée')));

    if (!list.length) {
        container.append(el('div', { class: 'empty' }, 'Aucune portée annoncée.'));
        return;
    }

    list.forEach((p, i) => {
        const ch = (key) => (v) => { p[key] = v; changed(); };
        p.petits = p.petits || [];
        p.parents = p.parents || [];
        const title = el('h2', {}, p.nom || 'Portée');

        const parents = el('div', { class: 'check-grid' }, state.reproducteurs.map(r => {
            const cb = el('input', { type: 'checkbox', checked: p.parents.includes(r.nom) });
            cb.addEventListener('change', () => {
                p.parents = cb.checked ? [...p.parents, r.nom] : p.parents.filter(n => n !== r.nom);
                changed();
            });
            return el('label', { class: 'check-pill' }, cb, `${r.sexe === 'm' ? '♂' : '♀'} ${r.nom}`);
        }));

        const addPetit = () => {
            p.petits.push({ nom: 'Nouveau petit', sexe: 'f', robe: '', statut: 'dispo', description: '', tags: [], photo: '', couleurs: ['#f4cfae', '#fbe9c6'] });
            changed();
            editPetit(p, p.petits.length - 1);
        };

        container.append(el('section', { class: 'panel' },
            el('div', { class: 'panel-head' },
                title,
                iconBtn('up', 'Monter', () => { moveItem(list, i, -1); changed(); render(); }, { disabled: i === 0 }),
                iconBtn('down', 'Descendre', () => { moveItem(list, i, 1); changed(); render(); }, { disabled: i === list.length - 1 }),
                iconBtn('trash', 'Supprimer la portée', () => {
                    if (!confirm(`Supprimer « ${p.nom} » et ses petits ?`)) return;
                    list.splice(i, 1);
                    changed();
                    render();
                }, { class: 'danger' })),
            el('div', { class: 'form-grid' },
                inputField('Nom de la portée', p.nom, (v) => { p.nom = v; title.textContent = v || 'Portée'; changed(); }),
                selectField('Statut', p.statut || 'avenir', STATUTS, ch('statut')),
                inputField('Naissance', p.naissance, ch('naissance'), { placeholder: 'Printemps 2027, 12/03/2027…' }),
                inputField('Départ', p.depart, ch('depart'), { placeholder: 'À partir de 12 semaines' }),
                inputField('Description', p.description, ch('description'), { type: 'textarea', full: true }),
                el('div', { class: 'full' }, el('label', { class: 'lbl' }, 'Parents'),
                    state.reproducteurs.length ? parents : el('p', { class: 'hint' }, 'Ajoutez d\'abord des reproducteurs.'))
            ),
            el('div', { class: 'toolbar', style: 'margin:22px 0 12px' },
                el('label', { class: 'lbl', style: 'margin:0' }, `Petits (${p.petits.length})`),
                el('button', { class: 'btn btn-ghost btn-sm', onclick: addPetit }, '+ Ajouter un petit')),
            p.petits.length
                ? el('div', { class: 'cards' }, p.petits.map((k, j) => el('article', { class: 'f-card' },
                    ferretPhoto(k),
                    el('div', { class: 'f-info' }, el('h3', {}, `${k.sexe === 'm' ? '♂' : '♀'} ${k.nom || 'Sans nom'}`), el('p', {}, k.robe || '—')),
                    el('div', { class: 'f-actions' },
                        el('button', { class: 'btn btn-ghost btn-sm', onclick: () => editPetit(p, j) }, 'Modifier'),
                        iconBtn('up', 'Monter', () => { moveItem(p.petits, j, -1); changed(); render(); }, { disabled: j === 0 }),
                        iconBtn('down', 'Descendre', () => { moveItem(p.petits, j, 1); changed(); render(); }, { disabled: j === p.petits.length - 1 }),
                        iconBtn('trash', 'Supprimer', () => {
                            if (!confirm(`Supprimer ${k.nom} ?`)) return;
                            p.petits.splice(j, 1);
                            changed();
                            render();
                        }, { class: 'danger' })))))
                : el('p', { class: 'hint' }, 'Les petits apparaîtront ici après la naissance.')
        ));
    });
}

function editPetit(portee, j) {
    const k = portee.petits[j];
    openDrawer(k.nom || 'Petit', ferretForm(k, { withStatut: true, folder: 'petits' }), render);
}

// =========================================================
// FAQ
// =========================================================
function renderFaqView(container) {
    const list = state.faq;
    container.append(el('div', { class: 'toolbar' },
        el('p', {}, `${list.length} question${list.length > 1 ? 's' : ''}.`),
        el('button', { class: 'btn btn-leaf', onclick: () => { list.push({ question: 'Nouvelle question ?', reponse: '<p>Votre réponse…</p>' }); changed(); render(); } }, '+ Ajouter une question')));

    list.forEach((item, i) => {
        const { rte, tools } = richEditor(item.reponse, (v) => { item.reponse = v; changed(); });
        container.append(el('section', { class: 'panel faq-item' },
            el('div', { class: 'stack' },
                inputField('Question', item.question, (v) => { item.question = v; changed(); }),
                el('div', { class: 'field', style: 'padding:0;border:none' },
                    el('div', { class: 'field-head' }, el('span', { class: 'field-label' }, 'Réponse'), el('div', { class: 'field-tools' }, tools)),
                    rte)),
            el('div', { class: 'side' },
                iconBtn('up', 'Monter', () => { moveItem(list, i, -1); changed(); render(); }, { disabled: i === 0 }),
                iconBtn('down', 'Descendre', () => { moveItem(list, i, 1); changed(); render(); }, { disabled: i === list.length - 1 }),
                iconBtn('trash', 'Supprimer', () => { if (confirm('Supprimer cette question ?')) { list.splice(i, 1); changed(); render(); } }, { class: 'danger' }))
        ));
    });
}

// =========================================================
// RÉGLAGES
// =========================================================
function renderSettingsView(container) {
    const s = state.settings;
    const last = meta?.updatedAt?.toDate
        ? `Dernier enregistrement le ${meta.updatedAt.toDate().toLocaleString('fr-FR')} par ${meta.updatedBy}.`
        : 'Aucun contenu enregistré pour le moment : le site affiche le contenu d\'origine.';

    const download = () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const a = el('a', { href: URL.createObjectURL(blob), download: `terramustela-contenu-${new Date().toISOString().slice(0, 10)}.json` });
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const fileInput = el('input', { type: 'file', accept: 'application/json', hidden: true });
    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        fileInput.value = '';
        if (!file) return;
        try {
            const data = JSON.parse(await file.text());
            if (!confirm('Remplacer tout le contenu actuel par cette sauvegarde ? (rien n\'est publié tant que vous n\'enregistrez pas)')) return;
            state = { ...defaultState(), ...data };
            changed();
            render();
            toast('Sauvegarde chargée : vérifiez puis enregistrez.');
        } catch {
            toast('Fichier de sauvegarde invalide.', true);
        }
    });

    const resetAll = () => {
        if (!confirm('Remettre TOUT le site (textes, photos, furets, FAQ) à son contenu d\'origine ? Rien n\'est publié tant que vous n\'enregistrez pas.')) return;
        state = defaultState();
        changed();
        render();
    };

    container.append(
        el('section', { class: 'panel' },
            el('div', { class: 'panel-head' }, el('h2', {}, 'Liens')),
            el('div', { class: 'form-grid' },
                inputField('Lien Instagram', s.instagram, (v) => { s.instagram = v.trim(); changed(); }, { type: 'url', full: true, placeholder: 'https://www.instagram.com/…' }),
                inputField('Lien Facebook', s.facebook, (v) => { s.facebook = v.trim(); changed(); }, { type: 'url', full: true, placeholder: 'https://www.facebook.com/…', hint: 'Laissez vide pour masquer l\'icône Facebook.' }),
                inputField('E-mail affiché', s.email, (v) => { s.email = v.trim(); changed(); }, { type: 'email', full: true, placeholder: 'contact@…', hint: 'Icône e-mail dans le pied de page. Laissez vide pour la masquer.' }))),
        el('section', { class: 'panel' },
            el('div', { class: 'panel-head' }, el('h2', {}, 'Sauvegarde')),
            el('p', { class: 'hint', style: 'margin:0 0 14px' }, last),
            el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' },
                el('button', { class: 'btn btn-ghost', onclick: download }, 'Télécharger une sauvegarde'),
                el('button', { class: 'btn btn-ghost', onclick: () => fileInput.click() }, 'Restaurer une sauvegarde'),
                el('button', { class: 'btn btn-danger', onclick: resetAll }, 'Tout remettre par défaut'),
                fileInput))
    );
}

// =========================================================
// NAVIGATION
// =========================================================
let currentView = null;

function buildNav() {
    const nav = $('#sideNav');
    nav.innerHTML = '';
    VIEWS.forEach(v => {
        if (v.group) { nav.append(el('div', { class: 'side-group' }, v.group)); return; }
        nav.append(el('button', { class: 'side-link', 'data-view': v.id, onclick: () => { location.hash = v.id; } }, v.label));
    });
}

async function render() {
    const id = location.hash.slice(1) || VIEWS.find(v => v.id).id;
    const view = VIEWS.find(v => v.id === id) || VIEWS.find(v => v.id);
    const container = $('#content');
    const scroll = currentView === view.id ? window.scrollY : 0;
    currentView = view.id;

    document.querySelectorAll('.side-link').forEach(b => b.classList.toggle('active', b.dataset.view === view.id));
    $('#viewTitle').textContent = view.page ? `Page « ${view.label} »` : view.label;
    $('#viewHint').textContent = view.page ? 'Cliquez sur un bloc pour modifier ses textes et photos.' : view.hint || '';
    $('#viewSiteBtn').href = view.page?.url || view.url || '/';
    $('#sidebar').classList.remove('open');

    container.innerHTML = '';
    try {
        if (view.page) await renderPageView(view.page, container);
        else if (view.id === 'repro') renderReproView(container);
        else if (view.id === 'portees') renderPorteesView(container);
        else if (view.id === 'faq') renderFaqView(container);
        else if (view.id === 'settings') renderSettingsView(container);
    } catch (err) {
        console.error(err);
        container.innerHTML = '';
        container.append(el('div', { class: 'empty' }, `Impossible de charger cette section : ${err.message}`));
    }
    window.scrollTo(0, scroll);
}

// =========================================================
// CHARGEMENT / ENREGISTREMENT
// =========================================================
async function loadContent() {
    const snap = await getDoc(contentRef);
    state = defaultState();
    if (snap.exists()) {
        const data = snap.data();
        meta = { updatedAt: data.updatedAt, updatedBy: data.updatedBy };
        try { Object.assign(state, JSON.parse(data.data || '{}')); } catch (err) { console.error('Contenu illisible :', err); }
    }
    saved = clone(state);
    changed();
}

async function save() {
    if (!isDirty()) return;
    const btn = $('#saveBtn');
    btn.disabled = true;
    btn.textContent = 'Enregistrement…';
    try {
        const raw = JSON.stringify(state);
        await setDoc(contentRef, { data: raw, updatedAt: serverTimestamp(), updatedBy: auth.currentUser.email });

        const stillUsed = collectUrls(state);
        const removed = [...collectUrls(saved)].filter(u => !stillUsed.has(u));
        saved = clone(state);
        meta = { updatedAt: { toDate: () => new Date() }, updatedBy: auth.currentUser.email };
        try { localStorage.setItem(SITE_CACHE_KEY, raw); } catch { /* stockage indisponible */ }
        toast('Modifications enregistrées et publiées ✓');

        if (removed.length) {
            auth.currentUser.getIdToken()
                .then(token => fetch('/api/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ urls: removed }) }))
                .catch(err => console.warn('Nettoyage des anciennes photos impossible :', err));
        }
    } catch (err) {
        console.error(err);
        toast(err.code === 'permission-denied'
            ? 'Enregistrement refusé : vérifiez que les règles Firestore sont publiées.'
            : `Erreur d'enregistrement : ${err.message}`, true);
    } finally {
        btn.textContent = 'Enregistrer';
        changed();
    }
}

// =========================================================
// AUTHENTIFICATION
// =========================================================
const LOGIN_ERRORS = {
    'auth/unauthorized-domain': 'Ce domaine n\'est pas autorisé : ajoutez-le dans Firebase > Authentication > Paramètres > Domaines autorisés.',
    'auth/operation-not-allowed': 'La connexion Google n\'est pas activée dans Firebase > Authentication.',
    'auth/popup-blocked': 'La fenêtre de connexion a été bloquée par le navigateur. Autorisez les pop-ups puis réessayez.'
};

$('#loginBtn').addEventListener('click', async () => {
    $('#loginError').textContent = '';
    try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
    } catch (err) {
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
        console.error(err);
        $('#loginError').textContent = LOGIN_ERRORS[err.code] || `Connexion impossible (${err.code || err.message}).`;
    }
});

$('#logoutBtn').addEventListener('click', async () => {
    if (isDirty() && !confirm('Des modifications ne sont pas enregistrées. Se déconnecter quand même ?')) return;
    await signOut(auth);
    location.hash = '';
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        $('#appView').hidden = true;
        $('#loginView').hidden = false;
        return;
    }
    if (!user.emailVerified || !ADMIN_EMAILS.includes(user.email)) {
        await signOut(auth);
        $('#loginError').textContent = `Le compte ${user.email} n'a pas accès à l'administration.`;
        return;
    }

    $('#loginView').hidden = true;
    $('#appView').hidden = false;
    $('#userName').textContent = user.displayName || user.email;
    $('#userAvatar').src = user.photoURL || '/assets/img/apple-touch-icon.png';

    buildNav();
    try {
        await loadContent();
    } catch (err) {
        console.error(err);
        toast(`Lecture du contenu impossible : ${err.message}`, true);
    }
    render();
});

// =========================================================
// ÉVÉNEMENTS GLOBAUX
// =========================================================
window.addEventListener('hashchange', render);
$('#saveBtn').addEventListener('click', save);
$('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#sideOverlay').addEventListener('click', () => $('#sidebar').classList.remove('open'));
$('#drawerClose').addEventListener('click', closeDrawer);
$('#drawerDone').addEventListener('click', closeDrawer);
$('#drawerOverlay').addEventListener('click', closeDrawer);

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
    }
    if (e.key === 'Escape' && $('#drawer').classList.contains('open')) closeDrawer();
});

window.addEventListener('beforeunload', (e) => {
    if (isDirty()) e.preventDefault();
});
