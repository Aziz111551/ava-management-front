# Phase 1 — liste candidats, Teams + test technique

## Données affichées

- La liste provient du **webhook** configuré dans `evaluationsWebhook.js` (`VITE_EVALUATIONS_WEBHOOK_URL` ou URL par défaut n8n).
- Chaque ligne : nom, e-mail, poste, **score %**, date, notes, CV.

## Flux RH (écran Phase 1)

1. Cliquer **Accepter** sur un candidat.
2. Renseigner :
   - **Date et heure** de l’entretien Teams (fuseau du navigateur) ;
   - **Lien Teams** (URL `https://` créée dans Outlook / Teams) ;
   - **Notes** optionnelles pour le candidat.
3. **Envoyer l’e-mail au candidat** : un seul message Resend avec :
   - créneau formaté en français ;
   - bouton + URL Teams ;
   - lien **test technique** en ligne (JWT via `issue-tech-test` avec `skipResendEmail`).

Fichiers concernés :

- `worksphere/src/pages/rh/RhOther.jsx` (composant `Candidats`)
- `worksphere/src/services/phase1InviteBundle.js`
- `worksphere/netlify/functions/send-phase1-bundle.js`
- `worksphere/netlify/functions/issue-tech-test.js` (option `skipResendEmail`)

## Persistance locale

Les décisions (accepté / refusé) restent dans `localStorage` via `candidatsPhase1.js` tant que le webhook renvoie les mêmes lignes.

## Persistance backend (optionnel)

Pour stocker créneau + lien Teams côté Nest, ajouter un endpoint dédié (ex. `POST /rh/phase1-schedule`) et l’appeler après succès Resend — non implémenté dans ce dépôt.

## Variables Netlify

- `RESEND_API_KEY`, `EMAIL_FROM` (même que pour les autres mails)
- `SITE_URL` / URL Netlify pour générer le lien test technique
