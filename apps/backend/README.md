# Minik API (ASP.NET Core, .NET 10)

Clean architecture: `Domain` (entities) ← `Application` (use cases, ports, validation) ← `Infrastructure` (EF Core/Postgres)
← `Api` (controllers, auth, Problem Details). Contract: mobile repo `docs/API_CONTRACT.md`; OpenAPI at `/swagger/v1/swagger.json`.

```bash
cp src/Backend.Api/appsettings.Development.json.example src/Backend.Api/appsettings.Development.json
dotnet run --project src/Backend.Api            # migrates on startup when Database:MigrateOnStartup=true
pnpm db:migration <Name>                       # new migration after an entity change
pnpm db:update                                 # apply to ConnectionStrings:Default (appsettings.Development.json)
dotnet test Backend.slnx                        # Testcontainers (Docker API >= 1.44), or:
MINIK_TEST_POSTGRES="Host=localhost;Database=postgres;Username=me" dotnet test Backend.slnx
```

## Authorization model
- **Data access** = membership in `baby_caregivers` (`owner` > `caregiver` > `viewer`), checked on every `/v1/babies/{id}/…`.
  Non-members get 404. No Keycloak role grants access to baby data, admins included.
- **Admin** = client role `admin` on the API's own client (`resource_access.minik-api.roles`). Realm roles are ignored,
  so an admin of another app in the realm has no power here. Admin endpoints (`/v1/admin/…`) return aggregates only.

## Keycloak setup (once per realm)
1. **API client** `minik-api` (resource server): *Clients → Create*, OpenID Connect, Client authentication **off**,
   every flow **off** (Standard, Direct access, Implicit, Service accounts). It never logs anyone in; it only owns roles.
   *Roles* tab → create client role `admin`.
2. **Audience**: *Client scopes → Create* `minik-api-audience` (type Default, protocol OIDC) → *Mappers → By configuration →
   Audience*: Included Client Audience = `minik-api`, Add to access token **on**, Add to ID token **off**.
   Then *Clients → minik-mobile → Client scopes → Add client scope → minik-api-audience (Default)*.
   Set `Keycloak:Audience=minik-api` in the API (required; startup fails without it).
3. **Least privilege in tokens**: *Clients → minik-mobile → Client scopes → minik-mobile-dedicated → Scope* →
   Full scope allowed **off**, then *Assign role* → `minik-api` `admin`. Tokens for this app now carry only Minik roles.
4. **Assign via groups, not users**: *Groups → Create* `minik-admins` → *Role mapping → Assign role → Filter by clients →
   minik-api admin*. Add admin accounts to the group (*Users → … → Groups → Join group*).
5. **Harden admin accounts**: enforce 2FA for the group's members (*Users → Required actions → Configure OTP*, or a
   conditional-OTP browser flow on the `admin` role); keep access tokens short-lived (*Realm settings → Tokens*, 5 min).

Check a token at jwt.io: `aud` contains `minik-api`; admins have `"resource_access": {"minik-api": {"roles": ["admin"]}}`.
