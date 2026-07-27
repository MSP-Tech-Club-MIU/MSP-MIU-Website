# MSP-MIU-Website

Official **MSP Tech Club MIU** platform: public website, season-scoped CMS, membership/applications, events, competitions & quizzes, admin dashboard, and Capacitor Android/iOS apps.

Live site: [https://msp-miu.tech](https://msp-miu.tech)

## Built with

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Sequelize](https://img.shields.io/badge/Sequelize-6-52B0E7?style=for-the-badge&logo=sequelize&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=json-web-tokens&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-7-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)

| Layer | Stack |
|-------|--------|
| Frontend | React 18, Vite, React Router, Framer Motion, **fetch** (`ApiService`), Capacitor |
| Backend | Node.js, Express, Sequelize, MySQL, JWT, bcrypt, Multer, Nodemailer, Cloudflare R2 |

## Documentation

Full docs live in **[`docs/`](docs/README.md)**:

| Audience | Start here |
|----------|------------|
| Developers | [Setup](docs/setup.md) · [Architecture](docs/architecture.md) · [Auth](docs/auth-and-roles.md) |
| API | [API overview](docs/api/README.md) · Swagger UI **`/api/docs`** · [openapi.yaml](docs/openapi.yaml) |
| Admins / CMS | [Admin guide](docs/admin-guide/README.md) |

Also: [Environment](docs/environment.md) · [Security](SECURITY.md) · [Deployment](docs/deployment.md) · [Mobile](docs/mobile-capacitor.md)

## Quick start

```bash
npm run install:all
cp .env.example .env   # fill DB_*, JWT_SECRET, MAIL_*, URLs
npm run dev            # API + Vite client
```

Production-style:

```bash
npm run build
npm start              # serves API + client/public
```

See [docs/setup.md](docs/setup.md) for MySQL, patches, and verification (including Swagger at `http://localhost:3000/api/docs`).

## Repository layout

```
├── app.js              # Entry: /api, Swagger, SPA, quiz auto-submit
├── client/             # React + Vite + Capacitor
├── server/             # Express API (routes, models, services)
├── docs/               # Markdown docs + OpenAPI
└── package.json        # Workspaces: client + server
```

## Screenshots

### Landing page

![Landing page screenshot](client/src/assets/Images/MSP-MIU%20Website%20(1).png)

### Events page

![Events page screenshot](client/src/assets/Images/MSP-MIU%20Website%20(2).png)

### Download Android App

![Download Android App screenshot](client/src/assets/Images/MSP-MIU%20Website%20(4).png)

## License / contact

MSP Tech Club — Misr International University.  
Repository: [MSP-Tech-Club-MIU/MSP-MIU-Website](https://github.com/MSP-Tech-Club-MIU/MSP-MIU-Website)
