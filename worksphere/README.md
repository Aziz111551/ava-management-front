# WorkSphere — Frontend

React + Vite frontend for the WorkSphere HR management platform.

## Stack

- **React 18** + **React Router v6**
- **Vite** (build tool)
- **Axios** (API calls to NestJS backend)
- No Tailwind — pure inline styles with CSS variables for theming

---

## Setup local

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and set VITE_API_URL to your NestJS backend URL

# 3. Start dev server
npm run dev
# → http://localhost:3000
```

### Netlify (production)

Les variables `VITE_*` sont injectées **au moment du build**, pas au runtime.

1. Dans **Netlify** : **Site configuration → Environment variables**
2. Ajoutez **`VITE_API_URL`** = l’URL publique HTTPS de votre API NestJS (sans slash final), par ex. `https://xxx.railway.app`
3. **Redéployez** le site (déclencher un nouveau build). Sans `VITE_API_URL`, le bundle ne pointe plus vers localhost en prod, mais l’API reste injoignable tant que la variable n’est pas définie.
4. Côté **backend** : autorisez le domaine Netlify dans **CORS** (`https://votre-site.netlify.app`).

---

## NestJS backend — expected endpoints

### Auth
| Method | URL | Body | Returns |
|--------|-----|------|---------|
| POST | `/auth/login` | `{ email, password }` | `{ user: { _id, name, email, role, employeeType }, token }` |

The `role` field must be either `"rh"` or `"employee"`. This drives the redirect after login.

### RH endpoints
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/rh/calendar` | Google Calendar meetings |
| GET | `/rh/employees` | List all employees |
| POST | `/rh/employees` | Add employee |
| PUT | `/rh/employees/:id` | Update employee |
| DELETE | `/rh/employees/:id` | Delete employee |
| GET | `/rh/reclamations` | All reclamations |
| PUT | `/rh/reclamations/:id` | Update reclamation status |
| GET | `/rh/conges` | All leave requests |
| PUT | `/rh/conges/:id` | Approve/reject leave |
| GET | `/rh/candidats` | Phase 1 accepted candidates |
| GET | `/rh/maladies` | All sick leave records |
| PUT | `/rh/maladies/:id` | Update sick leave |

### Employee endpoints
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/employee/projects` | My projects |
| POST | `/employee/projects` | Add project |
| GET | `/employee/trello` | My Trello tasks (via N8N) |
| GET | `/employee/conges` | My leave history |
| POST | `/employee/conges` | Submit leave request |
| POST | `/employee/maladie` | Declare sick leave |

### MongoDB User schema (minimum)
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string",
  "password": "hashed string",
  "role": "rh | employee",
  "employeeType": "Développeur | Commercial | Marketing | Manager | RH | ...",
  "department": "string",
  "status": "active | leave | sick",
  "joinDate": "date"
}
```

---

## N8N integration

The `/employee/trello` endpoint should call an N8N webhook that fetches tasks from Trello and returns them formatted as:
```json
[
  {
    "_id": "string",
    "title": "string",
    "status": "todo | in_progress | done",
    "tag": "string",
    "priority": "high | medium | low",
    "project": "string"
  }
]
```

The `/rh/calendar` endpoint should call an N8N workflow that reads from Google Calendar and returns:
```json
[
  {
    "id": "string",
    "title": "string",
    "date": "YYYY-MM-DD",
    "time": "HH:mm",
    "attendees": 5,
    "type": "team | interview | hr | company"
  }
]
```

---

## Deploy to Netlify / Vercel

```bash
# Build
npm run build
# Output is in /dist

# Netlify
netlify deploy --prod --dir=dist

# Vercel
vercel --prod
```

For Netlify, add a `netlify.toml` at root to handle React Router:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Environment variables (production)

Set in your hosting dashboard:
```
VITE_API_URL=https://your-nestjs-backend.up.railway.app
```
