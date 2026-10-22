// 1. Importation des modules
const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config(); // Charge les variables du fichier .env

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
    }
});

// Adresse qui reçoit les messages du site (par défaut : le compte SMTP)
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || process.env.SMTP_EMAIL;

// 2. Initialisation de l'application
const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // Derrière le proxy de l'hébergeur : vraie IP client pour l'anti-spam
app.use(express.json({ limit: '20kb' }));

app.use(express.static(path.join(__dirname, 'public'), {
    extensions: ['html'],
    setHeaders: function (res, filePath) {
        if (filePath.endsWith('.css') || filePath.endsWith('.js') || filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// //////////////////////////////////////////////////
// ✉️ FORMULAIRES (contact + pré-réservation)
// //////////////////////////////////////////////////
const escapeHtml = (str = '') => String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Anti-spam simple : 5 envois max par IP toutes les 15 minutes
const RATE_WINDOW = 15 * 60 * 1000;
const RATE_MAX = 5;
const rateHits = new Map();
const isRateLimited = (ip) => {
    const now = Date.now();
    const hits = (rateHits.get(ip) || []).filter(t => now - t < RATE_WINDOW);
    hits.push(now);
    rateHits.set(ip, hits);
    return hits.length > RATE_MAX;
};

const FIELD_LABELS = {
    topic: 'Sujet',
    phone: 'Téléphone',
    city: 'Ville / département',
    souhait: 'Recherche',
    experience: 'Expérience',
    logement: 'Logement & autres animaux'
};

app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message, website, subject } = req.body || {};

        // Champ piège invisible : rempli uniquement par les robots
        if (website) return res.status(200).json({ message: 'OK' });

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Nom, e-mail et message sont obligatoires.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Adresse e-mail invalide.' });
        }
        if (isRateLimited(req.ip)) {
            return res.status(429).json({ error: 'Trop de messages envoyés, réessayez plus tard.' });
        }

        const details = Object.entries(FIELD_LABELS)
            .filter(([key]) => req.body[key])
            .map(([key, label]) => `<tr><td style="padding:6px 12px 6px 0;color:#8a7563;">${label}</td><td style="padding:6px 0;"><strong>${escapeHtml(String(req.body[key]).slice(0, 300))}</strong></td></tr>`)
            .join('');

        const safeSubject = subject === 'Pré-réservation' ? 'Pré-réservation' : 'Contact site';

        const html = `
            <div style="background-color:#fdf8ec;padding:30px 10px;font-family:'Helvetica Neue',Arial,sans-serif;">
                <div style="max-width:600px;margin:0 auto;background:#fffdf8;border:1px solid #ecdcbf;border-radius:16px;overflow:hidden;">
                    <div style="background-color:#5d3d21;padding:22px 30px;color:#fdf8ec;">
                        <p style="margin:0;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#e9a93a;">${safeSubject}</p>
                        <h2 style="margin:6px 0 0 0;font-size:20px;">${escapeHtml(name)}</h2>
                    </div>
                    <div style="padding:26px 30px;color:#4a3424;">
                        <table style="font-size:14px;border-collapse:collapse;margin-bottom:18px;">
                            <tr><td style="padding:6px 12px 6px 0;color:#8a7563;">E-mail</td><td style="padding:6px 0;"><strong>${escapeHtml(email)}</strong></td></tr>
                            ${details}
                        </table>
                        <div style="background:#f7eedb;border-radius:12px;padding:18px;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(String(message).slice(0, 5000))}</div>
                    </div>
                </div>
            </div>`;

        await transporter.sendMail({
            from: `"Site Terra Mustela" <${process.env.SMTP_EMAIL}>`,
            to: CONTACT_EMAIL,
            replyTo: email,
            subject: `🐾 ${safeSubject} — ${String(name).slice(0, 80)}`,
            html
        });

        res.status(200).json({ message: 'Message envoyé' });
    } catch (error) {
        console.error('Erreur envoi formulaire :', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/ping', (req, res) => {
    res.status(200).send('pong');
});

// Page introuvable : retour à l'accueil (les fichiers manquants restent en 404)
app.use((req, res) => {
    if (req.method === 'GET' && !path.extname(req.path)) return res.redirect('/');
    res.status(404).send('Introuvable');
});

app.listen(PORT, () => {
    console.log(`🐾 Serveur Terra Mustela démarré sur le port ${PORT}`);
});
