import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import type { JWT } from "next-auth/jwt";

function decodeJwtPayload<T>(token: string): T | undefined {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return undefined;
  }
}

function extractRoles(accessToken: string): string[] {
  const payload = decodeJwtPayload<{ realm_access?: { roles?: string[] } }>(accessToken);
  return payload?.realm_access?.roles ?? [];
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const issuer = process.env.AUTH_KEYCLOAK_ISSUER;
    const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.AUTH_KEYCLOAK_ID!,
        client_secret: process.env.AUTH_KEYCLOAK_SECRET!,
        refresh_token: token.refreshToken!,
      }),
    });

    const refreshed = await response.json();
    if (!response.ok) {
      throw refreshed;
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      idToken: refreshed.id_token ?? token.idToken,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      accessTokenExpiresAt: Date.now() + refreshed.expires_in * 1000,
      roles: extractRoles(refreshed.access_token),
      error: undefined,
    };
  } catch (error) {
    console.error("Keycloak access token yenilenemedi", error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Keycloak],
  callbacks: {
    async jwt({ token, account }) {
      // İlk girişte Keycloak'tan gelen token'ları sakla
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          idToken: account.id_token,
          refreshToken: account.refresh_token,
          accessTokenExpiresAt: account.expires_at ? account.expires_at * 1000 : undefined,
          roles: typeof account.access_token === "string" ? extractRoles(account.access_token) : [],
        };
      }

      // Token hâlâ geçerliyse (10sn tolerans) aynen döndür
      if (typeof token.accessTokenExpiresAt === "number" && Date.now() < token.accessTokenExpiresAt - 10_000) {
        return token;
      }

      // Süresi dolmuş/dolmak üzere -> refresh_token ile yenile
      if (!token.refreshToken) {
        return { ...token, error: "RefreshTokenMissing" };
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
      session.idToken = typeof token.idToken === "string" ? token.idToken : undefined;
      session.roles = Array.isArray(token.roles) ? token.roles : [];
      session.error = token.error;
      return session;
    },
  },
});
