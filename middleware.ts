import { NextRequest, NextResponse } from "next/server";

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https: https://*.tile.openstreetmap.org",
  "media-src 'self' https://cdn.pixabay.com",
  "connect-src 'self'",
].join("; ");

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = `${CSP_DIRECTIVES}; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
    },
  ],
};