# Audio Transcription App

A modern Next.js application that transforms audio files and live recordings into searchable markdown text using Google Gemini AI. Perfect for transcribing meetings, lectures, interviews, and more with built-in RAG (Retrieval-Augmented Generation) functionality.

## Features

🎙️ **Live Recording** - Record audio directly from your microphone
📁 **File Upload** - Support for MP3, WAV, WebM, and OGG files (up to 10MB)
🤖 **AI Transcription** - Powered by Google Gemini Flash models
📝 **Markdown Output** - Clean, formatted transcriptions
🔍 **AI-Powered Search** - Find content using vector embeddings
🏷️ **Tagging System** - Organize transcriptions with custom tags
💾 **Database Storage** - PostgreSQL with Prisma ORM
🎨 **Modern UI** - Built with shadcn/ui, Tailwind CSS, and v0.dev components

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Google Gemini Flash models
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS with v4

## Prerequisites

- Docker and Docker Compose
- Google Gemini API key

## Quick Start with Docker (Recommended)

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd audio-transcription
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Google API key:

   ```env
   GOOGLE_API_KEY="your_google_api_key_here"
   ```

3. **Start the application**

   ```bash
   # Production mode
   ./docker-scripts/start.sh

   # Or development mode with hot reload
   ./docker-scripts/dev.sh
   ```

4. **Access the application**
   - Production: [http://localhost:3000](http://localhost:3000)
   - Development: [http://localhost:3001](http://localhost:3001)

## Manual Installation (Without Docker)

If you prefer to run without Docker:

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Google Gemini API key
- pnpm package manager

### Setup Steps

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Set up environment variables**

   Update `.env` file with your credentials:

   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/audio_transcription?schema=public"

   # Google Gemini API
   GOOGLE_API_KEY="your_google_api_key_here"

   # File Upload
   UPLOAD_DIR="./uploads"
   MAX_FILE_SIZE=10485760  # 10MB in bytes
   ```

3. **Set up the database**

   ```bash
   # Generate Prisma client
   npx prisma generate

   # Run database migrations
   npx prisma migrate dev --name init
   ```

4. **Create uploads directory**

   ```bash
   mkdir uploads
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

### POST /api/transcribe

Transcribe audio files or live recordings.

**Request**: FormData with:

- `audio`: Audio file (File)
- `sourceType`: "FILE" or "LIVE_RECORDING" (string)
- `tags`: Comma-separated tags (string, optional)

**Response**:

```json
{
  "id": "transcription_id",
  "originalText": "transcribed text",
  "markdown": "formatted markdown",
  "confidence": 0.95,
  "fileName": "audio.mp3",
  "fileSize": 1024000,
  "sourceType": "FILE",
  "tags": ["meeting", "notes"],
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### GET /api/search

Get transcriptions with optional filtering.

**Query Parameters**:

- `limit`: Number of results (default: 10)
- `offset`: Skip results (default: 0)
- `tag`: Filter by tag
- `sourceType`: Filter by source type

### POST /api/search

Search transcriptions using AI embeddings.

**Request**:

```json
{
  "query": "search term",
  "limit": 5
}
```

**Response**:

```json
{
  "results": [
    {
      "id": "transcription_id",
      "originalText": "transcribed text",
      "markdown": "formatted markdown",
      "fileName": "audio.mp3",
      "similarity": 0.85,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## Database Schema

The app uses a single `AudioTranscription` model with the following fields:

- `id` - Unique identifier
- `createdAt` / `updatedAt` - Timestamps
- `fileName` - Original file name
- `filePath` - Server file path
- `fileSize` - File size in bytes
- `duration` - Audio duration in seconds
- `originalText` - Raw transcription
- `markdown` - Formatted transcription
- `language` - Detected language
- `confidence` - Transcription confidence score
- `embedding` - Vector embedding for search
- `sourceType` - FILE or LIVE_RECORDING
- `tags` - Array of tags

## Configuration

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_API_KEY` - Google Gemini API key
- `UPLOAD_DIR` - Directory for uploaded files (default: "./uploads")
- `MAX_FILE_SIZE` - Maximum file size in bytes (default: 10MB)

### Supported Audio Formats

- MP3 (audio/mp3, audio/mpeg)
- WAV (audio/wav)
- WebM (audio/webm)
- OGG (audio/ogg)

## Usage

1. **Record Audio**: Click "Start Recording" to record live audio
2. **Upload Files**: Select audio files to upload and transcribe
3. **Add Tags**: Organize transcriptions with custom tags
4. **Search**: Use AI-powered search to find specific content
5. **View History**: Browse all previous transcriptions

## Development

### Database Operations

```bash
# View database in Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset

# Generate client after schema changes
npx prisma generate
```

### Building for Production

```bash
pnpm build
pnpm start
```

## Docker Commands

### Production

```bash
# Start all services
./docker-scripts/start.sh

# Stop all services
./docker-scripts/stop.sh

# View logs
docker compose logs -f app

# Access database
docker exec -it audio-transcription-db psql -U postgres -d audio_transcription
```

### Development

```bash
# Start development services with hot reload
./docker-scripts/dev.sh

# Stop development services
docker compose --profile dev down

# View development logs
docker compose logs -f dev
```

### Manual Docker Commands

```bash
# Build and start services
docker compose up -d

# Stop services
docker compose down

# Stop and remove all data
docker compose down -v

# Rebuild containers
docker compose build --no-cache

# View database with Prisma Studio
docker exec -it audio-transcription-app npx prisma studio
```

## Deployment

### Docker Deployment

1. Clone the repository on your server
2. Set up environment variables in `.env`
3. Run `./docker-scripts/start.sh`
4. Configure reverse proxy (nginx) if needed

### Manual Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Build and deploy the application

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and feature requests, please create an issue in the repository.
