# NestJS — snippet : création employé + `temporaryPassword`

À coller / adapter dans **ton repo API** (pas dans ce dépôt front).  
Objectif : après `POST /rh/employees`, la réponse JSON contient **`temporaryPassword`** une seule fois, pour que le mail Resend (Netlify) affiche le mot de passe.

---

## Principe

1. Générer une chaîne aléatoire (ex. 10 caractères).
2. **Hasher** avec `bcrypt` (ou `argon2`) et enregistrer dans le champ `password` du user.
3. Retourner l’employé sérialisé **+** `temporaryPassword` en clair **uniquement** dans la réponse de création.
4. Sur `GET /rh/employees`, **ne jamais** exposer `password` ni `temporaryPassword`.

---

## Dépendances

```bash
npm i bcrypt
npm i -D @types/bcrypt
```

---

## Utilitaire mot de passe

```ts
import * as crypto from 'crypto'

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

export function generateTemporaryPassword(length = 10): string {
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += CHARSET[bytes[i] % CHARSET.length]
  }
  return out
}
```

---

## Service (exemple)

```ts
import * as bcrypt from 'bcrypt'
import { generateTemporaryPassword } from './password.util'

async createEmployee(dto: CreateEmployeeDto) {
  const plain = generateTemporaryPassword(10)
  const passwordHash = await bcrypt.hash(plain, 10)

  const user = await this.userModel.create({
    name: dto.name,
    email: dto.email.toLowerCase(),
    department: dto.department,
    employeeType: dto.employeeType,
    role: dto.role,
    status: dto.status ?? 'active',
    joinDate: dto.joinDate,
    password: passwordHash,
    mustChangePassword: true,
  })

  const doc = user.toObject()
  delete doc.password

  return {
    ...doc,
    _id: doc._id.toString(),
    id: doc._id.toString(),
    temporaryPassword: plain,
    mustChangePassword: true,
  }
}
```

---

## DTO entrée (`CreateEmployeeDto`)

- Utiliser `class-validator` : **ne pas** inclure `password` dans le DTO (le front ne l’envoie pas).
- `@IsOptional()` sur les champs optionnels pour éviter les rejets inutiles.

---

## Contrôleur

```ts
@Post('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('rh')
async create(@Body() dto: CreateEmployeeDto) {
  return this.rhService.createEmployee(dto)
}
```

---

## Sérialisation `GET` (liste)

- Soit un **schema Mongoose** avec `select: false` sur `password`.
- Soit un **mapper** qui supprime `password` avant chaque réponse liste / détail public.

---

## Vérification rapide

Après déploiement Railway :

```bash
curl -sS -X POST "https://TON_API/rh/employees" \
  -H "Authorization: Bearer TOKEN_RH" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","department":"IT","employeeType":"Developer","role":"employee","status":"active"}' | jq .
```

Tu dois voir **`temporaryPassword`** dans le JSON. Le front enverra alors le mail avec le MDP.

---

## Voir aussi

- [`BACKEND_EMPLOYEE_WELCOME.md`](./BACKEND_EMPLOYEE_WELCOME.md)
- [`BACKEND_RH_EMPLOYEES.md`](./BACKEND_RH_EMPLOYEES.md)
