"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Download, Play, Settings, Info, Square, FileDown, RefreshCw, LogOut, Search, X, ChevronDown, ChevronUp, Trash2, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function Home() {
  const [url, setUrl] = useState("")
  const [selectedFormat, setSelectedFormat] = useState("")
  const [downloadPath, setDownloadPath] = useState("")
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState("")
  const [logs, setLogs] = useState([])
  const [error, setError] = useState("")
  const [files, setFiles] = useState([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [isCheckingFormats, setIsCheckingFormats] = useState(false)
  const [availableFormats, setAvailableFormats] = useState([])
  const [showFormatModal, setShowFormatModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [fileToDelete, setFileToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const abortControllerRef = useRef(null)
  const router = useRouter()

  // Load files on component mount and after downloads
  useEffect(() => {
    loadFiles()
  }, [])

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

  const handleDownload = async () => {
    if (!url.trim()) {
      setError("Please enter a valid URL")
      return
    }

    setIsDownloading(true)
    setProgress(0)
    setStatus("Starting download...")
    setError("")
    setLogs([])

    // Create new AbortController for this download
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url.trim(),
          format: selectedFormat || "bestvideo+bestaudio", // Use selected format or fall back to best combo
          downloadPath: downloadPath.trim() || undefined,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error("Download failed")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n").filter(line => line.trim())

        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            
            if (data.type === "progress") {
              setProgress(data.progress)
              setStatus(data.status)
            } else if (data.type === "log") {
              setLogs(prev => [...prev, data.message])
            } else if (data.type === "complete") {
              setStatus("Download completed!")
              setIsDownloading(false)
              // Reload files after successful download
              loadFiles()
            } else if (data.type === "error") {
              setError(data.message)
              setIsDownloading(false)
            }
          } catch (e) {
            // Skip non-JSON lines
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus("Download cancelled")
        setLogs(prev => [...prev, "Download was cancelled by user"])
      } else {
        setError(error.message)
      }
      setIsDownloading(false)
    }
  }

  const handleStopDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setStatus("Cancelling download...")
    }
  }

  const getProgressColor = (progress) => {
    if (progress < 30) return "bg-blue-500"
    if (progress < 70) return "bg-yellow-500"
    return "bg-green-500"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with Logout */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Video Downloader
            </h1>
            <p className="text-gray-600">
              Download videos from YouTube and other social mediaplatforms with ease
            </p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="ml-4"
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
                Enter a URL and select your preferred format to start downloading
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Video URL</label>
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isDownloading}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={checkFormats}
                  variant="outline"
                  disabled={isCheckingFormats || isDownloading || !url.trim()}
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
              {selectedFormat && (
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
                        disabled={isDownloading}
                      />
                      <p className="text-xs text-gray-500">
                        Custom download directory path (relative to downloads folder)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleDownload}
                  disabled={isDownloading || !url.trim()}
                  className="flex-1"
                  size="lg"
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Start Download
                    </>
                  )}
                </Button>
                
                {isDownloading && (
                  <Button
                    onClick={handleStopDownload}
                    variant="destructive"
                    size="lg"
                    className="px-6"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress Card */}
          {isDownloading && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Download Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                  <div className="relative">
                    <Progress 
                      value={progress} 
                      className="w-full h-3"
                    />
                    <div 
                      className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {status || "Initializing download..."}
                </div>
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

          {/* Logs Card */}
          {logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Download Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="text-sm font-mono bg-gray-100 p-2 rounded">
                      {log}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Downloaded Files Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="h-5 w-5" />
                Downloaded Files
                <Button
                  onClick={loadFiles}
                  variant="outline"
                  size="sm"
                  disabled={isLoadingFiles}
                  className="ml-auto"
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
                    <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      {/* Thumbnail */}
                      {file.hasThumbnail && (
                        <div className="flex-shrink-0">
                          <img
                            src={file.thumbnailUrl}
                            alt={`Thumbnail for ${file.name}`}
                            className="w-24 h-16 object-cover rounded border"
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                      
                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          <span>{file.sizeFormatted}</span>
                          <span>{formatDate(file.modified)}</span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          asChild
                          size="sm"
                        >
                          <a href={file.url} download={file.name}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </a>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold">Available Formats</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFormatModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {availableFormats.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No formats found for this URL</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableFormats.map((format, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => selectFormat(format.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
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
                        <Button size="sm" variant="outline">
                          Select
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 border-t bg-gray-50">
                <p className="text-sm text-gray-600">
                  Click on any format to select it for download. If no format is selected, the best audio-video combination will be used.
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