import { connectToDB } from "@/lib/mongoose";
import { NextRequest, NextResponse } from "next/server";
import User from "@/lib/models/user.model";
import bcryptjs from "bcryptjs";

const MIN_PASSWORD_LENGTH = 8;

/** Sets a new password from a reset link. Changes the password and nothing else. */
export async function POST(request: NextRequest) {
  try {
    await connectToDB();

    const reqBody = await request.json().catch(() => ({}));
    const token = typeof reqBody?.token === "string" ? reqBody.token : "";
    const password = typeof reqBody?.password === "string" ? reqBody.password : "";

    if (!token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 });
    }

    const user = await User.findOne({ forgotPasswordToken: token, forgotPasswordTokenExpiry: { $gt: Date.now() } }).select("_id");

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    // The role is never touched here. (It used to be set to "Admin", so every
    // password reset made the account an administrator.)
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword }, $unset: { forgotPasswordToken: "", forgotPasswordTokenExpiry: "" } },
    );

    return NextResponse.json({ message: "Password was changed successfully", success: true });
  } catch (error: any) {
    console.error("[newPass]", error?.message ?? error);
    return NextResponse.json({ error: "Could not change the password" }, { status: 500 });
  }
}
