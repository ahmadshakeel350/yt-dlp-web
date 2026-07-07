import { NextResponse } from "next/server"
import { enqueueJob, startDownloadQueue } from "@/lib/download-queue"

export async function POST(request) {
  try {
    startDownloadQueue()

    const { url, format, downloadPath } = await request.json()

    if (!url?.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    const job = enqueueJob({
      url: url.trim(),
      format: format?.trim() || undefined,
      downloadPath: downloadPath?.trim() || undefined,
    })

    return NextResponse.json({ job })
  } catch (error) {
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
}
