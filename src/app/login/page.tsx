"use client"

import { signIn, getSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Github, Mic, Brain, Database, Search } from "lucide-react"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already authenticated
    getSession().then((session) => {
      if (session) {
        router.push("/")
      }
    })
  }, [router])

  const handleGitHubSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn("github", { callbackUrl: "/" })
    } catch (error) {
      console.error("Sign in error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="relative">
              <Mic className="h-8 w-8 text-purple-400" />
              <Brain className="h-4 w-4 text-blue-400 absolute -top-1 -right-1" />
            </div>
            <h1 className="text-2xl font-bold text-white">Luna AI</h1>
          </div>
          <p className="text-slate-300 text-sm">
            Your Personal AI Assistant for Audio Transcription & Knowledge Management
          </p>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <Mic className="h-5 w-5 text-purple-400 mx-auto mb-1" />
            <p className="text-xs text-slate-300">Smart Recording</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <Search className="h-5 w-5 text-blue-400 mx-auto mb-1" />
            <p className="text-xs text-slate-300">Vector Search</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <Brain className="h-5 w-5 text-green-400 mx-auto mb-1" />
            <p className="text-xs text-slate-300">AI Knowledge</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <Database className="h-5 w-5 text-amber-400 mx-auto mb-1" />
            <p className="text-xs text-slate-300">Smart Schema</p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Welcome Back</CardTitle>
            <CardDescription className="text-slate-300">
              Sign in to access your personal AI system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleGitHubSignIn}
              disabled={isLoading}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Github className="h-4 w-4" />
                  <span>Continue with GitHub</span>
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center text-xs text-slate-400 bg-slate-800/30 rounded-lg p-3 border border-slate-700">
          <p>🔒 Secure Personal AI System</p>
          <p className="mt-1">Only authorized users can access this system</p>
        </div>

        {/* Tech Stack */}
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-2">Powered by</p>
          <div className="flex items-center justify-center space-x-4 text-xs text-slate-400">
            <span>Next.js</span>
            <span>•</span>
            <span>Gemini AI</span>
            <span>•</span>
            <span>PostgreSQL</span>
            <span>•</span>
            <span>pgvector</span>
          </div>
        </div>
      </div>
    </div>
  )
}
