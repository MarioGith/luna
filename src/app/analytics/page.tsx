"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  FileText, 
  Brain, 
  Clock, 
  Calendar,
  Download,
  Settings,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  Target,
  Gauge
} from "lucide-react";
import Link from "next/link";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface AnalyticsData {
  overview: {
    totalTranscriptions: number;
    totalSpeakers: number;
    totalKnowledgeEntities: number;
    totalCost: number;
    thisMonth: {
      transcriptions: number;
      speakers: number;
      cost: number;
      entities: number;
    };
    lastMonth: {
      transcriptions: number;
      speakers: number;
      cost: number;
      entities: number;
    };
  };
  usage: {
    dailyTranscriptions: Array<{
      date: string;
      count: number;
      cost: number;
    }>;
    weeklyTrends: Array<{
      week: string;
      transcriptions: number;
      avgConfidence: number;
    }>;
    peakHours: Array<{
      hour: number;
      count: number;
    }>;
  };
  quality: {
    avgConfidence: number;
    confidenceDistribution: Array<{
      range: string;
      count: number;
    }>;
    processingTime: {
      average: number;
      median: number;
      p95: number;
    };
  };
  costs: {
    monthlyBreakdown: Array<{
      month: string;
      transcription: number;
      embedding: number;
      total: number;
    }>;
    modelEfficiency: Array<{
      model: string;
      usage: number;
      cost: number;
      efficiency: number;
    }>;
  };
  speakers: {
    verificationRate: number;
    mostActiveTop5: Array<{
      name: string;
      transcriptions: number;
      isVerified: boolean;
    }>;
    distribution: Array<{
      status: string;
      count: number;
    }>;
  };
  knowledge: {
    extractionSuccessRate: number;
    entityTypes: Array<{
      type: string;
      count: number;
      growth: number;
    }>;
    pendingReviews: number;
  };
}

type TimeRange = "7d" | "30d" | "90d" | "1y";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`);
      const data = await response.json();
      
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAnalytics();
    setIsRefreshing(false);
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 1,
    }).format(value);
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (growth < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return "text-green-600";
    if (growth < 0) return "text-red-600";
    return "text-gray-600";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
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

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Analytics</h2>
        <p className="text-gray-600 mb-4">There was an error loading your analytics data.</p>
        <Button onClick={fetchAnalytics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">
            Insights and trends for your audio transcription system
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transcriptions</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalTranscriptions}</p>
                <div className="flex items-center gap-1 mt-1">
                  {getGrowthIcon(calculateGrowth(analytics.overview.thisMonth.transcriptions, analytics.overview.lastMonth.transcriptions))}
                  <span className={`text-xs ${getGrowthColor(calculateGrowth(analytics.overview.thisMonth.transcriptions, analytics.overview.lastMonth.transcriptions))}`}>
                    {Math.abs(calculateGrowth(analytics.overview.thisMonth.transcriptions, analytics.overview.lastMonth.transcriptions)).toFixed(1)}% vs last month
                  </span>
                </div>
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
                <p className="text-sm font-medium text-gray-600">Total Speakers</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalSpeakers}</p>
                <div className="flex items-center gap-1 mt-1">
                  {getGrowthIcon(calculateGrowth(analytics.overview.thisMonth.speakers, analytics.overview.lastMonth.speakers))}
                  <span className={`text-xs ${getGrowthColor(calculateGrowth(analytics.overview.thisMonth.speakers, analytics.overview.lastMonth.speakers))}`}>
                    {Math.abs(calculateGrowth(analytics.overview.thisMonth.speakers, analytics.overview.lastMonth.speakers)).toFixed(1)}% vs last month
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Knowledge Entities</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalKnowledgeEntities}</p>
                <div className="flex items-center gap-1 mt-1">
                  {getGrowthIcon(calculateGrowth(analytics.overview.thisMonth.entities, analytics.overview.lastMonth.entities))}
                  <span className={`text-xs ${getGrowthColor(calculateGrowth(analytics.overview.thisMonth.entities, analytics.overview.lastMonth.entities))}`}>
                    {Math.abs(calculateGrowth(analytics.overview.thisMonth.entities, analytics.overview.lastMonth.entities)).toFixed(1)}% vs last month
                  </span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.overview.totalCost)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {getGrowthIcon(calculateGrowth(analytics.overview.thisMonth.cost, analytics.overview.lastMonth.cost))}
                  <span className={`text-xs ${getGrowthColor(calculateGrowth(analytics.overview.thisMonth.cost, analytics.overview.lastMonth.cost))}`}>
                    {Math.abs(calculateGrowth(analytics.overview.thisMonth.cost, analytics.overview.lastMonth.cost)).toFixed(1)}% vs last month
                  </span>
                </div>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <Link href="/analytics/usage" className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Usage Analytics</p>
                  <p className="text-sm text-gray-600">Trends & patterns</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <Link href="/analytics/costs" className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Cost Analysis</p>
                  <p className="text-sm text-gray-600">Financial insights</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <Link href="/analytics/speakers" className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Speaker Analysis</p>
                  <p className="text-sm text-gray-600">Activity & patterns</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <Link href="/analytics/knowledge" className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Brain className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Knowledge Insights</p>
                  <p className="text-sm text-gray-600">Growth & quality</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average Confidence</span>
                <span className="text-lg font-bold">{formatPercent(analytics.quality.avgConfidence)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Processing Time (avg)</span>
                <span className="text-lg font-bold">{analytics.quality.processingTime.average.toFixed(1)}s</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Speaker Verification Rate</span>
                <span className="text-lg font-bold">{formatPercent(analytics.speakers.verificationRate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Knowledge Extraction Rate</span>
                <span className="text-lg font-bold">{formatPercent(analytics.knowledge.extractionSuccessRate)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">This Month Transcriptions</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{analytics.overview.thisMonth.transcriptions}</span>
                  {getGrowthIcon(calculateGrowth(analytics.overview.thisMonth.transcriptions, analytics.overview.lastMonth.transcriptions))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">New Speakers</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{analytics.overview.thisMonth.speakers}</span>
                  {getGrowthIcon(calculateGrowth(analytics.overview.thisMonth.speakers, analytics.overview.lastMonth.speakers))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Knowledge Entities</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{analytics.overview.thisMonth.entities}</span>
                  {getGrowthIcon(calculateGrowth(analytics.overview.thisMonth.entities, analytics.overview.lastMonth.entities))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pending Reviews</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{analytics.knowledge.pendingReviews}</span>
                  <Badge variant="outline" className="text-xs">
                    Action needed
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Most Active Speakers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.speakers.mostActiveTop5.map((speaker, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{speaker.name}</p>
                      <p className="text-sm text-gray-600">{speaker.transcriptions} transcriptions</p>
                    </div>
                  </div>
                  {speaker.isVerified && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Verified
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Knowledge Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.knowledge.entityTypes.map((type, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{type.type}</p>
                    <p className="text-sm text-gray-600">{type.count} entities</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${getGrowthColor(type.growth)}`}>
                      +{formatPercent(type.growth)}
                    </span>
                    {getGrowthIcon(type.growth)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
