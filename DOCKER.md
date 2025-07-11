# Docker Setup Guide

This guide will help you run the Audio Transcription App using Docker, making it easy to deploy on any system.

## 🐳 What's Included

- **PostgreSQL Database** - Persistent data storage
- **Next.js Application** - Main web application
- **Development Environment** - Hot-reload enabled development setup
- **Helper Scripts** - Easy-to-use startup scripts

## 🚀 Quick Start

### 1. Prerequisites

- Docker and Docker Compose installed
- Google Gemini API key

### 2. Setup

```bash
# Clone and navigate to the project
git clone <repository-url>
cd audio-transcription

# Set up environment
cp .env.example .env
```

### 3. Configure Environment

Edit `.env` and add your Google API key:

```env
GOOGLE_API_KEY="your_actual_google_api_key_here"
```

### 4. Start the Application

```bash
# Production mode
./docker-scripts/start.sh

# Development mode (with hot reload)
./docker-scripts/dev.sh
```

### 5. Access the Application

- **Production**: http://localhost:3000
- **Development**: http://localhost:3001
- **Database**: localhost:5432

## 📋 Available Services

### Production Stack

- `postgres` - PostgreSQL database (port 5432)
- `app` - Next.js application (port 3000)

### Development Stack

- `postgres` - PostgreSQL database (port 5432)
- `dev` - Next.js development server (port 3001)

## 🛠️ Common Commands

### Starting Services

```bash
# Production
./docker-scripts/start.sh

# Development
./docker-scripts/dev.sh

# Manual start
docker compose up -d
```

### Stopping Services

```bash
# Stop all services
./docker-scripts/stop.sh

# Stop specific profile
docker compose --profile dev down

# Stop and remove data
docker compose down -v
```

### Viewing Logs

```bash
# Production app logs
docker compose logs -f app

# Development logs
docker compose logs -f dev

# Database logs
docker compose logs -f postgres
```

### Database Operations

```bash
# Access database shell
docker exec -it audio-transcription-db psql -U postgres -d audio_transcription

# Run Prisma Studio
docker exec -it audio-transcription-app npx prisma studio

# Run migrations
docker exec -it audio-transcription-app npx prisma migrate dev

# Reset database
docker exec -it audio-transcription-app npx prisma migrate reset
```

## 🔧 Configuration

### Environment Variables

The application uses the following environment variables:

```env
# Database connection
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/audio_transcription?schema=public"

# Google Gemini API
GOOGLE_API_KEY="your_google_api_key_here"

# File upload settings
UPLOAD_DIR="/app/uploads"
MAX_FILE_SIZE=10485760  # 10MB
```

### Volumes

- `postgres_data` - Database data persistence
- `./uploads` - Audio file storage
- `./prisma` - Database schema files

### Networks

- `audio-network` - Internal communication between services

## 🔍 Troubleshooting

### Common Issues

#### Services won't start

```bash
# Check Docker is running
docker info

# Check logs for errors
docker compose logs

# Rebuild containers
docker compose build --no-cache
```

#### Database connection errors

```bash
# Check database is running
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Reset database
docker compose down -v
docker compose up -d
```

#### Permission issues

```bash
# Fix uploads directory permissions
sudo chown -R 1001:1001 uploads/

# Fix Docker permissions (Linux)
sudo usermod -aG docker $USER
```

#### Port conflicts

```bash
# Check what's using the port
lsof -i :3000
lsof -i :5432

# Stop conflicting services
sudo service postgresql stop
```

### Health Checks

The services include health checks:

- PostgreSQL: `pg_isready` command
- Application: Waits for database to be ready

### Debugging

```bash
# Enter container shell
docker exec -it audio-transcription-app sh

# Check container logs
docker logs audio-transcription-app

# Monitor resource usage
docker stats
```

## 📂 File Structure

```
audio-transcription/
├── docker compose.yml          # Main compose file
├── Dockerfile                  # Production container
├── Dockerfile.dev             # Development container
├── .dockerignore              # Docker ignore patterns
├── init.sql                   # Database initialization
├── docker-scripts/
│   ├── start.sh              # Production startup
│   ├── dev.sh                # Development startup
│   └── stop.sh               # Stop services
├── uploads/                   # Audio file storage
└── .env.example              # Environment template
```

## 🚦 Production Deployment

### Server Requirements

- Docker and Docker Compose
- 2GB+ RAM
- 10GB+ storage
- SSL certificate (recommended)

### Deployment Steps

```bash
# 1. Clone on server
git clone <repository-url>
cd audio-transcription

# 2. Set up environment
cp .env.example .env
# Edit .env with production values

# 3. Start services
./docker-scripts/start.sh

# 4. Configure reverse proxy (nginx example)
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Backup and Restore

```bash
# Backup database
docker exec audio-transcription-db pg_dump -U postgres audio_transcription > backup.sql

# Restore database
docker exec -i audio-transcription-db psql -U postgres audio_transcription < backup.sql

# Backup uploads
tar -czf uploads-backup.tar.gz uploads/
```

## 🔐 Security

### Production Security

- Change default PostgreSQL password
- Use environment variables for secrets
- Set up SSL/TLS
- Configure firewall rules
- Regular security updates

### Environment Security

```env
# Use strong passwords
DATABASE_URL="postgresql://user:strong_password@postgres:5432/audio_transcription"

# Secure API key storage
GOOGLE_API_KEY="your_secure_api_key"
```

## 📊 Monitoring

### Container Monitoring

```bash
# Resource usage
docker stats

# System information
docker system df

# Container health
docker compose ps
```

### Application Monitoring

- Check application logs for errors
- Monitor disk usage for uploads
- Track database performance
- Set up alerts for failures

This Docker setup provides a complete, production-ready environment for the Audio Transcription App!
