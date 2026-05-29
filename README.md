# auth-service

Auth service em NestJS com `@nestjs/microservices`, Prisma, PostgreSQL, JWT e Argon2.

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

## Topico demo

- `auth.demo.event.v1`

## Eventos gravados em outbox

- `auth.user.registered.v1`
- `auth.user.password_changed.v1`
