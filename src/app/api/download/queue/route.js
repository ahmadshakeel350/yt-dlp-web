import { NextResponse } from "next/server"
import { listJobs, startDownloadQueue } from "@/lib/download-queue"

export async function GET() {
  try {
    startDownloadQueue()
    const jobs = listJobs()
    return NextResponse.json({ jobs })
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to list jobs: ${error.message}` },
      { status: 500 }
    )
  }
}
