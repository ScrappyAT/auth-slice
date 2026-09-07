import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCodeSchema } from "@/lib/validation/schemas";
import { verifyCode } from "@/lib/auth/codes";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = verifyCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, code } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Same generic response as a wrong or expired code, not a distinct
    // "no such account" message - this endpoint has no reason to confirm
    // or deny that an email is registered.
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  const result = await verifyCode(user.id, code);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  // No session is created here - that is step 6/7's job. This endpoint's
  // only responsibility is moving emailVerifiedAt from null to a timestamp.
  return NextResponse.json({ message: "Email verified." }, { status: 200 });
}
