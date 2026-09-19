import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth && !req.auth.error;
  const isLoginPage = req.nextUrl.pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
