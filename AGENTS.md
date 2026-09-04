# Project Context

## What this repository is

A single authentication slice, built for Assessment 1 of a product engineering bootcamp.
The full brief is at `docs/assessment-1-brief.md`. Read it before starting any task.

This is **not** an application. It is one flow, built properly, with nothing around it.
Anything outside the brief is a liability, not a bonus.

## Stack

- Next.js (App Router)
- Prisma
- PostgreSQL
- TypeScript

Do not introduce new frameworks, ORMs, or auth libraries. Do not suggest NextAuth,
Clerk, Auth0, or similar — this assessment exists to build authentication by hand.

## Hard rules

1. **Never create, write to, or modify `.env`.** I write environment variables by hand.
   You may edit `.env.example` with commented placeholders only.
2. **Never put a secret, key, or credential in a source file.**
3. **Do not build anything in the "Do not build" list** in the brief. No landing page,
   no marketing page, no dashboard features, no profile editing, no settings, no social
   sign-in, no two-factor. The dashboard is one line of text and a sign out button.
4. **One step at a time.** Complete the single step I asked for, then stop and explain
   what you did. Do not proceed to the next step unprompted.
5. **Small commits.** Each step is its own commit. The submission checklist requires
   incremental commit history, so a single large commit fails.
6. **No placeholder or fake data anywhere.** Empty states must be genuine.

## Decisions already made — do not change these without asking

- **Passwords**: bcrypt, cost factor 12. Not SHA-256 (too fast for low-entropy secrets),
  not Argon2 (defensible, but bcrypt is better supported here and easier to reason about).
- **Session tokens and password reset tokens**: 32 random bytes, stored as a SHA-256 hash.
  A fast hash is correct here because the token is high-entropy and infeasible to brute
  force, so bcrypt's cost would buy nothing per request.
- **Verification codes**: six digits, stored in plaintext. Hashing a six-digit code is
  security theatre — a million candidates can be enumerated instantly. Protection comes
  from short expiry, an attempts cap, and rate limiting.
- **Sessions, not JWTs**: an opaque token in an httpOnly cookie, with the session row in
  the database. Chosen because sign out must genuinely end the session, which a stateless
  JWT cannot do before its expiry.
- **Nullable timestamps, not booleans**: `emailVerifiedAt`, `consumedAt`. Same storage
  cost, and they record when as well as whether.
- **Single-use tokens are consumed with an atomic conditional update**
  (`updateMany` with `where: { id, consumedAt: null }`, then check the returned count).
  Never read-then-write — two concurrent requests would both pass the check.
- **Resend cooldown is derived** from the newest `VerificationCode.createdAt` for that
  user. No `lastSentAt` column; one source of truth.
- **Email is normalised** (lowercased and trimmed) in the shared validation schema before
  it reaches the unique constraint.
- **Email delivery** goes through a single `sendEmail()` function that currently logs to
  the console, so swapping in a real provider is a one-file change.

## Build order

Work through these in sequence. Do not skip ahead.

1. Prisma schema and first migration
2. Shared validation schemas, declared once and imported by both client and server
3. Password hashing helper
4. Signup endpoint, made idempotent via the unique email constraint
5. `sendEmail()` stub, then email verification with database expiry and server-side
   resend cooldown
6. Signin, session creation, protected route handling
7. Forgot password and reset password, with single-use time-limited tokens
8. Rate limiting on signin, signup, reset request, and resend
9. Accessibility pass: labels programmatically bound to inputs, visible focus states
10. Evidence capture, then `DOCUMENTATION.md`, then the LinkedIn post

## How to help me

I have to defend every line of this out loud to a reviewer, and answer questions like
"show me the exact line where the session is created and tell me what is inside the
cookie." So:

- Explain the reasoning behind what you write, briefly, as you write it.
- When there was a real alternative, name it and say why you did not take it.
- If I ask you to do something that contradicts the brief, say so instead of complying.
- Do not add error handling, abstraction, or features I did not ask for.
