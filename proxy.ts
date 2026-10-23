import { NextResponse, type NextRequest } from "next/server";

// Gardener pages need sign-in. A request without the session cookie is sent to Sign in before
// the page renders, with the page it asked for in `next`. This is only a first check: each page
// and server action validates the cookie against the database with requireGardener().
export function proxy(request: NextRequest) {
  if (request.cookies.has("gardenlog_session")) return NextResponse.next();
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/zones/:path*", "/beds/:path*", "/plantings/:path*", "/plants/:path*"],
};
