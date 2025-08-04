import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(request, { params }) {
  try {
    // Check authentication
    const authCookie = request.cookies.get("yt-dlp-auth")
    const isAuthenticated = authCookie?.value === "authenticated"
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { filename } = params
    const filePath = path.join(process.cwd(), "public", "thumbnails", ...filename)
    
    // Security check: ensure the file is within the thumbnails directory
    const thumbnailsDir = path.join(process.cwd(), "public", "thumbnails")
    const resolvedFilePath = path.resolve(filePath)
    const resolvedThumbnailsDir = path.resolve(thumbnailsDir)
    
    if (!resolvedFilePath.startsWith(resolvedThumbnailsDir)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    
    const fileBuffer = fs.readFileSync(filePath)
    const fileStats = fs.statSync(filePath)
    
    // Determine content type based on file extension
    const ext = path.extname(filePath).toLowerCase()
    let contentType = "image/jpeg" // Default for thumbnails
    
    if (ext === ".png") {
      contentType = "image/png"
    } else if (ext === ".gif") {
      contentType = "image/gif"
    } else if (ext === ".webp") {
      contentType = "image/webp"
    }
    
    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStats.size.toString(),
        "Content-Disposition": `inline; filename="${encodeURIComponent(path.basename(filePath))}"`,
        "Cache-Control": "public, max-age=31536000", // Cache for 1 year
      },
    })
    
    return response
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to serve thumbnail: ${error.message}` },
      { status: 500 }
    )
  }
} 