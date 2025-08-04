import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set("yt-dlp-auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0, // Expire immediately
  })
  return response
} 