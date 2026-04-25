# Impersonation Backend API

Ce document décrit ce que le backend doit implémenter pour que le bouton **Impersonate user** du front fonctionne correctement (sans mode démo).

## Endpoint à implémenter

Le frontend tente les routes suivantes (dans cet ordre) :

1. `POST /api/auth/impersonate`
2. `POST /auth/impersonate`
3. `POST /api/admin/impersonate`

Recommandation: implémenter au minimum `POST /api/auth/impersonate`.

## Contrat API attendu

### Requête

`POST /api/auth/impersonate`

Headers:

- `Authorization: Bearer <admin_jwt>`
- `Content-Type: application/json`

Body:

```json
{
  "userId": "6907bfb60d458b4ab0e6892d61"
}
```

### Réponse succès (200)

```json
{
  "data": {
    "token": "jwt_de_l_utilisateur_cible",
    "user": {
      "_id": "6907bfb60d458b4ab0e6892d61",
      "name": "John Doe",
      "email": "john.doe@company.com",
      "role": "employee",
      "status": "active"
    }
  }
}
```

> Important: le front attend un token + un user.  
> Le token peut aussi s'appeler `accessToken` ou `jwt`, et le user peut aussi s'appeler `account` ou `profile`.

## Règles de sécurité recommandées

- Autoriser uniquement les admins à impersoner (`role=admin`).
- Interdire d'impersoner un autre admin (ou restreindre selon votre policy).
- Vérifier que l'utilisateur cible existe et est actif.
- Ajouter des claims dans le JWT d'impersonation:
  - `isImpersonation: true`
  - `impersonatedBy: <adminId>`
- Journaliser l'action (audit log): admin source, utilisateur cible, date, IP, user-agent.
- Définir une durée de vie courte du token d'impersonation (ex: 15-60 min).

## Codes d'erreur recommandés

- `401 Unauthorized`: token manquant/invalide.
- `403 Forbidden`: rôle non autorisé.
- `404 Not Found`: utilisateur cible introuvable.
- `409 Conflict`: impersonation interdite (ex: cible admin).
- `422 Unprocessable Entity`: body invalide (`userId` absent/mal formé).
- `500 Internal Server Error`: erreur inattendue.

Exemple d'erreur JSON:

```json
{
  "message": "Impersonation forbidden for this target user",
  "code": "IMPERSONATION_FORBIDDEN"
}
```

## Exemple d'implémentation NestJS (minimal)

```ts
// auth.controller.ts
import { Body, Controller, Post, Req, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

class ImpersonateDto {
  userId!: string;
}

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('impersonate')
  async impersonate(@Req() req: any, @Body() dto: ImpersonateDto) {
    const requester = req.user; // user injecté par le guard JWT
    if (requester?.role !== 'admin') {
      throw new ForbiddenException('Only admin can impersonate');
    }

    const target = await this.usersService.findById(dto.userId);
    if (!target) throw new NotFoundException('Target user not found');
    if (target.role === 'admin') {
      throw new ForbiddenException('Impersonating admin is not allowed');
    }

    const token = await this.authService.signAccessToken({
      sub: target._id,
      email: target.email,
      role: target.role,
      isImpersonation: true,
      impersonatedBy: requester.sub || requester._id,
    });

    return {
      data: {
        token,
        user: {
          _id: String(target._id),
          name: target.name,
          email: target.email,
          role: target.role,
          status: target.status,
        },
      },
    };
  }
}
```

## Compatibilité frontend actuelle

Le front lit cette réponse via `impersonateUserApi()` et fait:

1. sauvegarde snapshot admin côté front (pour revenir admin ensuite),
2. `login(nextUser, token)`,
3. redirection auto vers:
   - `/rh` si role = `rh`
   - `/admin-pro` si role = `admin`
   - `/employee` sinon.

## Checklist de validation rapide

- [ ] Appel `POST /api/auth/impersonate` retourne `200`.
- [ ] Le `token` JWT est valide et contient le rôle cible.
- [ ] Le front change bien d'utilisateur après clic.
- [ ] L'utilisateur impersoné accède seulement à ses routes autorisées.
- [ ] L'audit log enregistre l'action d'impersonation.
