import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signinSchema } from "@/lib/validation/schemas";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const INVALID_CREDENTIALS_BODY = { error: "Invalid email or password" };
const INVALID_CREDENTIALS_STATUS = 401;

// A syntactically valid bcrypt hash of a fixed placeholder that nobody's
// real password will ever match. Compared against when no user exists, so
// bcrypt.compare() runs the same expensive work whether the email is
// registered or not. Without this, "no such user" would return almost
// instantly while "wrong password for a real user" takes the ~600ms a
// cost-12 bcrypt compare takes - a timing side channel that leaks exactly
// what the identical response body is trying to hide.
const DUMMY_PASSWORD_HASH = "$2b$12$uzTA3Kbi5totWuLRgKbZsOXSywg1nnDDqh2M0YiZqv0/LDDBSKEO2";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = signinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  const passwordValid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  // Wrong email and wrong password produce the exact same body, status, and
  // (via the dummy hash above) comparable timing - an attacker submitting
  // guesses learns nothing about which addresses have accounts.
  if (!user || !passwordValid) {
    return NextResponse.json(INVALID_CREDENTIALS_BODY, { status: INVALID_CREDENTIALS_STATUS });
  }

  if (!user.emailVerifiedAt) {
    // Deliberately a different, more specific response than the block
    // above: at this point the credentials have already proven the account
    // exists and belongs to whoever is asking, so there is nothing left to
    // protect by staying vague - and telling them to verify is the correct
    // next step.
    return NextResponse.json({ error: "Please verify your email before signing in" }, { status: 403 });
  }

  await createSession(user.id);

  return NextResponse.json({ message: "Signed in." }, { status: 200 });
}
