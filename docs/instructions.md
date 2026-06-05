# Events RSVP App

An event RSVP application built with Next.js, Neon (Postgres + Auth), Prisma, Resend, ShadCN UI, and React Hook Form with Zod.

## Features

- Host accounts with email/password or Google sign-in
- Email verification on registration
- Create events with location and date
- Send RSVP invitations via email
- Guests respond without creating an account (Yes / No / Maybe + headcount)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| Database | Neon Postgres |
| Auth | Neon Auth (Better Auth) |
| ORM | Prisma |
| Email | Resend |
| UI | ShadCN UI + Tailwind CSS |
| Forms | React Hook Form + Zod |

## Getting Started

See the full build plan and step-by-step instructions:

**[docs/BUILD_PLAN.md](./docs/BUILD_PLAN.md)**

Quick start:

1. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in values from [Neon Console](https://console.neon.tech) and [Resend](https://resend.com).
3. Follow **Phase 0** through **Phase 7** in the build plan.

## Documentation

- [Build Plan & Instructions](./docs/BUILD_PLAN.md) — complete architecture, schema, code samples, and phased build guide
