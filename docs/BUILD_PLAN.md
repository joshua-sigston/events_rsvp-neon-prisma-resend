# RSVP App — Build Plan & Instructions

A step-by-step guide to building an event RSVP application with **Next.js**, **Neon + Neon Auth**, **Prisma**, **Resend**, **ShadCN UI**, and **React Hook Form + Zod**.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture](#2-architecture)
3. [Prerequisites](#3-prerequisites)
4. [Phase 0 — Project Setup](#4-phase-0--project-setup)
5. [Phase 1 — Database & Prisma](#5-phase-1--database--prisma)
6. [Phase 2 — Neon Auth](#6-phase-2--neon-auth)
7. [Phase 3 — Auth UI (Sign Up / Sign In)](#7-phase-3--auth-ui-sign-up--sign-in)
8. [Phase 4 — Host Features](#8-phase-4--host-features)
9. [Phase 5 — Public Guest RSVP](#9-phase-5--public-guest-rsvp)
10. [Phase 6 — Email (Resend)](#10-phase-6--email-resend)
11. [Phase 7 — Polish & Production](#11-phase-7--polish--production)
12. [File Structure Reference](#12-file-structure-reference)
13. [Environment Variables](#13-environment-variables)
14. [Security Checklist](#14-security-checklist)
15. [Testing Checklist](#15-testing-checklist)

---

## 1. Product Overview

### Users

| Actor | Authentication | Capabilities |
|-------|----------------|--------------|
| **Host** | Required (email/password or Google) | Create events, send RSVP invites, view responses |
| **Guest** | None | Open invite link, respond Yes / No / Maybe + headcount |

### Features

- **Account creation:** name, email, password, confirm password
- **Email verification** on sign-up (via Neon Auth)
- **Google OAuth** sign-in option
- **Events:** title, location, date/time, optional description
- **Invitations:** host sends email invites with a unique link
- **RSVP response:** attending status (Yes / No / Maybe) + number of people attending

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ Auth Pages  │  │  Dashboard   │  │  Public RSVP Page   │ │
│  │ (protected) │  │  (protected) │  │  /rsvp/[token]      │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘ │
│         │                │                      │           │
│         ▼                ▼                      ▼           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Server Actions + API Routes                ││
│  └────────────────────────┬────────────────────────────────┘│
└───────────────────────────┼─────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   ┌───────────┐     ┌─────────────┐    ┌──────────┐
   │ Neon Auth │     │ Neon Postgres│    │  Resend  │
   │ (users,   │     │ (events,     │    │ (invite  │
   │  sessions)│     │  invites,    │    │  emails) │
   │           │     │  responses)  │    │          │
   └───────────┘     └─────────────┘    └──────────┘
```

**Key separation:**

- **Neon Auth** manages users, sessions, email verification, and Google OAuth. Auth data lives in the `neon_auth` schema (managed by Neon — do not add these tables to your Prisma schema).
- **Prisma** manages app data: events, invitations, RSVP responses. Link app records to auth users via `hostId` (the Neon Auth `user.id` from the session).
- **Resend** sends RSVP invitation emails to guests.

---

## 3. Prerequisites

Before starting, create accounts and gather credentials for:

- [Neon](https://neon.tech) — Postgres database + Neon Auth
- [Resend](https://resend.com) — transactional email (verify a sending domain for production)
- [Google Cloud Console](https://console.cloud.google.com) — OAuth credentials (required for production Google sign-in)

**Local tools:**

- Node.js 20+
- npm or pnpm
- Git

---

## 4. Phase 0 — Project Setup

### 4.1 Scaffold Next.js

From the project root:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

When prompted, accept defaults. Use the existing directory if asked.

### 4.2 Install dependencies

```bash
# Database
npm install @prisma/client @neondatabase/serverless
npm install -D prisma

# Auth
npm install @neondatabase/auth@latest

# Email
npm install resend @react-email/components

# Forms & validation
npm install react-hook-form @hookform/resolvers zod

# Utilities
npm install date-fns
```

### 4.3 Initialize ShadCN UI

```bash
npx shadcn@latest init
```

Recommended options: New York style, Zinc base color, CSS variables enabled.

Add components as you build:

```bash
npx shadcn@latest add button input label form card select badge toast calendar popover textarea radio-group separator avatar dropdown-menu
```

### 4.4 Set up Neon (Console)

1. Create a new Neon project.
2. Copy the **connection string** (`DATABASE_URL`).
3. Go to **Project → Branch → Auth → Configuration**.
4. Enable Neon Auth and copy **Auth URL** → `NEON_AUTH_BASE_URL`.
5. Enable **Email/Password** sign-in.
6. Enable **Email verification** (code or link).
7. Enable **Google OAuth** (shared credentials work for dev; use your own for production).
8. Add **Trusted domains**: `http://localhost:3000` (and your production URL later).

Generate a cookie secret:

```bash
openssl rand -base64 32
```

### 4.5 Create environment file

Create `.env.local` at the project root (see [Section 13](#13-environment-variables) for the full list).

Add `.env.local` to `.gitignore` if not already present.

---

## 5. Phase 1 — Database & Prisma

### 5.1 Initialize Prisma

```bash
npx prisma init
```

### 5.2 Define schema

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum AttendanceStatus {
  ATTENDING
  NOT_ATTENDING
  MAYBE
}

model Event {
  id          String   @id @default(cuid())
  hostId      String
  title       String
  description String?
  location    String
  eventDate   DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  invitations Invitation[]

  @@index([hostId])
}

model Invitation {
  id         String    @id @default(cuid())
  eventId    String
  event      Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  guestEmail String
  guestName  String?
  token      String    @unique @default(cuid())
  sentAt     DateTime?
  createdAt  DateTime  @default(now())

  response RsvpResponse?

  @@unique([eventId, guestEmail])
  @@index([token])
}

model RsvpResponse {
  id           String           @id @default(cuid())
  invitationId String           @unique
  invitation   Invitation       @relation(fields: [invitationId], references: [id], onDelete: Cascade)
  status       AttendanceStatus
  guestCount   Int              @default(1)
  message      String?
  respondedAt  DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
}
```

### 5.3 Run migration

```bash
npx prisma migrate dev --name init
```

### 5.4 Create Prisma client (Neon serverless)

Create `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import { Pool } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  const adapter = new PrismaNeon(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

Install the Prisma Neon adapter if needed:

```bash
npm install @prisma/adapter-neon
```

---

## 6. Phase 2 — Neon Auth

### 6.1 Auth server instance

Create `src/lib/auth/server.ts`:

```typescript
import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
```

### 6.2 Auth API route

Create `src/app/api/auth/[...path]/route.ts`:

```typescript
import { auth } from "@/lib/auth/server";

export const { GET, POST } = auth.handler();
```

### 6.3 Auth client

Create `src/lib/auth/client.ts`:

```typescript
"use client";

import { createAuthClient } from "@neondatabase/auth/next";

export const authClient = createAuthClient();
```

### 6.4 Middleware (route protection)

Create `middleware.ts` at the project root (Next.js 15) or `proxy.ts` (Next.js 16):

```typescript
import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/events/:path*",
  ],
};
```

**Public routes (no middleware):** `/`, `/auth/*`, `/rsvp/*`

### 6.5 Session helper

Create `src/lib/auth/session.ts`:

```typescript
import { auth } from "@/lib/auth/server";

export async function requireAuth() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}
```

Use `requireAuth()` in every server action that modifies host data.

---

## 7. Phase 3 — Auth UI (Sign Up / Sign In)

### 7.1 Validation schemas

Create `src/lib/validations/auth.ts`:

```typescript
import { z } from "zod";

export const signUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
```

### 7.2 Auth server actions

Create `src/actions/auth.ts`:

```typescript
"use server";

import { auth } from "@/lib/auth/server";
import { signInSchema, signUpSchema } from "@/lib/validations/auth";
import { redirect } from "next/navigation";

export async function signUpAction(data: unknown) {
  const parsed = signUpSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password } = parsed.data;

  const { error } = await auth.signUp.email({ name, email, password });

  if (error) {
    return { error: { _form: [error.message ?? "Failed to create account"] } };
  }

  redirect("/auth/verify-email");
}

export async function signInAction(data: unknown) {
  const parsed = signInSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { error } = await auth.signIn.email(parsed.data);

  if (error) {
    return { error: { _form: [error.message ?? "Invalid credentials"] } };
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  await auth.signOut();
  redirect("/");
}
```

### 7.3 Sign-up page

Create `src/app/auth/sign-up/page.tsx`:

- Use ShadCN `Form` + React Hook Form + `signUpSchema` (zodResolver)
- Fields: name, email, password, confirm password
- Submit calls `signUpAction`
- Link to sign-in page
- Show form-level errors from server action

### 7.4 Sign-in page

Create `src/app/auth/sign-in/page.tsx`:

- Fields: email, password
- Submit calls `signInAction`
- **Google sign-in button** (see below)
- Link to sign-up page

### 7.5 Google OAuth button

Create `src/components/auth/google-sign-in-button.tsx`:

```typescript
"use client";

import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  async function handleGoogleSignIn() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}/dashboard`,
    });
  }

  return (
    <Button type="button" variant="outline" onClick={handleGoogleSignIn}>
      Continue with Google
    </Button>
  );
}
```

### 7.6 Verify email page

Create `src/app/auth/verify-email/page.tsx`:

- Explain that a verification email was sent
- Prompt user to check inbox (and spam)
- Link back to sign-in once verified

### 7.7 Auth layout (optional)

Create `src/app/auth/layout.tsx` with a centered card layout shared by sign-up and sign-in pages.

---

## 8. Phase 4 — Host Features

### 8.1 Event validation

Create `src/lib/validations/event.ts`:

```typescript
import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  location: z.string().min(1, "Location is required"),
  eventDate: z.coerce.date().refine((d) => d > new Date(), {
    message: "Event date must be in the future",
  }),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
```

Create `src/lib/validations/invitation.ts`:

```typescript
import { z } from "zod";

export const sendInvitesSchema = z.object({
  eventId: z.string(),
  guests: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
      })
    )
    .min(1, "Add at least one guest"),
});

export type SendInvitesInput = z.infer<typeof sendInvitesSchema>;
```

### 8.2 Event server actions

Create `src/actions/events.ts`:

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import { createEventSchema, type CreateEventInput } from "@/lib/validations/event";
import { sendInvitesSchema } from "@/lib/validations/invitation";
import { revalidatePath } from "next/cache";

export async function createEvent(data: CreateEventInput) {
  const session = await requireAuth();
  const parsed = createEventSchema.parse(data);

  const event = await prisma.event.create({
    data: {
      ...parsed,
      hostId: session.user.id,
    },
  });

  revalidatePath("/dashboard");
  return event;
}

export async function getHostEvents() {
  const session = await requireAuth();

  return prisma.event.findMany({
    where: { hostId: session.user.id },
    orderBy: { eventDate: "asc" },
    include: {
      invitations: {
        include: { response: true },
      },
    },
  });
}

export async function getEventById(eventId: string) {
  const session = await requireAuth();

  const event = await prisma.event.findFirst({
    where: { id: eventId, hostId: session.user.id },
    include: {
      invitations: {
        include: { response: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!event) throw new Error("Event not found");
  return event;
}
```

Wire up `sendInvitations` in Phase 6 after Resend is configured.

### 8.3 Dashboard page

Create `src/app/dashboard/page.tsx`:

- Server component: fetch `getHostEvents()`
- Show list of events with title, date, location
- Summary badges: total invited, responded, attending count
- "Create Event" button → `/events/new`
- Each event links to `/events/[id]`
- Sign-out button in header

### 8.4 Create event page

Create `src/app/events/new/page.tsx`:

- Client form with React Hook Form + `createEventSchema`
- Fields: title, description (optional), location, event date/time
- Use ShadCN Calendar + Popover for date picker
- On success, redirect to `/events/[id]`

### 8.5 Event detail page

Create `src/app/events/[id]/page.tsx`:

- Server component: fetch event with invitations and responses
- Display event details
- **Invite guests form:** email + optional name (support multiple guests)
- **Responses table:** guest email, status (Yes/No/Maybe), guest count, responded date
- Copy RSVP link per invitation (for manual sharing)

---

## 9. Phase 5 — Public Guest RSVP

### 9.1 RSVP validation

Create `src/lib/validations/rsvp.ts`:

```typescript
import { z } from "zod";

export const rsvpResponseSchema = z
  .object({
    status: z.enum(["ATTENDING", "NOT_ATTENDING", "MAYBE"]),
    guestCount: z.coerce.number().int().min(0).max(50),
    message: z.string().max(300).optional(),
  })
  .refine(
    (data) => {
      if (data.status === "NOT_ATTENDING") return data.guestCount === 0;
      return data.guestCount >= 1;
    },
    {
      message: "Guest count is required when attending or maybe",
      path: ["guestCount"],
    }
  );

export type RsvpResponseInput = z.infer<typeof rsvpResponseSchema>;
```

### 9.2 RSVP server actions

Create `src/actions/rsvp.ts`:

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { rsvpResponseSchema, type RsvpResponseInput } from "@/lib/validations/rsvp";

export async function getInvitationByToken(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      event: true,
      response: true,
    },
  });

  if (!invitation) return null;
  return invitation;
}

export async function submitRsvp(token: string, data: RsvpResponseInput) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    return { error: "Invalid or expired invitation link" };
  }

  const parsed = rsvpResponseSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { status, guestCount, message } = parsed.data;

  await prisma.rsvpResponse.upsert({
    where: { invitationId: invitation.id },
    create: {
      invitationId: invitation.id,
      status,
      guestCount: status === "NOT_ATTENDING" ? 0 : guestCount,
      message,
    },
    update: {
      status,
      guestCount: status === "NOT_ATTENDING" ? 0 : guestCount,
      message,
      respondedAt: new Date(),
    },
  });

  return { success: true };
}
```

### 9.3 Public RSVP page

Create `src/app/rsvp/[token]/page.tsx`:

- **No authentication required**
- Server component loads invitation by token
- If not found → friendly "Invalid link" message
- Show event: title, location, formatted date
- Client form (`RsvpForm` component):
  - Radio group: **Attending** / **Not Attending** / **Maybe**
  - Guest count (shown when Attending or Maybe; hidden or 0 when Not Attending)
  - Optional message textarea
- Pre-fill form if guest already responded (allow updates)
- Success toast/state after submit

Create `src/components/rsvp/rsvp-form.tsx` as a client component using React Hook Form + ShadCN.

---

## 10. Phase 6 — Email (Resend)

### 10.1 Resend client

Create `src/lib/resend.ts`:

```typescript
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);
```

### 10.2 Invite email template

Create `src/emails/rsvp-invite.tsx`:

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

interface RsvpInviteEmailProps {
  guestName?: string;
  eventTitle: string;
  eventLocation: string;
  eventDate: string;
  rsvpUrl: string;
  hostName?: string;
}

export function RsvpInviteEmail({
  guestName,
  eventTitle,
  eventLocation,
  eventDate,
  rsvpUrl,
  hostName,
}: RsvpInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You&apos;re invited to {eventTitle}</Preview>
      <Body>
        <Container>
          <Heading>You&apos;re invited!</Heading>
          <Text>
            Hi{guestName ? ` ${guestName}` : ""},
            {hostName ? ` ${hostName} has` : " You've been"} invited you to:
          </Text>
          <Heading as="h2">{eventTitle}</Heading>
          <Text>{eventLocation}</Text>
          <Text>{eventDate}</Text>
          <Button href={rsvpUrl}>RSVP Now</Button>
        </Container>
      </Body>
    </Html>
  );
}
```

### 10.3 Send invitations action

Add to `src/actions/events.ts`:

```typescript
import { resend } from "@/lib/resend";
import { RsvpInviteEmail } from "@/emails/rsvp-invite";
import { format } from "date-fns";

export async function sendInvitations(input: unknown) {
  const session = await requireAuth();
  const parsed = sendInvitesSchema.parse(input);

  const event = await prisma.event.findFirst({
    where: { id: parsed.eventId, hostId: session.user.id },
  });

  if (!event) throw new Error("Event not found");

  for (const guest of parsed.guests) {
    const invitation = await prisma.invitation.upsert({
      where: {
        eventId_guestEmail: {
          eventId: event.id,
          guestEmail: guest.email,
        },
      },
      create: {
        eventId: event.id,
        guestEmail: guest.email,
        guestName: guest.name,
      },
      update: {
        guestName: guest.name ?? undefined,
      },
    });

    const rsvpUrl = `${process.env.NEXT_PUBLIC_APP_URL}/rsvp/${invitation.token}`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: guest.email,
      subject: `You're invited: ${event.title}`,
      react: RsvpInviteEmail({
        guestName: guest.name,
        eventTitle: event.title,
        eventLocation: event.location,
        eventDate: format(event.eventDate, "PPP 'at' p"),
        rsvpUrl,
        hostName: session.user.name ?? undefined,
      }),
    });

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { sentAt: new Date() },
    });
  }

  revalidatePath(`/events/${event.id}`);
  return { success: true };
}
```

### 10.4 Resend setup

1. Create a Resend account and API key.
2. For development: use Resend's test domain (`onboarding@resend.dev`) — emails only deliver to your verified Resend account email.
3. For production: verify your domain in Resend and set `RESEND_FROM_EMAIL` to an address on that domain.

---

## 11. Phase 7 — Polish & Production

### 11.1 Landing page

Create `src/app/page.tsx`:

- Hero explaining the product
- CTA: "Get Started" → sign-up, "Sign In" → sign-in
- If logged in, redirect to dashboard

### 11.2 App layout & navigation

Create a shared header component:

- Logo / app name
- Nav links (Dashboard) when authenticated
- User menu with sign-out

Wrap authenticated pages in a consistent layout.

### 11.3 Loading & error states

- Add `loading.tsx` for dashboard and event pages
- Add `not-found.tsx` for invalid event IDs
- Use ShadCN toast for success/error feedback on forms

### 11.4 Production — Neon Auth checklist

Before deploying:

- [ ] Add production domain to Neon Auth **trusted domains**
- [ ] Configure **custom email provider** (Resend SMTP) for auth verification emails
- [ ] Set up **your own Google OAuth credentials** (replace shared dev credentials)
- [ ] Set strong `NEON_AUTH_COOKIE_SECRET` in production env
- [ ] Enable HTTPS (required for auth cookies)

References:

- [Neon Auth production checklist](https://neon.com/docs/auth/production-checklist)
- [Neon Auth OAuth setup](https://neon.com/docs/auth/guides/setup-oauth)

### 11.5 Deploy

Recommended: **Vercel**

1. Push repo to GitHub
2. Import project in Vercel
3. Add all environment variables
4. Deploy
5. Update Neon Auth trusted domains and OAuth redirect URIs with production URL

---

## 12. File Structure Reference

```
src/
├── app/
│   ├── page.tsx                         # Landing
│   ├── layout.tsx                       # Root layout
│   ├── auth/
│   │   ├── layout.tsx
│   │   ├── sign-up/page.tsx
│   │   ├── sign-in/page.tsx
│   │   └── verify-email/page.tsx
│   ├── dashboard/page.tsx
│   ├── events/
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── rsvp/
│   │   └── [token]/page.tsx             # Public — no auth
│   └── api/
│       └── auth/[...path]/route.ts
├── actions/
│   ├── auth.ts
│   ├── events.ts
│   └── rsvp.ts
├── components/
│   ├── auth/
│   │   ├── sign-up-form.tsx
│   │   ├── sign-in-form.tsx
│   │   └── google-sign-in-button.tsx
│   ├── events/
│   │   ├── event-form.tsx
│   │   ├── invite-form.tsx
│   │   └── responses-table.tsx
│   ├── rsvp/
│   │   └── rsvp-form.tsx
│   ├── layout/
│   │   └── app-header.tsx
│   └── ui/                              # ShadCN components
├── emails/
│   └── rsvp-invite.tsx
├── lib/
│   ├── auth/
│   │   ├── server.ts
│   │   ├── client.ts
│   │   └── session.ts
│   ├── prisma.ts
│   ├── resend.ts
│   └── validations/
│       ├── auth.ts
│       ├── event.ts
│       ├── invitation.ts
│       └── rsvp.ts
├── middleware.ts
prisma/
├── schema.prisma
└── migrations/
docs/
└── BUILD_PLAN.md                        # This file
.env.local                               # Not committed
.env.example                             # Committed template
```

---

## 13. Environment Variables

Create `.env.example` (committed) and copy to `.env.local` (not committed):

```bash
# Database
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

