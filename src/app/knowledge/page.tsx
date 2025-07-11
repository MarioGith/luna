"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Search, 
  Plus, 
  FileText, 
  Users, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Link as LinkIcon, 
  Tag,
  Filter,
  Grid3X3,
  List,
  Eye,
  Edit,
  MoreHorizontal,
  Lightbulb,
  Database,
  TrendingUp,
  Clock,
  Star,
  Archive,
  Trash2
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

interface EntityType {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  _count?: {
    entities: number;
  };
}

interface KnowledgeEntity {
  id: string;
  title: string;
  description?: string;
  confidence?: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  entityType: {
    id: string;
    name: string;
    displayName: string;
    color?: string;
    icon?: string;
  };
  transcription?: {
    id: string;
    fileName: string;
    createdAt: string;
  };
  attributes: Array<{
    id: string;
    key: string;
    value: string;
    dataType: string;
    isVerified: boolean;
  }>;
}

interface KnowledgeStats {
  totalEntities: number;
  totalEntityTypes: number;
  pendingExtractions: number;
  recentlyUpdated: number;
  entityTypeBreakdown: Array<{
    type: string;
    count: number;
    color?: string;
  }>;
}

type ViewMode = "grid" | "list";
type SortBy = "newest" | "oldest" | "title" | "type" | "confidence";

export default function KnowledgePage() {
  const [entities, setEntities] = useState<KnowledgeEntity[]>([]);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [filteredEntities, setFilteredEntities] = useState<KnowledgeEntity[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [filterByType, setFilterByType] = useState<string>("all");
  const [filterByVerified, setFilterByVerified] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterAndSortEntities();
  }, [entities, searchQuery, sortBy, filterByType, filterByVerified]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch entities, entity types, and stats
      const [entitiesResponse, typesResponse, extractionsResponse] = await Promise.all([
        fetch("/api/knowledge/entities?limit=100"),
        fetch("/api/knowledge/entity-types"),
        fetch("/api/knowledge/extractions?status=PENDING&limit=20")
      ]);

      if (entitiesResponse.ok) {
        const entitiesData = await entitiesResponse.json();
        setEntities(entitiesData.entities || []);
      }

      if (typesResponse.ok) {
        const typesData = await typesResponse.json();
        setEntityTypes(typesData.entityTypes || []);
      }

      // Calculate stats
      const pendingExtractions = extractionsResponse.ok ? 
        (await extractionsResponse.json()).extractions?.length || 0 : 0;

      // Mock stats calculation - in real app, this would come from API
      const mockStats: KnowledgeStats = {
        totalEntities: entities.length,
        totalEntityTypes: entityTypes.length,
        pendingExtractions,
        recentlyUpdated: entities.filter(e => 
          new Date(e.updatedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
        ).length,
        entityTypeBreakdown: entityTypes.map(type => ({
          type: type.displayName,
          count: entities.filter(e => e.entityType.id === type.id).length,
          color: type.color
        }))
      };

      setStats(mockStats);
    } catch (error) {
      console.error("Error fetching knowledge data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortEntities = () => {
    let filtered = [...entities];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(entity =>
        entity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.entityType.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.attributes.some(attr => 
          attr.value.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Apply type filter
    if (filterByType !== "all") {
      filtered = filtered.filter(entity => entity.entityType.id === filterByType);
    }

    // Apply verified filter
    if (filterByVerified !== "all") {
      filtered = filtered.filter(entity => 
        filterByVerified === "verified" ? entity.isVerified : !entity.isVerified
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "title":
          return a.title.localeCompare(b.title);
        case "type":
          return a.entityType.displayName.localeCompare(b.entityType.displayName);
        case "confidence":
          return (b.confidence || 0) - (a.confidence || 0);
        default:
          return 0;
      }
    });

    setFilteredEntities(filtered);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case "person":
      case "people":
        return Users;
      case "place":
      case "places":
      case "location":
        return MapPin;
      case "event":
      case "events":
        return Calendar;
      case "contact":
      case "contacts":
        return Phone;
      case "email":
        return Mail;
      case "url":
      case "link":
        return LinkIcon;
      case "reminder":
      case "reminders":
      case "task":
        return Clock;
      default:
        return FileText;
    }
  };

  const getAttributeIcon = (dataType: string) => {
    switch (dataType) {
      case "email":
        return "📧";
      case "phone":
        return "📞";
      case "url":
        return "🔗";
      case "date":
        return "📅";
      case "time":
        return "⏰";
      case "address":
        return "📍";
      case "number":
        return "🔢";
      default:
        return "📝";
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-gray-600">
            Organize and explore your extracted knowledge ({filteredEntities.length} entities)
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/knowledge/extractions">
              <Lightbulb className="h-4 w-4 mr-2" />
              Review Extractions
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/knowledge/entities">
              <Database className="h-4 w-4 mr-2" />
              Manage Entities
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Entities</p>
                  <p className="text-2xl font-bold">{stats.totalEntities}</p>
                </div>
                <Database className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Entity Types</p>
                  <p className="text-2xl font-bold">{stats.totalEntityTypes}</p>
                </div>
                <Tag className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold">{stats.pendingExtractions}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Recently Updated</p>
                  <p className="text-2xl font-bold">{stats.recentlyUpdated}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending Extractions Alert */}
      {stats?.pendingExtractions && stats.pendingExtractions > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lightbulb className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">
                    {stats.pendingExtractions} knowledge extractions awaiting review
                  </p>
                  <p className="text-sm text-orange-700">
                    Review and approve extracted knowledge to grow your knowledge base
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

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search knowledge..."
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
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="confidence">Confidence</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterByType} onValueChange={setFilterByType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {entityTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterByVerified} onValueChange={setFilterByVerified}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>

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

      {/* Knowledge Entities */}
      {filteredEntities.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Brain className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No knowledge entities found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || filterByType !== "all" || filterByVerified !== "all"
                  ? "Try adjusting your search or filters"
                  : "Knowledge will be automatically extracted from your transcripts"}
              </p>
              <Button asChild>
                <Link href="/knowledge/extractions">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Review Extractions
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {filteredEntities.map((entity) => {
            const IconComponent = getEntityIcon(entity.entityType.name);
            return (
              <Card key={entity.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <IconComponent className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg line-clamp-1">{entity.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{entity.entityType.displayName}</Badge>
                          {entity.isVerified && (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <Star className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {entity.confidence && (
                            <Badge variant="outline">
                              {Math.round(entity.confidence * 100)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem asChild>
                          <Link href={`/knowledge/${entity.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/knowledge/${entity.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
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
                  {entity.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {entity.description}
                    </p>
                  )}
                  
                  {entity.attributes.length > 0 && (
                    <div className="space-y-2">
                      {entity.attributes.slice(0, 3).map((attr) => (
                        <div key={attr.id} className="flex items-center gap-2 text-sm">
                          <span>{getAttributeIcon(attr.dataType)}</span>
                          <span className="font-medium">{attr.key}:</span>
                          <span className="text-gray-600 truncate">{attr.value}</span>
                          {attr.isVerified && (
                            <Star className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      ))}
                      {entity.attributes.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{entity.attributes.length - 3} more attributes
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-4 pt-3 border-t text-xs text-gray-500">
                    <span>Updated {formatDate(entity.updatedAt)}</span>
                    {entity.transcription && (
                      <span>From: {entity.transcription.fileName}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Entity Type Breakdown */}
      {stats && stats.entityTypeBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.entityTypeBreakdown.map((item, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{item.count}</div>
                  <div className="text-sm text-gray-600">{item.type}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
