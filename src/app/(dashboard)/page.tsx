"use client";

import { useState, useEffect } from "react";

// Force dynamic rendering to prevent build-time static generation
export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  FileText, 
  Brain, 
  Users, 
  TrendingUp, 
  Clock,
  DollarSign,
  Activity,
  Plus,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  totalTranscriptions: number;
  totalSpeakers: number;
  totalKnowledgeEntities: number;
  pendingExtractions: number;
  totalCost: number;
  thisMonthCost: number;
  recentTranscriptions: Array<{
    id: string;
    fileName: string;
    createdAt: string;
    confidence: number;
    speakerCount?: number;
  }>;
  recentEntities: Array<{
    id: string;
    title: string;
    entityType: {
      displayName: string;
    };
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // We'll create this API endpoint next
      const response = await fetch("/api/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(cost);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back to your audio knowledge system</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/record">
              <Mic className="h-4 w-4 mr-2" />
              Start Recording
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transcriptions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalTranscriptions || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Knowledge Entities</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalKnowledgeEntities || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Brain className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Speakers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalSpeakers || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalCost ? formatCost(stats.totalCost) : formatCost(0)}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Get started with common tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="h-auto p-4 justify-start">
              <Link href="/record">
                <div className="flex items-center space-x-3">
                  <Mic className="h-8 w-8 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium">Record Audio</p>
                    <p className="text-sm text-gray-500">Start a new recording</p>
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4 justify-start">
              <Link href="/transcripts">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">Browse Transcripts</p>
                    <p className="text-sm text-gray-500">View all transcriptions</p>
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4 justify-start">
              <Link href="/knowledge">
                <div className="flex items-center space-x-3">
                  <Brain className="h-8 w-8 text-purple-600" />
                  <div className="text-left">
                    <p className="font-medium">Knowledge Base</p>
                    <p className="text-sm text-gray-500">Explore extracted knowledge</p>
                  </div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Transcriptions
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/transcripts">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.recentTranscriptions?.length ? (
              <div className="space-y-4">
                {stats.recentTranscriptions.map((transcript) => (
                  <div key={transcript.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{transcript.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(transcript.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {Math.round(transcript.confidence * 100)}%
                      </Badge>
                      {transcript.speakerCount && transcript.speakerCount > 1 && (
                        <Badge variant="secondary">
                          {transcript.speakerCount} speakers
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No transcriptions yet</p>
                <p className="text-sm">Start by recording or uploading audio</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Recent Knowledge
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/knowledge/entities">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.recentEntities?.length ? (
              <div className="space-y-4">
                {stats.recentEntities.map((entity) => (
                  <div key={entity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{entity.title}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(entity.createdAt)}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {entity.entityType.displayName}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No knowledge entities yet</p>
                <p className="text-sm">Knowledge will be extracted from transcripts</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Extractions Alert */}
      {stats?.pendingExtractions && stats.pendingExtractions > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-full">
                  <Brain className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-orange-900">
                    {stats.pendingExtractions} Knowledge Extractions Pending Review
                  </p>
                  <p className="text-sm text-orange-700">
                    Review and approve extracted knowledge from your transcripts
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="border-orange-300">
                <Link href="/knowledge/extractions">
                  Review Now
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
