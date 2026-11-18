import { NextRequest, NextResponse } from "next/server";
import { issueRewardCode } from "@/lib/promo/server";
import { finishGuestClaim } from "@/lib/auth/accounts";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import User from "@/lib/models/user.model";
import { connectToDB } from "@/lib/mongoose";

/**
 * The link from a confirmation letter. Two kinds of token arrive here:
 * a registration on an address that already had guest orders (the account
 * opens now, see lib/auth/accounts.ts), and the older plain verification.
 */
export async function POST(request: NextRequest) {
  try {
    const reqBody = await request.json().catch(() => ({}));
    const token = typeof reqBody?.token === "string" ? reqBody.token.trim() : "";
    if (!token || token.length > 200) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const account = await finishGuestClaim(token);
    if (account) {
      // The promised promo code; the account is open whether or not this letter goes out.
      try {
        const reward = await issueRewardCode("welcome", account._id);
        if (reward) await sendWelcomeEmail(account.email, reward.code, reward.percent);
      } catch (error: any) {
        console.error("[verifyemail] welcome letter:", error?.message ?? error);
      }
      return NextResponse.json({ message: "Email verified successfully", success: true });
    }

    await connectToDB();
    const result = await User.updateOne(
      { verifyToken: token, verifyTokenExpiry: { $gt: Date.now() } },
      { $set: { isVerfied: true }, $unset: { verifyToken: "", verifyTokenExpiry: "" } },
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    return NextResponse.json({ message: "Email verified successfully", success: true });
  } catch (error: any) {
    console.error("[verifyemail]", error?.message ?? error);
    return NextResponse.json({ error: "Could not verify the e-mail" }, { status: 500 });
  }
}
