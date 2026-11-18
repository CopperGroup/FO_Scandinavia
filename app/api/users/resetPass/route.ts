import { connectToDB } from "@/lib/mongoose";
import { NextRequest, NextResponse } from "next/server";
import User from "@/lib/models/user.model";
import { sendEmail } from "@/helpers/mailer";
import { EMAIL_COLLATION, looksLikeEmail, normalizeEmail } from "@/lib/auth/email";

export async function POST(request: NextRequest) {
  try {
    await connectToDB();

    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);

    if (!email || !looksLikeEmail(email)) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const savedUser = await User.findOne({ email }).collation(EMAIL_COLLATION).select("_id email").lean<{ _id: unknown; email: string }>();

    if (!savedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await sendEmail({ email: savedUser.email, emailType: "RESET", userId: savedUser._id });

    return NextResponse.json({ message: "Password reset email sent successfully", success: true });
  } catch (error: any) {
    console.error("[resetPass]", error?.message ?? error);
    return NextResponse.json({ error: "Could not send the e-mail" }, { status: 500 });
  }
}
