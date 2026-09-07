import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validation/schemas";
import { hashPassword } from "@/lib/auth/password";

// Every successful call to this endpoint gets this exact body and status,
// whether this specific request is the one that inserted the row or the
// email already had an account. A signup endpoint that answers
// differently for "new" vs "taken" lets an attacker enumerate which
// addresses have accounts just by submitting them here.
const SUCCESS_BODY = { message: "Account created." };
const SUCCESS_STATUS = 201;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, password, name } = parsed.data;

  // Hashed unconditionally, before any existence check, and there is no
  // existence check: this goes straight to the insert attempt. Checking
  // "does this email exist" first would be a read-then-write race - two
  // concurrent requests for the same email could both see "no existing
  // user" and both proceed. It would also make the duplicate-email path
  // skip the (comparatively expensive) hash, which is a timing signal an
  // attacker could use to distinguish "taken" from "new" without needing
  // the response body to say so.
  const passwordHash = await hashPassword(password);

  try {
    await prisma.user.create({
      data: { email, passwordHash, name },
    });
  } catch (error) {
    // P2002 = unique constraint violation on User.email. Under real
    // concurrency, two requests for the same email both pass this point
    // and both attempt the insert; the database's @unique constraint is
    // what actually stops the second one, not application logic. This
    // catch only turns that rejection into the same response a first
    // success returns instead of a 500 - it must not touch the existing
    // row, so there is no update here, only a swallowed error.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(SUCCESS_BODY, { status: SUCCESS_STATUS });
    }
    throw error;
  }

  return NextResponse.json(SUCCESS_BODY, { status: SUCCESS_STATUS });
}
