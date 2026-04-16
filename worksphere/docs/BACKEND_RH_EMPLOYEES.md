# Backend (Nest) — RH Employees

## Objectif

Cette page front (`worksphere/src/pages/rh/Employes.jsx`) consomme les endpoints RH pour :

- afficher la liste réelle des employés ;
- créer un employé ;
- modifier un employé ;
- supprimer un employé ;
- envoyer ensuite un e-mail de bienvenue via Netlify / Resend.

Si `GET /rh/employees` échoue, le front affiche une erreur et une liste vide.  
Si `POST /rh/employees` réussit, le front peut envoyer un e-mail avec mot de passe temporaire **si** l’API renvoie `temporaryPassword`.

---

## Endpoints attendus

### 1. `GET /rh/employees`

Retour attendu : **tableau JSON**

```json
[
  {
    "_id": "674a...",
    "id": "674a...",
    "name": "Jean Dupont",
    "email": "jean@example.com",
    "department": "IT",
    "employeeType": "Developer",
    "role": "employee",
    "status": "active",
    "joinDate": "2025-01-15T00:00:00.000Z"
  }
]
```

### Contraintes importantes

- La réponse doit être un **array** ; le front fait `Array.isArray(r.data)`.
- Chaque employé doit exposer au minimum :
  - `_id` ou `id`
  - `name`
  - `email`
  - `department`
  - `employeeType`
  - `status`
- Ne jamais renvoyer :
  - `password`
  - `passwordHash`
  - `temporaryPassword`

### Causes probables du `500` sur cette route

- erreur Mongo / requête Mongoose ;
- document partiellement invalide (`department` ou `status` manquant alors que le code suppose la présence) ;
- sérialisation d’un champ non prévu ;
- appel à une relation / population cassée ;
- garde JWT / rôle RH qui jette une exception non gérée ;
- `undefined.map(...)`, `undefined.toLowerCase()` ou lecture d’une propriété absente dans le service.

### Recommandation

Protéger le mapping backend avec des valeurs par défaut avant retour :

```ts
return employees.map((e) => ({
  _id: String(e._id),
  id: String(e._id),
  name: e.name ?? '',
  email: e.email ?? '',
  department: e.department ?? '',
  employeeType: e.employeeType ?? '',
  role: e.role ?? 'employee',
  status: e.status ?? 'active',
  joinDate: e.joinDate ?? null,
}))
```

---

## 2. `POST /rh/employees`

Body attendu côté front :

```json
{
  "name": "Jean Dupont",
  "email": "jean@example.com",
  "department": "IT",
  "employeeType": "Developer",
  "role": "employee",
  "status": "active",
  "joinDate": "2025-01-15"
}
```

### Important

- Le front **n’envoie pas** `password`.
- **Implémentation Nest prête à adapter** : [`BACKEND_NEST_CREATE_EMPLOYEE_SNIPPET.md`](./BACKEND_NEST_CREATE_EMPLOYEE_SNIPPET.md) (génération + hash + `temporaryPassword` dans la réponse).
- Si vous voulez que le mail de bienvenue contienne le mot de passe :
  - générer le mot de passe côté Nest ;
  - le hasher en base ;
  - renvoyer une seule fois :

```json
{
  "_id": "674a...",
  "id": "674a...",
  "name": "Jean Dupont",
  "email": "jean@example.com",
  "temporaryPassword": "K9mPx2QwAb",
  "mustChangePassword": true
}
```

Le front lit les champs dans cet ordre :

- `temporaryPassword`
- `tempPassword`
- `plainPassword`
- `generatedPassword`
- `initialPassword`

---

## 3. `PUT /rh/employees/:id`

Le front envoie l’objet du formulaire, par exemple :

```json
{
  "name": "Jean Dupont",
  "email": "jean@example.com",
  "department": "IT",
  "employeeType": "Developer",
  "role": "employee",
  "status": "active",
  "joinDate": "2025-01-15"
}
```

Réponse recommandée : employé mis à jour ou `200 OK`.

---

## 4. `DELETE /rh/employees/:id`

Réponse recommandée :

```json
{ "ok": true }
```

ou `204 No Content`.

---

## Auth / Guards

Tous ces endpoints doivent être protégés :

- JWT obligatoire
- rôle RH obligatoire

Le front envoie automatiquement :

```http
Authorization: Bearer <token>
```

Si l’utilisateur n’est plus autorisé, l’interceptor front gère déjà `401` en le renvoyant vers `/login`.

---

## CORS

Le frontend Netlify doit être autorisé, sinon le navigateur bloque les appels.

Exemple Railway :

```env
CORS_ORIGINS=https://roaring-strudel-8142ed.netlify.app
```

Exemple Nest :

```ts
function parseOrigins(raw?: string): string[] {
  if (!raw?.trim()) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

const origins = parseOrigins(process.env.CORS_ORIGINS)

app.enableCors({
  origin: origins.length ? origins : true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
})
```

---

## Checklist debug pour le `500` actuel sur `GET /rh/employees`

1. Ouvrir **Railway → Deployments / Logs**
2. Recharger la page `/rh/employes`
3. Lire la stack exacte de `GET /rh/employees`
4. Vérifier :
   - connexion DB OK
   - collection employees/users accessible
   - aucun champ `undefined` dans le mapping
   - aucun DTO de sortie ne tente de sérialiser un champ interdit
   - le guard RH ne jette pas une exception non catchée

### Test manuel utile

```bash
curl -H "Authorization: Bearer TON_TOKEN" \
  "https://backendagentai-production.up.railway.app/rh/employees"
```

Si cette commande renvoie `500`, le problème est 100 % backend.

---

## Référence front

- `worksphere/src/pages/rh/Employes.jsx`
- `worksphere/src/services/api.js`
- `worksphere/docs/BACKEND_EMPLOYEE_WELCOME.md`
- `worksphere/docs/frontend-rh-employee-welcome.md`
