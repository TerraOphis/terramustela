# Terra Mustela

Site vitrine de l'élevage familial de furets Terra Mustela (Node/Express + pages statiques).

## Lancer le site

```bash
npm install
npm start          # http://localhost:3000
```

Variables d'environnement (`.env`) :

| Variable        | Rôle                                                        |
|-----------------|-------------------------------------------------------------|
| `SMTP_EMAIL`           | Compte Gmail utilisé pour envoyer les messages du site       |
| `SMTP_PASSWORD`        | Mot de passe d'application Gmail                             |
| `CONTACT_EMAIL`        | Adresse qui reçoit les formulaires (défaut : `SMTP_EMAIL`)   |
| `R2_ACCOUNT_ID`        | Cloudflare R2 : identifiant du compte                        |
| `R2_ACCESS_KEY_ID`     | Cloudflare R2 : clé d'accès                                  |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 : clé secrète                                  |
| `R2_BUCKET_NAME`       | Cloudflare R2 : bucket des photos                            |
| `R2_PUBLIC_URL`        | Cloudflare R2 : URL publique du bucket (sans `/` final)      |
| `PORT`                 | Port du serveur (défaut : 3000)                              |

Les photos envoyées depuis l'admin sont rangées dans le dossier `terramustela/` du bucket.

## Espace administration : `/admin`

Aucun lien n'y mène depuis le site. Connexion Google réservée à `martin.stuis11@gmail.com`
et `terra.ophis@gmail.com` (contrôlé dans l'admin, par les règles Firestore et par le serveur).

Depuis l'admin, on modifie :
- tous les textes de toutes les pages, du menu et du pied de page, titres et descriptions Google ;
- les photos des blocs (accueil, élevage, adoption) ;
- l'affichage ou le masquage de chaque bloc ;
- les reproducteurs, les portées et leurs petits (avec photos) ;
- la FAQ, les liens Instagram / Facebook / e-mail ;
- sauvegarde / restauration du contenu au format JSON.

Tout est enregistré dans Firestore (`site/content`). Tant que rien n'est enregistré,
le site affiche le contenu d'origine (textes des fichiers HTML + `public/defaults.js`).

### Mise en place Firebase (projet `terramustela`)

1. **Authentication** > Méthode de connexion : activer **Google**.
2. **Authentication** > Paramètres > Domaines autorisés : ajouter le domaine du site.
3. **Firestore Database** : créer la base, puis coller `firebase.rules` dans l'onglet Règles et publier.

## Fichiers utiles

- Textes par défaut : directement dans les pages HTML (les éléments `data-c` sont éditables).
- Listes par défaut (furets, portées, FAQ, réglages) : `public/defaults.js`.
- Configuration Firebase et comptes admin : `public/firebase-config.js` (+ `ADMIN_EMAILS` dans `server.js`).

## Logo

Toutes les déclinaisons (logo carré, logo horizontal, emblème, favicon, image de partage) sont
générées depuis le logo source :

```bash
pip install pillow
python3 scripts/generate-logos.py chemin/vers/logo.png
```
