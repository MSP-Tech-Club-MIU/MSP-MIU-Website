# MSP-MIU Website Documentation

Official documentation for the MSP Tech Club MIU platform: public website, admin CMS, competitions/quizzes, and Capacitor mobile apps.

Live site: [https://msp-miu.tech](https://msp-miu.tech)  
Interactive API: [/api/docs](http://localhost:3000/api/docs) (when the server is running)

## Reading order

### New developers

1. [Setup](./setup.md) — install, database, run locally
2. [Architecture](./architecture.md) — monorepo layout and request flow
3. [Environment](./environment.md) — required and optional env vars
4. [Auth & roles](./auth-and-roles.md) — JWT, roles, admin and judging gates
5. [Data model](./data-model.md) — Sequelize models and relationships
6. [Frontend](./frontend.md) — React routes, ApiService, season context

### Feature deep-dives

- [Seasons](./seasons.md)
- [Competitions & quizzes](./competitions-and-quizzes.md)
- [CMS & site content](./cms-and-site-content.md)
- [Deployment](./deployment.md)
- [Mobile (Capacitor)](./mobile-capacitor.md)
- [Scripts & ops](./scripts-and-ops.md)

### API

- [API overview](./api/README.md) — auth header, Swagger usage
- OpenAPI source: [`openapi.yaml`](./openapi.yaml)
- Swagger UI: `GET /api/docs` · JSON: `GET /api/docs.json`

### Admin / CMS users

- [Admin guide index](./admin-guide/README.md)

## Related root files

| File | Purpose |
|------|---------|
| [README.md](../README.md) | Project hub and quick start |
| [SECURITY.md](../SECURITY.md) | Security policy |
| [.env.example](../.env.example) | Environment template |
