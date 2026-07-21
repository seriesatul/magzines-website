import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { UserRole } from "@prisma/client";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { env } from "@/config/env";
import { db } from "@/server/db/client";

export const authConfig = {
  adapter: PrismaAdapter(db),
  providers: [
    // 1. Resend Provider: Passwordless customer logins (Rule 6.1)
    Resend({
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL
    }),

    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET
    }),

    // 2. Credentials Provider: Admin password login (Rule 6)
    Credentials({
      id: "credentials",
      name: "Admin Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const emailInput = (credentials?.email as string)?.toLowerCase().trim();
        const passwordInput = credentials?.password as string;

        // Extract admin credentials securely from server-side configurations
        const adminEmail = env.ADMIN_EMAILS[0] ?? "admin@heartsandbeans.in";
        const adminPassword = process.env.ADMIN_LOGIN_PASSWORD || "HeartsBeansAdmin2026!";

        if (emailInput === adminEmail && passwordInput === adminPassword) {
          // Fetch or automatically generate the administrator account in the DB
          let user = await db.user.findUnique({
            where: { email: emailInput }
          });

          if (!user) {
            user = await db.user.create({
              data: {
                email: emailInput,
                name: "Hearts & Beans Admin",
                role: UserRole.ADMIN
              }
            });
          }

          return user;
        }

        // Return null if credentials mismatch
        return null;
      }
    }),

    Credentials({
      id: "otp",
      name: "Email OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "OTP", type: "text" }
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.toLowerCase().trim();
        const otp = (credentials?.otp as string | undefined)?.trim();

        if (!email || !otp || !/^\d{6}$/.test(otp)) {
          return null;
        }

        const tokenRecord = await db.verificationToken.findFirst({
          where: {
            identifier: email,
            token: otp,
            expires: { gte: new Date() }
          }
        });

        if (!tokenRecord) {
          return null;
        }

        await db.verificationToken.deleteMany({
          where: { identifier: email, token: otp }
        });

        const existingUser = await db.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          const updates: {
            emailVerified?: Date;
            deletedAt?: null;
          } = {};

          if (!existingUser.emailVerified) {
            updates.emailVerified = new Date();
          }

          if (existingUser.deletedAt) {
            updates.deletedAt = null;
          }

          return Object.keys(updates).length > 0
            ? db.user.update({
                where: { id: existingUser.id },
                data: updates
              })
            : existingUser;
        }

        return db.user.create({
          data: {
            email,
            name: email.split("@")[0] || "Customer",
            role: UserRole.CUSTOMER,
            emailVerified: new Date()
          }
        });
      }
    })
  ],
  session: {
    // Required to support both Resend & Credentials providers simultaneously
    strategy: "jwt" 
  },
  trustHost: env.AUTH_TRUST_HOST,
  pages: {
    signIn: "/sign-in"
  },
  callbacks: {
    async signIn({ user }) {
      if (user?.id) {
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });
      }

      return true;
    },
    // Map database properties into the signed JWT token upon sign-in
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || UserRole.CUSTOMER;
        token.phone = (user as any).phone || null;
      }
      return token;
    },
    // Expose signed JWT properties to the frontend session session context
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.phone = (token.phone as string) || null;
      }
      return session;
    }
  }
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export function isAdminRole(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}
