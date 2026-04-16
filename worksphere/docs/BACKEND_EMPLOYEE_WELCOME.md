# Backend (Nest) — e-mail de bienvenue et mot de passe temporaire

## Pourquoi le mot de passe n’apparaît pas toujours dans le mail

Le front **WorkSphere** (Netlify) appelle **Resend** via la fonction serverless `send-employee-welcome` **après** un `POST /rh/employees` réussi.

- Le corps du mail **inclut le mot de passe en clair** uniquement si le front reçoit ce mot de passe **dans la réponse JSON** de l’API au moment de la création.
- Si l’API ne renvoie **aucun** mot de passe temporaire en clair, le mail part en mode **« compte créé »** : **e-mail de connexion** + **lien vers `/login`** + consigne **« Mot de passe oublié »** (pas de MDP dans le mail).

Donc : **pas de champ renvoyé par le backend ⇒ pas de mot de passe dans l’e-mail Resend.**

---

## Contrat attendu entre API et front

### Requête `POST /rh/employees`

- Le front **n’envoie pas** le champ `password` (rejeté par votre validation : `property password should not exist`).
- Champs typiques : `name`, `email`, `department`, `employeeType`, `role`, `joinDate`, `status`, etc.

### Réponse `201` / `200` (corps JSON)

Pour que l’e-mail contienne **e-mail + mot de passe temporaire auto-généré**, la réponse doit inclure **une seule fois** le mot de passe en clair sous **l’un** des noms suivants (le front les lit dans cet ordre) :

| Champ JSON (priorité) | Description |
|----------------------|-------------|
| `temporaryPassword`  | Recommandé |
| `tempPassword`       | Alias |
| `plainPassword`      | Alias |
| `generatedPassword`  | Alias |
| `initialPassword`    | Alias |

Champs **optionnels** utiles pour le front / produit :

| Champ | Rôle |
|--------|------|
| `emailSent` | `true` si **vous** avez déjà envoyé un mail de bienvenue côté Nest (SMTP/Resend) — informatif ; le front peut quand même appeler Netlify pour le template WorkSphere. |
| `mustChangePassword` | `true` si le compte doit changer le MDP à la première connexion — le front peut l’utiliser après `POST /auth/login`. |

Exemple minimal :

```json
{
  "_id": "…",
  "name": "Jean Dupont",
  "email": "jean@example.com",
  "temporaryPassword": "K9mPx2Qw",
  "emailSent": false,
  "mustChangePassword": true
}
```

**Important :** ne **stockez pas** le mot de passe en clair en base. Enregistrez uniquement le **hash** (bcrypt / argon2). Le champ `temporaryPassword` dans la réponse sert uniquement à l’envoi du mail immédiat (front Netlify ou votre mailer Nest).

---

## À implémenter côté Nest (checklist)

1. Lors de `POST /rh/employees` :
   - générer une chaîne aléatoire (ex. 10–12 caractères, lettres + chiffres) ;
   - **hasher** cette chaîne et enregistrer le hash sur l’utilisateur ;
   - inclure dans la réponse JSON : `"temporaryPassword": "<chaîne en clair une seule fois>"`.

2. Ne pas exposer ce champ sur `GET /rh/employees` ni sur les autres endpoints (sérialisation : groupe de réponse `create` uniquement, ou DTO dédié).

3. Optionnel : forcer le changement de mot de passe à la première connexion (`mustChangePassword`, etc.).

4. **CORS** : voir la section dédiée ci-dessous (variable Railway + code `main.ts`).

5. **Préfixe global** : si les routes sont sous `/api`, documenter `API_PATH_PREFIX` pour que le front pointe vers `/api/rh/employees`.

6. **Mot de passe oublié** : si vous ne renvoyez pas `temporaryPassword`, le collaborateur doit pouvoir utiliser le flux **reset password** (`POST /auth/reset-password` ou équivalent) ; variables typiques : `FRONTEND_RESET_PASSWORD_URL`, `RESEND_API_KEY` **côté backend** si c’est Nest qui envoie le mail de reset.

7. **Changement de mot de passe obligatoire** : si `POST /auth/login` renvoie `user.mustChangePassword: true`, le front redirige vers **`/first-password`** et appelle **`POST /auth/change-password`** avec un corps du type :

```json
{ "currentPassword": "…", "newPassword": "…" }
```

Adaptez le chemin ou le DTO sur Nest si votre API utilise un autre endpoint (ex. `PATCH /users/me/password`). Après succès, le front met à jour `mustChangePassword` en local.

---

## CORS (Railway / Nest) — correction à copier/coller

Le navigateur envoie `Origin: https://votre-site.netlify.app` (avec **`https://`**). La variable d’environnement doit donc contenir la **même URL complète**.

| ❌ Incorrect | ✅ Correct |
|--------------|------------|
| `roaring-strudel-8142ed.netlify.app` | `https://roaring-strudel-8142ed.netlify.app` (sans `/` à la fin) |

**Railway → Variables** : une ligne, par exemple :

```env
CORS_ORIGINS=https://roaring-strudel-8142ed.netlify.app
```

Pour le **dev local** en plus du site Netlify :

```env
CORS_ORIGINS=https://roaring-strudel-8142ed.netlify.app,http://localhost:5173,http://localhost:8888
```

**`main.ts`** — le code doit **lire** `CORS_ORIGINS` (sinon la variable ne sert à rien) :

```ts
function parseOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const origins = parseOrigins(process.env.CORS_ORIGINS)
  app.enableCors({
    origin: origins.length ? origins : true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })

  await app.listen(process.env.PORT ?? 3000)
}
```

Après modification : **redéployer** sur Railway, puis **recharger** le front Netlify (Ctrl+F5 ou navigation privée).

---

## Flux résumé

```
RH ajoute un employé (front)
    → POST /rh/employees (sans password)
    ← JSON avec ou sans temporaryPassword
    → front appelle send-employee-welcome (Resend)
    → e-mail : avec MDP si temporaryPassword présent, sinon lien + consigne « mot de passe oublié »
```

---

## Fichiers côté front (référence)

- `worksphere/src/pages/rh/Employes.jsx` — lecture de `created.temporaryPassword` (et alias), puis appel `sendEmployeeWelcomeEmail`.
- `worksphere/src/services/employeeWelcome.js` — appel `/.netlify/functions/send-employee-welcome`.
- `worksphere/netlify/functions/send-employee-welcome.js` — template HTML/texte Resend.
- `worksphere/src/pages/auth/Login.jsx` — redirection vers `/first-password` si `user.mustChangePassword`.
- `worksphere/src/pages/auth/FirstPassword.jsx` — formulaire premier changement de MDP (`changePasswordFirst` → `/auth/change-password`).
- `worksphere/src/components/MustChangePasswordRedirect.jsx` — redirection si session avec `mustChangePassword` sans passer par login.

Variables Netlify (fonctions) : `RESEND_API_KEY`, `EMAIL_FROM`, et pour le lien : l’URL du site (déjà utilisée côté front dans `loginUrl`).

---

## Doc associée (front)

- [`frontend-rh-employee-welcome.md`](./frontend-rh-employee-welcome.md) — même contrat, vue React / flux RH.

## Code Nest à copier (génération MDP + réponse)

- [`BACKEND_NEST_CREATE_EMPLOYEE_SNIPPET.md`](./BACKEND_NEST_CREATE_EMPLOYEE_SNIPPET.md)
