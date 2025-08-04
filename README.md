# YT-DLP Web Interface

A modern, secure web interface for downloading videos from YouTube and other social media platforms using yt-dlp, built with Next.js 15, React 19, and shadcn/ui.

## 🐧 Linux Quick Start

### 1. Install FFmpeg
```bash
sudo apt-get install ffmpeg
```

### 2. Install Node.js (using NVM)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
node -v
```

### 3. Install yt-dlp
```bash
sudo add-apt-repository ppa:tomtomtom/yt-dlp
sudo apt update
sudo apt install yt-dlp
```

### 4. Start the Application
```bash
npm install
npm install -g pm2
npm run build
pm2 start ecosystem.config.js
```

## 🚀 Features

### Core Functionality
- 🎥 **Multi-platform Video Downloads**: Support for YouTube, Vimeo, Dailymotion, Facebook, Twitter, Instagram, TikTok, Twitch, and 1000+ other sites
- 📱 **Modern Responsive UI**: Beautiful interface built with shadcn/ui components and Tailwind CSS
- ⚡ **Real-time Progress Tracking**: Live download progress with percentage and status updates
- 🎛️ **Advanced Format Selection**: Browse and select from all available video/audio formats
- 📁 **Custom Download Paths**: Organize downloads in custom subdirectories
- 🔒 **Secure Authentication**: Protected interface with username/password login
- 📊 **Live Download Logs**: Real-time streaming of yt-dlp output
- 🖼️ **Automatic Thumbnails**: Auto-generated video thumbnails using FFmpeg
- 📋 **File Management**: Browse, download, and delete downloaded files
- 🛑 **Download Control**: Cancel ongoing downloads with abort functionality

### Security Features
- 🔐 **Session-based Authentication**: Secure cookie-based sessions
- 🛡️ **Path Traversal Protection**: Secure file access with path validation
- 🔒 **Protected API Endpoints**: All endpoints require authentication
- 🚫 **CSRF Protection**: Secure cookie settings with httpOnly and sameSite

## 🛠️ Prerequisites

### Required Software
- **Node.js 18+** (for Next.js application)
- **yt-dlp** (for video downloading)
- **FFmpeg** (for thumbnail generation and video processing)

### Installing Dependencies

**yt-dlp Installation:**

**Windows:**
```bash
# Using chocolatey
choco install yt-dlp

# Or download from https://github.com/yt-dlp/yt-dlp/releases
```

**macOS:**
```bash
# Using Homebrew
brew install yt-dlp

# Using pip
pip install yt-dlp
```

**Linux:**
```bash
# Using pip
pip install yt-dlp

# Or using your package manager
sudo apt install yt-dlp  # Ubuntu/Debian
sudo dnf install yt-dlp  # Fedora
```

**FFmpeg Installation:**

**Windows:**
```bash
# Using chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

**macOS:**
```bash
# Using Homebrew
brew install ffmpeg
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# Fedora
sudo dnf install ffmpeg
```

## 📦 Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd yt-dlp-web
```

2. **Install Node.js dependencies:**
```bash
npm install
```

3. **Configure authentication:**
Edit `src/app/auth.json` to set your desired username and password:
```json
{
  "username": "your-username",
  "password": "your-secure-password"
}
```

4. **Start the development server:**
```bash
npm run dev
```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## 🔐 Authentication

The application uses a simple but secure authentication system:

- **Login Page**: `/login` - Username/password authentication
- **Session Management**: HTTP-only cookies with secure settings
- **Default Credentials**: `admin` / `admin123` (change in `src/app/auth.json`)
- **Session Duration**: 7 days (configurable in login route)
- **Logout**: Automatic session cleanup

## 🎯 Usage Guide

### 1. Authentication
- Navigate to the application URL
- You'll be redirected to `/login` if not authenticated
- Enter your credentials to access the download interface

### 2. Video Download Process
1. **Enter Video URL**: Paste any supported platform URL
2. **Check Available Formats** (Optional): Click to see all available quality options
3. **Select Format**: Choose from the format list or use default "best" quality
4. **Set Download Path** (Optional): Specify custom subdirectory
5. **Start Download**: Monitor real-time progress and logs
6. **Download Files**: Access downloaded videos from the file manager

### 3. File Management
- **Browse Downloads**: View all downloaded files with thumbnails
- **Download Files**: Click download button to save to your device
- **Delete Files**: Remove unwanted files from server
- **Refresh List**: Update file list after new downloads

## 🔌 API Reference

### Authentication Endpoints

#### POST `/api/auth/login`
Authenticate user and create session.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true
}
```
*Sets authentication cookie for 7 days*

#### POST `/api/auth/logout`
Destroy user session.

**Response:**
```json
{
  "success": true
}
```
*Clears authentication cookie*

### Download Endpoints

#### POST `/api/download`
Download video with real-time progress streaming.

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "format": "bestvideo+bestaudio",
  "downloadPath": "custom/path"
}
```

**Response:** Server-Sent Events stream with JSON messages:
```json
{"type": "progress", "progress": 45, "status": "Downloading... 45%"}
{"type": "log", "message": "[download] 45.2% of ~123.45MiB"}
{"type": "complete", "message": "Download completed successfully!"}
{"type": "error", "message": "Download failed: Invalid URL"}
```

#### POST `/api/formats`
Get available video formats for a URL.

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=..."
}
```

