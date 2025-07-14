# Docker Usage Guide

After cleanup, you now have a simplified Docker setup with just 2 files:

## Files

1. **`Dockerfile`** - Production deployment
2. **`docker-compose.yml`** - Local testing with database

## Local Development & Testing

To test your setup locally:

```bash
# Make sure you have a .env file with your environment variables
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY, GITHUB_ID, GITHUB_SECRET, etc.

# Start the services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

The app will be available at `http://localhost:3000`

## Production Deployment

For production deployment, use the `Dockerfile`:

```bash
# Build the image
docker build -t luna-ai .

# Run the container
docker run -p 3000:3000 \
  -e DATABASE_URL="your-production-db-url" \
  -e GOOGLE_API_KEY="your-api-key" \
  -e NEXTAUTH_SECRET="your-nextauth-secret" \
  -e NEXTAUTH_URL="https://your-domain.com" \
  -e GITHUB_ID="your-github-id" \
  -e GITHUB_SECRET="your-github-secret" \
  -e ALLOWED_GITHUB_USERNAME="your-username" \
  luna-ai
```

## Environment Variables

Make sure to set these environment variables for production:

- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_API_KEY` - For Gemini API
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your domain URL
- `GITHUB_ID` - OAuth app client ID
- `GITHUB_SECRET` - OAuth app client secret
- `ALLOWED_GITHUB_USERNAME` - Your GitHub username

## Database Setup

The production deployment expects a PostgreSQL database with the `pgvector` extension. The app will automatically:
- Generate Prisma client
- Run database migrations
- Start the server

That's it! Much simpler than before.
