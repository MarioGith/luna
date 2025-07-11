import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import GitHubProvider from "next-auth/providers/github"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface GitHubProfile {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar_url: string
  [key: string]: any
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      profile(profile: GitHubProfile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          githubId: profile.id.toString(),
          githubUsername: profile.login,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only allow your GitHub account to sign in
      const allowedGitHubUsername = process.env.ALLOWED_GITHUB_USERNAME
      
      if (account?.provider === "github" && profile) {
        const githubProfile = profile as GitHubProfile
        
        // Check if this is your GitHub account
        if (githubProfile.login !== allowedGitHubUsername) {
          console.log(`Access denied for GitHub user: ${githubProfile.login}`)
          return false
        }
        
        // Mark as owner on first login
        if (user.email) {
          await prisma.user.upsert({
            where: { email: user.email },
            update: {
              isOwner: true,
              githubId: githubProfile.id?.toString(),
              githubUsername: githubProfile.login,
            },
            create: {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              isOwner: true,
              githubId: githubProfile.id?.toString(),
              githubUsername: githubProfile.login,
            },
          })
          
          // Link existing transcriptions to this user on first login
          await prisma.audioTranscription.updateMany({
            where: { userId: null },
            data: { userId: user.id },
          })
        }
      }
      
      return true
    },
    async session({ token, session }) {
      if (token && session.user) {
        session.user.id = token.sub!
        
        // Add user details to session
        const user = await prisma.user.findUnique({
          where: { id: token.sub! },
          select: {
            id: true,
            isOwner: true,
            githubUsername: true,
            createdAt: true,
          },
        })
        
        if (user) {
          session.user.isOwner = user.isOwner
          session.user.githubUsername = user.githubUsername
        }
      }
      return session
    },
    async jwt({ user, token }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: process.env.NODE_ENV === "development",
}

// Extend the default session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      isOwner?: boolean
      githubUsername?: string | null
    }
  }
}
