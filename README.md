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
| `SMTP_EMAIL`    | Compte Gmail utilisé pour envoyer les messages du site      |
| `SMTP_PASSWORD` | Mot de passe d'application Gmail                            |
| `CONTACT_EMAIL` | Adresse qui reçoit les formulaires (défaut : `SMTP_EMAIL`)  |
| `PORT`          | Port du serveur (défaut : 3000)                             |

## Modifier le contenu

- **Furets & portées** : `public/furets-data.js` (reproducteurs, portées, petits, statuts, photos).
  Les photos se déposent dans `public/assets/img/` puis se référencent via le champ `photo`.
- **Navigation / pied de page** : `public/components/navbar.html` et `footer.html`.
- **Mentions légales** : compléter les champs `[à compléter]` de `public/mentions-legales.html`
  et `public/politique-confidentialite.html`.

## Logo

Toutes les déclinaisons (logo carré, logo horizontal, emblème, favicon, image de partage) sont
générées depuis le logo source :

```bash
pip install pillow
python3 scripts/generate-logos.py chemin/vers/logo.png
```
