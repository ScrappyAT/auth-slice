import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";

export const CODE_EXPIRY_MINUTES = 10;

// Math.random() is not cryptographically secure: V8 seeds it from an
// internal xorshift128+ state that can be reconstructed from a handful of
// observed outputs, and there are public tools that do exactly this. A
// six-digit code only has 1,000,000 possibilities to start with; if the
// generator itself is predictable, an attacker doesn't need to brute force
// past the resend cooldown and attempts cap - they can predict the next
// code directly. randomInt() draws from the OS's CSPRNG, which has no such
// shortcut.
function generateSixDigitCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function createVerificationCode(userId: string) {
  const code = generateSixDigitCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

  return prisma.verificationCode.create({
    data: { userId, code, expiresAt },
  });
}
