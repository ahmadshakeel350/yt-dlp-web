import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(request) {
  try {
    // Check authentication
    const authCookie = request.cookies.get("yt-dlp-auth")
    const isAuthenticated = authCookie?.value === "authenticated"
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const downloadsDir = path.join(process.cwd(), "public", "downloads")
    const thumbnailsDir = path.join(process.cwd(), "public", "thumbnails")
    
    if (!fs.existsSync(downloadsDir)) {
      return NextResponse.json({ files: [] })
    }

    const files = fs.readdirSync(downloadsDir)
      .filter(file => {
        // Only include actual files, not directories
        const filePath = path.join(downloadsDir, file)
        return fs.statSync(filePath).isFile()
      })
      .map(file => {
        const filePath = path.join(downloadsDir, file)
        const stats = fs.statSync(filePath)
        const fileInfo = path.parse(file)
        
        // Check if thumbnail exists in thumbnails directory
        const thumbnailName = `${fileInfo.name}_thumb.jpg`
        const thumbnailPath = path.join(thumbnailsDir, thumbnailName)
        const hasThumbnail = fs.existsSync(thumbnailPath)
        
        return {
          name: file,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          modified: stats.mtime.toISOString(),
          url: `/api/files/download/${encodeURIComponent(file)}`,
          hasThumbnail,
          thumbnailUrl: hasThumbnail ? `/api/files/thumbnail/${encodeURIComponent(thumbnailName)}` : null
        }
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified)) // Sort by modification date (newest first)

    return NextResponse.json({ files })
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to list files: ${error.message}` },
      { status: 500 }
    )
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes"
  
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
} 