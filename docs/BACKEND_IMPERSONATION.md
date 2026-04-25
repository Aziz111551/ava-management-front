# Documentation Technique — Endpoint d’Impersonation

## Objectif
Permettre à un administrateur de se connecter temporairement en tant qu’un autre utilisateur (impersonation) pour des besoins de support ou de debug.

---

## 1. Route API

- **Méthode** : POST
- **URL** : `/api/impersonate/:userId`
- **Accès** : Réservé aux administrateurs

### Exemple de requête
```http
POST /api/impersonate/1234567890
Authorization: Bearer <admin_token>
```

### Corps de la requête
Aucun (le userId est dans l’URL).

---

## 2. Fonctionnement

1. **Vérification des droits**  
   Vérifier que l’utilisateur courant est administrateur.
2. **Vérification de l’utilisateur cible**  
   S’assurer que l’utilisateur à impersonate existe.
3. **Génération d’un token temporaire**  
   Générer un JWT (ou session) pour l’utilisateur cible, avec une information indiquant qu’il s’agit d’une session d’impersonation.
4. **Retourner le token**  
   Retourner le token au frontend.
5. **Audit**  
   Logger l’action d’impersonation (qui, qui est impersonné, quand).

---

## 3. Exemple d’implémentation (Node.js/Express + JWT)

```js
// Middleware pour vérifier l’admin
function isAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Forbidden' });
}

// Endpoint d’impersonation
app.post('/api/impersonate/:userId', isAdmin, async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Générer un token JWT pour l’utilisateur cible
  const token = jwt.sign(
    { id: user.id, role: user.role, impersonatedBy: req.user.id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Logger l’action
  await AuditLog.create({
    action: 'impersonate',
    adminId: req.user.id,
    targetUserId: user.id,
    date: new Date()
  });

  res.json({ token });
});
```

---

## 4. Sécurité

- Seuls les admins peuvent utiliser cette route.
- Le token généré doit contenir une information d’impersonation (`impersonatedBy`).
- Logger toutes les actions d’impersonation.

---

## 5. Utilisation côté frontend

Le frontend doit utiliser le token retourné pour authentifier les requêtes suivantes, comme s’il était l’utilisateur cible.

---

## 6. Exemple de payload JWT

```json
{
  "id": "1234567890",
  "role": "employee",
  "impersonatedBy": "adminId",
  "iat": 1714040000,
  "exp": 1714043600
}
```

---

**Remarque** :  
Adaptez les noms de modèles, la logique de vérification et le système de logs selon votre stack (NestJS, Django, etc.).