# Neon Auth
NEON_AUTH_BASE_URL="https://ep-xxx.neonauth.region.aws.neon.tech/neondb/auth"
NEON_AUTH_COOKIE_SECRET=""   # openssl rand -base64 32

# Resend
RESEND_API_KEY="re_xxxxxxxx"
RESEND_FROM_EMAIL="RSVP App <noreply@yourdomain.com>"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 14. Security Checklist

- [ ] Always use `requireAuth()` and verify `hostId` matches session user on host actions
- [ ] Never expose invitation tokens in API responses to unauthenticated host routes unnecessarily
- [ ] Public RSVP uses opaque `token` (cuid) — not sequential IDs
- [ ] Validate all input with Zod on the server (never trust client-only validation)
- [ ] Keep `.env.local` out of version control
- [ ] Require email verification before allowing event creation (check `session.user.emailVerified`)
- [ ] Use HTTPS in production

---

## 15. Testing Checklist

### Auth
- [ ] Sign up with name, email, password, confirm password
- [ ] Password mismatch shows validation error
- [ ] Verification email received; unverified user cannot access dashboard
- [ ] Sign in with verified account
- [ ] Google sign-in works
- [ ] Sign out clears session

### Host
- [ ] Create event with title, location, future date
- [ ] Dashboard lists events
- [ ] Send invitation email to guest
- [ ] Event detail shows response summary

