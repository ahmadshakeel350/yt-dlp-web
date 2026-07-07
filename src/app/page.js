"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Download, Info, Square, FileDown, RefreshCw, LogOut, Search, X, ChevronDown, ChevronUp, Trash2, AlertTriangle, ListOrdered, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function Home() {
  const [url, setUrl] = useState("")
  const [selectedFormat, setSelectedFormat] = useState("")
  const [downloadPath, setDownloadPath] = useState("")
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [queue, setQueue] = useState([])
  const [expandedJobId, setExpandedJobId] = useState(null)
  const [error, setError] = useState("")
  const [files, setFiles] = useState([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [isCheckingFormats, setIsCheckingFormats] = useState(false)
  const [availableFormats, setAvailableFormats] = useState([])
  const [showFormatModal, setShowFormatModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [fileToDelete, setFileToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [downloadingFile, setDownloadingFile] = useState(null)
  const router = useRouter()
  const prevCompletedRef = useRef(0)

  const activeJobs = queue.filter((j) =>
    ["queued", "downloading", "processing"].includes(j.status)
  )

  const loadQueue = async () => {
    try {
      const response = await fetch("/api/download/queue")
      const data = await response.json()
      setQueue(data.jobs || [])
    } catch (err) {
      console.error("Failed to load queue:", err)
    }
  }

  // Load files and queue on mount; poll queue while jobs are active
  useEffect(() => {
    loadFiles()
    loadQueue()
  }, [])

  useEffect(() => {
    if (activeJobs.length === 0) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/download/queue")
        const data = await response.json()
        const jobs = data.jobs || []
        const completedCount = jobs.filter((j) => j.status === "completed").length

        if (completedCount > prevCompletedRef.current) {
          loadFiles()
        }
        prevCompletedRef.current = completedCount
        setQueue(jobs)
      } catch (err) {
        console.error("Failed to poll queue:", err)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [activeJobs.length])

  const loadFiles = async () => {
    setIsLoadingFiles(true)
    try {
      const response = await fetch("/api/files")
      const data = await response.json()
      setFiles(data.files || [])
    } catch (error) {
      console.error("Failed to load files:", error)
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const checkFormats = async () => {
    if (!url.trim()) {
      setError("Please enter a URL first")
      return
    }

    setIsCheckingFormats(true)
    setError("")

    try {
      const response = await fetch("/api/formats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        setAvailableFormats(data.formats || [])
        setShowFormatModal(true)
      } else {
        setError(data.error || "Failed to check formats")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsCheckingFormats(false)
    }
  }

  const selectFormat = (formatId) => {
    setSelectedFormat(formatId)
    setShowFormatModal(false)
  }

  const handleDeleteFile = (file) => {
    setFileToDelete(file)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!fileToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch("/api/files/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename: fileToDelete.name }),
      })

      const data = await response.json()

      if (response.ok) {
        // Remove file from state
        setFiles(prev => prev.filter(f => f.name !== fileToDelete.name))
        setShowDeleteModal(false)
        setFileToDelete(null)
      } else {
        setError(data.error || "Failed to delete file")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleFileDownload = async (file) => {
    setDownloadingFile(file.name)
    setError("")

    try {
      const response = await fetch(file.url)

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Download failed")
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      setError(err.message || "Failed to download file")
    } finally {
      setDownloadingFile(null)
    }
  }

  const handleDownload = async () => {
    if (!url.trim()) {
      setError("Please enter a valid URL")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          format: selectedFormat || undefined,
          downloadPath: downloadPath.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add to queue")
      }

      setUrl("")
      setSelectedFormat("")
      await loadQueue()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelJob = async (jobId) => {
    try {
      await fetch(`/api/download/${jobId}`, { method: "DELETE" })
      await loadQueue()
    } catch (err) {
      setError("Failed to cancel job")
    }
  }

  const handleClearCompleted = async () => {
    const completed = queue.filter((j) =>
      ["completed", "failed", "cancelled"].includes(j.status)
    )
    await Promise.all(
      completed.map((j) => fetch(`/api/download/${j.id}`, { method: "DELETE" }))
    )
    await loadQueue()
  }

  const getJobStatusBadge = (status) => {
    const styles = {
      queued: "bg-gray-100 text-gray-800",
      downloading: "bg-blue-100 text-blue-800",
      processing: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      cancelled: "bg-orange-100 text-orange-800",
    }
    return styles[status] || "bg-gray-100 text-gray-800"
  }

  const getJobStatusIcon = (status) => {
    switch (status) {
      case "queued": return <Clock className="h-4 w-4" />
      case "downloading": return <Loader2 className="h-4 w-4 animate-spin" />
      case "processing": return <Loader2 className="h-4 w-4 animate-spin" />
      case "completed": return <CheckCircle2 className="h-4 w-4" />
      case "failed": return <XCircle className="h-4 w-4" />
      case "cancelled": return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const truncateUrl = (url, max = 60) => {
    if (url.length <= max) return url
    return url.slice(0, max) + "..."
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const getFormatLabel = (format) => {
    const resolution = format.resolution
    const fps = format.fps !== "N/A" ? ` ${format.fps}fps` : ""
    const ext = format.ext
    const size = format.filesize !== "N/A" ? ` (${format.filesize})` : ""
    return `${resolution}${fps} - ${ext}${size}`
  }

  const getQualityBadge = (resolution) => {
    if (resolution.includes("1080")) return "bg-green-100 text-green-800"
    if (resolution.includes("720")) return "bg-blue-100 text-blue-800"
    if (resolution.includes("480")) return "bg-yellow-100 text-yellow-800"
    if (resolution.includes("360")) return "bg-orange-100 text-orange-800"
    return "bg-gray-100 text-gray-800"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Logout */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Video Downloader
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Download videos from YouTube and other social media platforms with ease
            </p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="self-center sm:self-start shrink-0"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Main Download Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Download Video
              </CardTitle>
              <CardDescription>
                Enter a URL and add it to the download queue — downloads continue in the background
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Video URL</label>
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={checkFormats}
                  variant="outline"
                  disabled={isCheckingFormats || isSubmitting || !url.trim()}
                  className="flex-1"
                >
                  {isCheckingFormats ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2" />
                      Checking Formats...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Check Available Formats
                    </>
                  )}
                </Button>
              </div>

              {/* Selected Format Display */}
              {selectedFormat ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">Selected Format</p>
                      <p className="text-xs text-blue-700">ID: {selectedFormat}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFormat("")}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    No format selected — best available quality will be used automatically.
                  </p>
                </div>
              )}

              {/* Advanced Options */}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                >
                  {showAdvancedOptions ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Advanced Options
                </Button>
                
                {showAdvancedOptions && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Download Path (Optional)</label>
                      <Input
                        placeholder="Leave empty for default"
                        value={downloadPath}
                        onChange={(e) => setDownloadPath(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-gray-500">
                        Custom download directory path (relative to downloads folder)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleDownload}
                  disabled={isSubmitting || !url.trim()}
                  className="flex-1"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Add to Queue
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Download Queue */}
          {queue.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="flex items-center gap-2">
                    <ListOrdered className="h-5 w-5" />
                    Download Queue
                    {activeJobs.length > 0 && (
                      <Badge variant="secondary">{activeJobs.length} active</Badge>
                    )}
                  </span>
                  <div className="flex gap-2 sm:ml-auto">
                    <Button onClick={loadQueue} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    {queue.some((j) => ["completed", "failed", "cancelled"].includes(j.status)) && (
                      <Button onClick={handleClearCompleted} variant="outline" size="sm">
                        Clear finished
                      </Button>
                    )}
                  </div>
                </CardTitle>
                <CardDescription>
                  Downloads run on the server — safe to close or refresh this page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {queue.map((job) => (
                  <div key={job.id} className="p-3 sm:p-4 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 break-all">
                          {truncateUrl(job.url)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge className={getJobStatusBadge(job.status)}>
                            <span className="flex items-center gap-1">
                              {getJobStatusIcon(job.status)}
                              {job.status}
                            </span>
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDate(job.createdAt)}
                          </span>
                          {job.outputFile && (
                            <span className="text-xs text-green-700">{job.outputFile}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {["queued", "downloading", "processing"].includes(job.status) && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelJob(job.id)}
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        )}
                        {job.logs?.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                          >
                            {expandedJobId === job.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {["downloading", "processing"].includes(job.status) && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{job.statusMessage}</span>
                          <span>{Math.round(job.progress)}%</span>
                        </div>
                        <Progress value={job.progress} className="h-2" />
                      </div>
                    )}

                    {job.error && (
                      <p className="text-xs text-red-600">{job.error}</p>
                    )}

                    {expandedJobId === job.id && job.logs?.length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-1 pt-1">
                        {job.logs.map((log, i) => (
                          <div key={i} className="text-xs font-mono bg-gray-100 p-1.5 rounded">
                            {log}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Downloaded Files Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="flex items-center gap-2">
                  <FileDown className="h-5 w-5" />
                  Downloaded Files
                </span>
                <Button
                  onClick={loadFiles}
                  variant="outline"
                  size="sm"
                  disabled={isLoadingFiles}
                  className="sm:ml-auto w-full sm:w-auto"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                Files downloaded and ready for download
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingFiles ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading files...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No files downloaded yet</p>
                  <p className="text-sm">Download a video to see it here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {files.map((file, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                      {/* Thumbnail */}
                      {file.hasThumbnail && (
                        <div className="flex-shrink-0 mx-auto sm:mx-0">
                          <img
                            src={file.thumbnailUrl}
                            alt={`Thumbnail for ${file.name}`}
                            className="w-full sm:w-24 h-32 sm:h-16 object-cover rounded border"
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                      
                      {/* File Info */}
                      <div className="flex-1 min-w-0 text-center sm:text-left">
                        <p className="text-sm font-medium text-gray-900 break-all">
                          {file.name}
                        </p>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                          <span>{file.sizeFormatted}</span>
                          <span>{formatDate(file.modified)}</span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center justify-center sm:justify-end gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleFileDownload(file)}
                          disabled={downloadingFile === file.name}
                          className="flex-1 sm:flex-none"
                        >
                          {downloadingFile === file.name ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteFile(file)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Supported Platforms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[
                  "YouTube", "Vimeo", "Dailymotion", "Facebook", 
                  "Twitter", "Instagram", "TikTok", "Twitch"
                ].map((platform) => (
                  <Badge key={platform} variant="secondary">
                    {platform}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Format Selection Modal */}
        {showFormatModal && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white rounded-t-lg sm:rounded-lg max-w-4xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 sm:p-6 border-b">
                <h2 className="text-lg sm:text-xl font-semibold">Available Formats</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFormatModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[55vh] sm:max-h-[60vh]">
                {availableFormats.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No formats found for this URL</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableFormats.map((format, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => selectFormat(format.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge className={getQualityBadge(format.resolution)}>
                              {format.resolution}
                            </Badge>
                            <span className="text-sm font-medium">
                              {getFormatLabel(format)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 space-x-4">
                            <span>ID: {format.id}</span>
                            <span>Codec: {format.vcodec !== "N/A" ? format.vcodec : format.acodec}</span>
                            {format.tbr !== "N/A" && <span>Bitrate: {format.tbr}</span>}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="self-end sm:self-auto">
                          Select
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-6 border-t bg-gray-50">
                <p className="text-sm text-gray-600">
                  Click on any format to select it for download. If no format is selected, the best available quality will be used automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && fileToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Delete File
                  </h3>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to delete this file?
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="text-sm font-medium text-gray-900">{fileToDelete.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {fileToDelete.sizeFormatted} • {formatDate(fileToDelete.modified)}
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setFileToDelete(null)
                  }}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 