# auth-service

Responsible for identity, authentication, sessions, roles, access control, and identity events.

Authentication service built with NestJS, `@nestjs/microservices`, Prisma, PostgreSQL, JWT, and Argon2.

## Project Origin

This microservice is part of the [ecommerce-eda](https://github.com/SamuelB7/ecommerce-eda) event-driven marketplace platform.

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