### Guest (no account)
- [ ] Open RSVP link from email
- [ ] Submit Attending with guest count
- [ ] Submit Not Attending (guest count = 0)
- [ ] Submit Maybe with guest count
- [ ] Update existing response via same link
- [ ] Invalid token shows error page

### Email
- [ ] Invitation email renders correctly
- [ ] RSVP link in email works

---

## Build Order Summary

| Phase | Focus | Outcome |
|-------|-------|---------|
| 0 | Setup | Next.js, deps, ShadCN, Neon project |
| 1 | Database | Prisma schema, migrations, client |
| 2 | Auth infra | Neon Auth server/client, middleware, API route |
| 3 | Auth UI | Sign up, sign in, Google, verify email |
| 4 | Host features | Dashboard, create event, event detail |
| 5 | Guest RSVP | Public `/rsvp/[token]` page |
| 6 | Email | Resend invite emails |
| 7 | Polish | Landing, nav, production config, deploy |

Work through phases in order. Each phase builds on the previous one. Run `npm run dev` after Phase 2 to verify auth, then continue adding features incrementally.

---

## Useful Links

- [Neon Auth — Next.js quick start](https://neon.com/docs/auth/quick-start/nextjs-api-only)
- [Neon Auth — OAuth setup](https://neon.com/docs/auth/guides/setup-oauth)
- [Neon Auth — Email verification](https://neon.com/docs/auth/guides/email-verification)
- [Prisma + Neon serverless](https://www.prisma.io/docs/guides/database/neon)
- [Resend — Next.js guide](https://resend.com/docs/send-with-nextjs)
- [ShadCN UI](https://ui.shadcn.com)
- [React Hook Form + Zod](https://ui.shadcn.com/docs/components/form)
