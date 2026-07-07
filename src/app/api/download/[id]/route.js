import { NextResponse } from "next/server"
import { getJob, cancelJob, deleteJob, startDownloadQueue } from "@/lib/download-queue"

export async function GET(_request, { params }) {
  try {
    startDownloadQueue()
    const { id } = await params
    const job = getJob(id)

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    return NextResponse.json({ job })
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to get job: ${error.message}` },
      { status: 500 }
    )
  }
}

export async function DELETE(_request, { params }) {
  try {
    startDownloadQueue()
    const { id } = await params
    const job = getJob(id)

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    if (job.status === "queued" || job.status === "downloading" || job.status === "processing") {
      const cancelled = cancelJob(id)
      return NextResponse.json({ job: cancelled })
    }

    deleteJob(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to cancel job: ${error.message}` },
      { status: 500 }
    )
  }
}
