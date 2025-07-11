"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Calendar,
  Tag,
  Users,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  Download,
  MoreHorizontal,
  Plus,
  Settings
} from "lucide-react";
import Link from "next/link";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Transcription {
  id: string;
  originalText: string;
  markdown: string;
  fileName: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  confidence: number;
  sourceType: "FILE" | "LIVE_RECORDING";
  fileSize?: number;
  duration?: number;
  language?: string;
  speakerCount?: number;
  hasSpeakerDiarization?: boolean;
  totalCost?: number;
  inputTokens?: number;
  outputTokens?: number;
  transcriptionModel?: string;
  isAnalyzed?: boolean;
}

type ViewMode = "grid" | "list";
type SortBy = "newest" | "oldest" | "name" | "cost" | "confidence";

export default function TranscriptsPage() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [filteredTranscriptions, setFilteredTranscriptions] = useState<Transcription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [filterBySource, setFilterBySource] = useState<string>("all");
  const [filterByTag, setFilterByTag] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    fetchTranscriptions();
  }, []);

  useEffect(() => {
    filterAndSortTranscriptions();
  }, [transcriptions, searchQuery, sortBy, filterBySource, filterByTag]);

  const fetchTranscriptions = async () => {
    try {
      const response = await fetch("/api/search?limit=100");
      const data = await response.json();
      setTranscriptions(data.transcriptions || []);
    } catch (error) {
      console.error("Error fetching transcriptions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortTranscriptions = () => {
    let filtered = [...transcriptions];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (t) =>
          t.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.originalText.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply source filter
    if (filterBySource !== "all") {
      filtered = filtered.filter((t) => t.sourceType === filterBySource);
    }

    // Apply tag filter
    if (filterByTag !== "all") {
      filtered = filtered.filter((t) => t.tags.includes(filterByTag));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name":
          return a.fileName.localeCompare(b.fileName);
        case "cost":
          return (b.totalCost || 0) - (a.totalCost || 0);
        case "confidence":
          return b.confidence - a.confidence;
        default:
          return 0;
      }
    });

    setFilteredTranscriptions(filtered);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(cost);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "Unknown";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getAllTags = () => {
    const allTags = transcriptions.flatMap((t) => t.tags);
    return [...new Set(allTags)].sort();
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Transcripts</h1>
          <p className="text-gray-600">
            Manage and explore your audio transcriptions ({filteredTranscriptions.length} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/record">
              <Plus className="h-4 w-4 mr-2" />
              New Transcript
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transcripts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="cost">Cost</SelectItem>
                  <SelectItem value="confidence">Confidence</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterBySource} onValueChange={setFilterBySource}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="FILE">File Upload</SelectItem>
                  <SelectItem value="LIVE_RECORDING">Live Recording</SelectItem>
                </SelectContent>
              </Select>

              {getAllTags().length > 0 && (
                <Select value={filterByTag} onValueChange={setFilterByTag}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {getAllTags().map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedItems.length} items selected
                </span>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <Tag className="h-4 w-4 mr-2" />
                  Add Tags
                </Button>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcripts Grid/List */}
      {filteredTranscriptions.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transcripts found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || filterBySource !== "all" || filterByTag !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first transcript"}
              </p>
              <Button asChild>
                <Link href="/record">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Transcript
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {filteredTranscriptions.map((transcript) => (
            <Card 
              key={transcript.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedItems.includes(transcript.id) ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => toggleItemSelection(transcript.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-1">{transcript.fileName}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={transcript.sourceType === "LIVE_RECORDING" ? "default" : "secondary"}>
                        {transcript.sourceType === "LIVE_RECORDING" ? "Live" : "File"}
                      </Badge>
                      <Badge variant="outline">
                        {Math.round(transcript.confidence * 100)}%
                      </Badge>
                      {transcript.speakerCount && transcript.speakerCount > 1 && (
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {transcript.speakerCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem asChild>
                        <Link href={`/transcripts/${transcript.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/transcripts/${transcript.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                  {transcript.originalText}
                </p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Created: {formatDate(transcript.createdAt)}</span>
                    {transcript.totalCost && (
                      <span>Cost: {formatCost(transcript.totalCost)}</span>
                    )}
                  </div>
                  
                  {transcript.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {transcript.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {transcript.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{transcript.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
