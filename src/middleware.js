import { NextResponse } from "next/server"

export function middleware(request) {
  const authCookie = request.cookies.get("yt-dlp-auth")
  const isAuthenticated = authCookie?.value === "authenticated"

  const { pathname } = request.nextUrl

  const publicPaths = ["/login", "/api/auth/login"]
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

  // Block direct access to downloaded files in public folder
  const protectedFilePaths = ["/downloads/", "/thumbnails/"]
  const isProtectedFile = protectedFilePaths.some((path) => pathname.startsWith(path))

  if (!isAuthenticated && (!isPublicPath || isProtectedFile)) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}
