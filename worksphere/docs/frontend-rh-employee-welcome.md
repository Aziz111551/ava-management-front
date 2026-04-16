# Page RH — Création d’employé & e-mail de bienvenue (React / WorkSphere)

## Objectif

Après un `POST /rh/employees` réussi, le front appelle la fonction Netlify `send-employee-welcome` (Resend) pour envoyer l’e-mail. **Le contenu du mail dépend de la réponse JSON du backend.**

---

## Appel API — `POST /rh/employees`

- **Auth** : JWT (même mécanisme que le reste de l’app RH).
- **URL** : base API + `/rh/employees` (éventuellement avec préfixe global, ex. `/api/rh/employees` si `API_PATH_PREFIX=api`).
- **Headers** : `Authorization: Bearer <token>`, `Content-Type: application/json`.
- **Body (exemple)** — **ne pas envoyer `password`** (rejeté par la validation Nest : `property password should not exist`).

```json
{
  "name": "Jean Dupont",
  "email": "jean@example.com",
  "department": "IT",
  "employeeType": "CDI",
  "role": "employee",
  "status": "active",
  "joinDate": "2025-01-15"
}
```

Champs optionnels selon ton formulaire : `department`, `employeeType`, `role`, `status`, `joinDate`.

---

## Réponse — `201 Created`

Le backend renvoie un **objet plat** (plus de `{ user: { ... } }` seul) avec notamment :

| Champ | Rôle |
|--------|------|
| `_id`, `id` | Identifiant MongoDB (string) |
| `name`, `email`, … | Données employé (sans hash mot de passe) |
| **`temporaryPassword`** | Mot de passe temporaire en clair, **une seule fois** — à utiliser pour le mail Resend côté front |
| **`emailSent`** | `true` si l’e-mail de bienvenue Nest (SMTP/Resend) a été envoyé ; ne remplace pas ton appel Netlify si tu veux un template WorkSphere |
| **`mustChangePassword`** | `true` si le compte impose un changement de MDP à la première connexion |

### Exemple minimal utile pour le front

```json
{
  "_id": "674a…",
  "id": "674a…",
  "name": "Jean Dupont",
  "email": "jean@example.com",
  "temporaryPassword": "K9mPx2QwAb",
  "emailSent": true,
  "mustChangePassword": true
}
```

### Lecture côté React (comme sur `Employes.jsx`) — priorité recommandée

- **`temporaryPassword`**
- Alias possibles si tu les ajoutes côté API plus tard : `tempPassword`, `plainPassword`, `generatedPassword`, `initialPassword` (aujourd’hui le backend peut n’exposer que `temporaryPassword`).

Si `temporaryPassword` est **absent ou vide** : template e-mail **sans MDP** (lien login + consigne « mot de passe oublié »).

---

## Flux recommandé dans la page React

1. `POST /rh/employees` avec le body du formulaire.
2. Si **2xx** :
   - lire `data.temporaryPassword` (ou alias si tu les gères),
   - appeler `sendEmployeeWelcomeEmail` (ou équivalent) avec au minimum : `email`, `name`, `temporaryPassword` si présent, URL de login pour le template Netlify.
3. Afficher un toast / message de succès ; en cas d’erreur Resend/Netlify, gérer l’erreur **sans annuler la création** (l’employé est déjà créé côté API).

---

## CORS (Netlify → API Railway / autre)

Sur le backend, définir **`CORS_ORIGINS`** avec l’URL du site Netlify (virgules si plusieurs origines), par exemple :

```env
CORS_ORIGINS=https://ton-app.netlify.app
```

**Important :** utiliser **`https://`** + le domaine (ex. `https://roaring-strudel-8142ed.netlify.app`). Sans `https://`, le CORS ne correspond souvent pas à l’en-tête `Origin` du navigateur.

Sans cette variable, le backend peut accepter toutes les origines (`origin: true`) — pratique en dev, à restreindre en prod si besoin. Détail + exemple `main.ts` : [`BACKEND_EMPLOYEE_WELCOME.md`](./BACKEND_EMPLOYEE_WELCOME.md) (section **CORS**).

---

## Connexion après création

- **`POST /auth/login`** : si `mustChangePassword === true` dans `user`, le front peut rediriger vers un écran changement de mot de passe obligatoire.
- **Mot de passe oublié** : flux existant `POST /auth/reset-password` (e-mail avec lien) — vérifier `FRONTEND_RESET_PASSWORD_URL` et `RESEND_API_KEY` **côté backend**.

---

## Résumé une ligne

**Pas de `temporaryPassword` dans la réponse API ⇒ pas de mot de passe dans l’e-mail Resend côté front ; avec `temporaryPassword` ⇒ mail avec identifiants.**

---

## Voir aussi

- [`BACKEND_EMPLOYEE_WELCOME.md`](./BACKEND_EMPLOYEE_WELCOME.md) — détails implémentation Nest (génération MDP, hash, sérialisation).
