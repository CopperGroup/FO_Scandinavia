import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { generatePromoCode } from "@/lib/actions/promocode.actions";
import { cancelGuestClaim, createAccount, findAccountForSignup, startGuestClaim } from "@/lib/auth/accounts";
import { sendAccountConfirmationEmail } from "@/lib/email/confirm-account";
import { looksLikeEmail, normalizeEmail } from "@/lib/auth/email";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body?.username ?? "").trim().slice(0, 120);
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";
    const phoneNumber = String(body?.phoneNumber ?? "").trim().slice(0, 40);

    if (!looksLikeEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 422 });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 422 });
    }

    const existingUser = await findAccountForSignup(email);
    if (existingUser && !existingUser.selfCreated) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    // The address already has orders made without an account. The record holds a name, a
    // phone, an address and those orders, so it is handed over only to whoever can open
    // the mailbox: the registration waits for the link in the letter.
    if (existingUser) {
      const claim = await startGuestClaim({ username, email, password: hashedPassword, phoneNumber });
      if (claim.status === "started") {
        try {
          await sendAccountConfirmationEmail(email, claim.token);
        } catch (error: any) {
          console.error("[signup] confirmation letter:", error?.message ?? error);
          await cancelGuestClaim(email);
          return NextResponse.json({ error: "Could not send the confirmation e-mail", code: "EMAIL_FAILED" }, { status: 502 });
        }
      }
      if (claim.status !== "no-guest") {
        return NextResponse.json({ message: "Confirm the e-mail to finish", success: true, confirmEmail: true });
      }
      // The record stopped being a guest between the two reads: someone else finished first.
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const promoCode = await generatePromoCode({
      email,
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, ""),
      reusabilityTimes: 1,
      discountPercentage: 10,
    });

    const savedUser = await createAccount({ username, email, password: hashedPassword, phoneNumber, promoCode });
    await sendWelcomeEmail(email, promoCode);

    if (!savedUser) {
      return NextResponse.json({ error: "Saved user not found" }, { status: 500 });
    }

    // Only the id and the address go back: never the password hash.
    return NextResponse.json({ message: "User created successfully", success: true, savedUser });
  } catch (error: any) {
    console.error("[signup]", error?.message ?? error);
    return NextResponse.json({ error: "Could not create the account" }, { status: 500 });
  }
}