**Response:**
```json
{
  "formats": [
    {
      "id": "137",
      "ext": "mp4",
      "resolution": "1080p",
      "fps": "30",
      "filesize": "123.45MiB",
      "tbr": "5000k",
      "vcodec": "avc1.640028",
      "acodec": "mp4a.40.2"
    }
  ]
}
```

### File Management Endpoints

#### GET `/api/files`
List all downloaded files with metadata.

**Response:**
```json
{
  "files": [
    {
      "name": "Video Title.mp4",
      "size": 12345678,
      "sizeFormatted": "11.77 MB",
      "modified": "2024-01-15T10:30:00.000Z",
      "url": "/api/files/download/Video%20Title.mp4",
      "hasThumbnail": true,
      "thumbnailUrl": "/api/files/thumbnail/Video%20Title_thumb.jpg"
    }
  ]
}
```

#### GET `/api/files/download/[...filename]`
Download a specific file.

**Headers:** Requires authentication cookie

**Response:** File stream with appropriate content-type headers

#### GET `/api/files/thumbnail/[...filename]`
Get video thumbnail image.

**Headers:** Requires authentication cookie

**Response:** Image file with caching headers

#### POST `/api/files/delete`
Delete a downloaded file and its thumbnail.

**Request Body:**
```json
{
  "filename": "Video Title.mp4"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

## 🏗️ Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.js      # Authentication endpoint
│   │   │   └── logout/route.js     # Logout endpoint
│   │   ├── download/route.js       # Video download with streaming
│   │   ├── formats/route.js        # Format listing endpoint
│   │   └── files/
│   │       ├── route.js            # File listing
│   │       ├── delete/route.js     # File deletion
│   │       ├── download/[...filename]/route.js  # File download
│   │       └── thumbnail/[...filename]/route.js # Thumbnail serving
│   ├── login/
│   │   └── page.js                 # Login page component
│   ├── auth.json                   # Authentication credentials
│   ├── globals.css                 # Global styles
│   ├── layout.js                   # Root layout
│   ├── page.js                     # Main dashboard page
│   └── middleware.js               # Authentication middleware
├── components/
│   └── ui/                         # shadcn/ui components
│       ├── alert.jsx
│       ├── badge.jsx
│       ├── button.jsx
│       ├── card.jsx
│       ├── input.jsx
│       ├── progress.jsx
│       └── textarea.jsx
└── lib/
    └── utils.js                    # Utility functions

public/
├── downloads/                      # Downloaded video files
└── thumbnails/                    # Generated video thumbnails
```

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### PM2 Process Manager
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Monitor processes
pm2 status
pm2 logs
```

### Docker Deployment
```dockerfile
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache yt-dlp ffmpeg

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

## 🔧 Configuration

### Authentication
Edit `src/app/auth.json`:
```json
{
  "username": "your-username",
  "password": "your-secure-password"
}
```

### Environment Variables
```bash
# Production environment
NODE_ENV=production

# Custom port (optional)
PORT=3000
```

### PM2 Configuration
The `ecosystem.config.js` file is included for PM2 deployment:
```javascript
module.exports = {
  apps: [{
    name: 'yt-dlp-web',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
```

## 🛡️ Security Considerations

- **Authentication Required**: All API endpoints require valid session
- **Path Validation**: File access is restricted to downloads/thumbnails directories
- **Secure Cookies**: HTTP-only, secure, sameSite cookies
- **Input Validation**: URL and filename validation on all endpoints
- **Error Handling**: Comprehensive error handling without exposing system details

## 📋 Supported Platforms

The application supports all platforms that yt-dlp supports, including:

### Video Platforms
- YouTube (all formats)
- Vimeo
- Dailymotion
- Facebook
- Twitter/X
- Instagram
- TikTok
- Twitch
- Reddit
- LinkedIn

### Audio Platforms
- Spotify
- SoundCloud
- Apple Music
- Amazon Music

### Other Platforms
- TikTok
- Snapchat
- Pinterest
- Tumblr
- And 1000+ more sites

*See [yt-dlp extractors](https://github.com/yt-dlp/yt-dlp#supported-sites) for complete list*

## 🐛 Troubleshooting

### Common Issues

**"yt-dlp not found"**
- Ensure yt-dlp is installed and accessible in PATH
- Try running `yt-dlp --version` in terminal

**"FFmpeg not found"**
- Install FFmpeg for thumbnail generation
- Videos will still download without thumbnails

**"Permission denied"**
- Ensure proper file permissions for downloads/thumbnails directories
- Check Node.js has write access to project directory

**"Authentication failed"**
- Verify credentials in `src/app/auth.json`
- Clear browser cookies and try again

### Debug Mode
Enable detailed logging by checking browser console and server logs.

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review yt-dlp documentation
- Open an issue on GitHub

---

**Note**: This application is for personal use only. Please respect copyright laws and terms of service of the platforms you download from.
