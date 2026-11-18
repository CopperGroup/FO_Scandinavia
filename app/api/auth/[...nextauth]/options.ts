import { connectToDB } from "@/lib/mongoose";
import User from "@/lib/models/user.model";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { NextAuthOptions } from "next-auth";
import { EMAIL_COLLATION, normalizeEmail } from "@/lib/auth/email";

type AccountRow = { _id: unknown; email: string; name?: string; username?: string; role?: string };

/** One indexed, case-insensitive lookup. */
async function findAccount(email: string, withPassword = false) {
  await connectToDB();
  return User.findOne({ email: normalizeEmail(email) })
    .collation(EMAIL_COLLATION)
    .select(`_id email name username role isVerfied${withPassword ? " password" : ""}`)
    .lean<AccountRow & { isVerfied?: boolean; password?: string }>();
}

export const options: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLEPROVIDER_CLIENTID as string,
      clientSecret: process.env.GOOGLEPROVIDER_CLIENTSECRET ? process.env.GOOGLEPROVIDER_CLIENTSECRET : '',
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {},

      async authorize(credentials) {
        const { email, password }: any = credentials ?? {};
        if (!email || !password) return null;

        try {
          const user = await findAccount(String(email), true);

          if (!user || user.isVerfied === false || !user.password) {
            return null;
          }

          const passwordsMatch = await bcrypt.compare(String(password), user.password).catch(() => false);

          if (!passwordsMatch) {
            return null;
          }

          // Only what the session needs: never the password hash or tokens.
          return { id: String(user._id), email: user.email, name: user.name || user.username || "", role: user.role ?? "User" };
        } catch (error) {
          console.log("Error: ", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.SECRET,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google") {
          // The Google profile knows nothing about our roles or ids: read the account created in signIn.
          const stored = user.email ? await findAccount(user.email) : null;
          token.id = stored ? String(stored._id) : undefined;
          token.role = stored?.role ?? "User";
          if (stored) token.email = stored.email;
        } else {
          token.id = user.id;
          token.role = user.role;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role;
        session.user.id = typeof token.id === "string" ? token.id : "";
      }
      return session;
    },

    async signIn({ user, account }: any) {
      if (account?.provider === "google") {
        const email = normalizeEmail(user?.email);
        if (!email) return false;
        try {
          const existing = await findAccount(email);

          if (!existing) {
            // Created here, in the same database as everything else. (This used to POST to the
            // production site, so a local build wrote its users into production.)
            const password = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
            await User.create({ name: user.name ?? "", username: user.name ?? "", email, password, selfCreated: false });
          }
        } catch (error) {
          console.log(error);
          return false;
        }
      }

      return true;
    },
  },
};
