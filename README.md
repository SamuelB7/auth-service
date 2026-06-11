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
- `POST /auth/customers/signup`
- `POST /auth/sellers/signup`
- `POST /auth/signin`
- `POST /auth/refresh`
- `POST /auth/signout`
- `GET /auth/sessions`
- `DELETE /auth/sessions/:sessionId`
- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`
- `POST /auth/change-password`
- `POST /auth/mfa/enroll`
- `POST /auth/mfa/verify-enrollment`
- `POST /auth/mfa/verify-signin`
- `POST /auth/mfa/disable`
- `GET /auth/users/:userId/roles`
- `PUT /auth/users/:userId/roles`
- `POST /auth/account/deactivate`
- `POST /auth/account/deletion-request`

## Prisma

```bash
npm run prisma:generate
npm run prisma:migrate:dev
```

## Demo Topic

- `auth.demo.event.v1`

## Events Stored In Outbox

- `auth.user.registered.v1`
- `auth.user.password_reset_requested.v1`
- `auth.user.password_changed.v1`
- `auth.mfa.enrollment_requested.v1`
- `auth.mfa.enabled.v1`
- `auth.mfa.challenge_requested.v1`
- `auth.mfa.disabled.v1`
- `auth.user.roles_changed.v1`
- `auth.user.deactivated.v1`
- `auth.user.deletion_requested.v1`
