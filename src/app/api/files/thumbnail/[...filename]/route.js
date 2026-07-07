import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { Readable } from "stream"

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
}

export async function GET(request, { params }) {
  try {
    const authCookie = request.cookies.get("yt-dlp-auth")
    if (authCookie?.value !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { filename: filenameParts } = await params
    const filename = Array.isArray(filenameParts)
      ? filenameParts.map(decodeURIComponent).join("/")
      : decodeURIComponent(filenameParts || "")

    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 })
    }

    const thumbnailsDir = path.join(process.cwd(), "public", "thumbnails")
    const filePath = path.join(thumbnailsDir, filename)

    const resolvedFilePath = path.resolve(filePath)
    const resolvedThumbnailsDir = path.resolve(thumbnailsDir)

    if (!resolvedFilePath.startsWith(resolvedThumbnailsDir + path.sep) &&
        resolvedFilePath !== resolvedThumbnailsDir) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const fileStats = fs.statSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || "image/jpeg"

    const nodeStream = fs.createReadStream(filePath)
    const webStream = Readable.toWeb(nodeStream)

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStats.size.toString(),
        "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
        "Cache-Control": "public, max-age=31536000",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to serve thumbnail: ${error.message}` },
      { status: 500 }
    )
  }
}
