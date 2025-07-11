# 🔐 Authentication Setup Guide

## Overview
Your personal AI system now has **secure GitHub OAuth authentication** with single-owner access control and 30-day session persistence.

## 🚀 Quick Setup

### Step 1: Create GitHub OAuth App

1. **Go to GitHub Settings**
   - Visit: https://github.com/settings/developers
   - Click "New OAuth App"

2. **Configure OAuth App**
   ```
   Application name: Luna AI Personal Assistant
   Homepage URL: http://localhost:3000
   Authorization callback URL: http://localhost:3000/api/auth/callback/github
   ```

3. **Get Credentials**
   - Copy the `Client ID`
   - Generate and copy the `Client Secret`

### Step 2: Environment Variables

Create/update your `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/audio_transcription?schema=public"

# Google AI (Gemini)
GOOGLE_API_KEY="your-google-ai-api-key-here"

# NextAuth.js - REQUIRED
NEXTAUTH_SECRET="your-super-secret-random-string-here"
NEXTAUTH_URL="http://localhost:3000"

# GitHub OAuth - REQUIRED
GITHUB_ID="your-github-oauth-client-id"
GITHUB_SECRET="your-github-oauth-client-secret"
ALLOWED_GITHUB_USERNAME="your-github-username"

# Application
NODE_ENV="development"
```

**⚠️ Important:** Replace `your-github-username` with your actual GitHub username. Only this account will be allowed to access your personal AI system.

### Step 3: Generate NextAuth Secret

```bash
# Generate a secure random secret
openssl rand -base64 32
# OR
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 4: Database Migration

```bash
# Apply authentication tables
docker-compose exec postgres psql -U postgres -d audio_transcription -f /prisma/migrations/20250107_add_authentication/migration.sql

# Generate Prisma client with new models
npx prisma generate
```

### Step 5: Start Your Secure AI

```bash
# Start the application
npm run dev
# → http://localhost:3000
```

## 🔒 Security Features

### **Single Owner Access**
- Only your GitHub account can sign in
- All other GitHub users are automatically rejected
- `ALLOWED_GITHUB_USERNAME` environment variable controls access

### **30-Day Sessions**
- Stay logged in for 30 days
- Secure JWT-based session management
- Automatic session refresh

### **Complete Route Protection**
- All pages require authentication except `/login`
- API routes protected with session validation
- Middleware automatically redirects unauthenticated users

### **User Data Linking**
- Existing transcriptions automatically linked to your account on first login
- All new transcriptions associated with your user ID
- Complete data ownership and privacy

## 🧪 Testing Authentication

### Test 1: Access Control
```bash
# Visit your app (should redirect to login)
curl -I http://localhost:3000
# → 302 redirect to /login

# Try accessing API (should require auth)
curl http://localhost:3000/api/transcribe
# → 401 Unauthorized
```

### Test 2: GitHub OAuth Flow
1. Visit `http://localhost:3000`
2. Should redirect to `/login`
3. Click "Continue with GitHub"
4. Authorize your OAuth app
5. Should redirect back to dashboard

### Test 3: Session Persistence
1. Login successfully
2. Close browser
3. Reopen and visit app
4. Should still be logged in (for 30 days)

## 🛠️ Architecture Details

### **Authentication Flow**
```
User → /login → GitHub OAuth → Callback → Session Created → Dashboard
```

### **Database Schema**
```sql
User Table:
- id, name, email, image
- githubId, githubUsername
- isOwner (true for you)
- createdAt, updatedAt

Account/Session Tables:
- NextAuth.js standard tables
- OAuth connection management
- Session persistence

AudioTranscription Table:
- Added userId field
- Foreign key to User table
- Automatic linking on first login
```

### **Middleware Protection**
```typescript
// All routes protected except:
- /login
- /api/auth/*
- Static files (_next/*, favicon.ico)
```

## 🎯 What You Get

### **Complete Privacy**
- Your personal AI conversations are secure
- No unauthorized access possible
- Professional-grade authentication

### **Seamless Experience**
- One-click GitHub login
- 30-day session persistence
- Automatic data linking

### **Future Ready**
- Foundation for sharing features
- User management already in place
- Scalable authentication system

## 🚨 Troubleshooting

### "Invalid client_id or client_secret"
- Double-check GitHub OAuth app credentials
- Ensure callback URL exactly matches: `http://localhost:3000/api/auth/callback/github`

### "Access denied for GitHub user"
- Check `ALLOWED_GITHUB_USERNAME` matches your GitHub username exactly
- Case-sensitive matching

### "NextAuth secret not configured"
- Ensure `NEXTAUTH_SECRET` is set in `.env.local`
- Generate with: `openssl rand -base64 32`

### "Database connection failed"
- Ensure PostgreSQL is running
- Check `DATABASE_URL` format
- Apply authentication migration

### "Session not persisting"
- Check browser allows cookies
- Verify `NEXTAUTH_URL` matches your domain
- Clear browser cache and try again

## 🎉 Success!

Once setup is complete, you'll have:

✅ **Secure GitHub OAuth login**
✅ **Single owner access control**  
✅ **30-day session persistence**
✅ **Complete route protection**
✅ **Automatic data linking**
✅ **Professional user interface**

**Your personal AI system is now completely secure and ready for daily use!** 🚀

---

## 🔧 Advanced Configuration

### Production Deployment
Update environment variables for production:
```env
NEXTAUTH_URL="https://your-domain.com"
GITHUB_CALLBACK_URL="https://your-domain.com/api/auth/callback/github"
```

### Custom Session Duration
Modify in `src/lib/auth.ts`:
```typescript
session: {
  maxAge: 7 * 24 * 60 * 60, // 7 days instead of 30
}
```

### MCP Server Integration
The MCP server automatically respects authentication - no additional configuration needed!

**Welcome to your secure personal AI assistant!** 🌟
