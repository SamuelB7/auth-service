# auth-service

Authentication service built with NestJS, `@nestjs/microservices`, Prisma, PostgreSQL, JWT, and Argon2.

## Environment

Use `.env.example` as the reference for the local development environment variables.

## Endpoints

- `GET /health`
- `POST /events/demo`
- `POST /auth/signup`
- `POST /auth/signin`
- `POST /auth/refresh`
- `POST /auth/signout`
- `POST /auth/change-password`

## Prisma

```bash
npm run prisma:generate
npm run prisma:migrate:dev
```

## Demo Topic

- `auth.demo.event.v1`

## Events Stored In Outbox

- `auth.user.registered.v1`
- `auth.user.password_changed.v1`
