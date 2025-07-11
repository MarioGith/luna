"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Lightbulb, 
  Check, 
  X, 
  Edit, 
  FileText, 
  Calendar,
  Users,
  MapPin,
  Phone,
  Mail,
  LinkIcon,
  Clock,
  AlertCircle,
  RefreshCw,
  Filter,
  Search,
  ChevronRight,
  ChevronDown,
  Star,
  Trash2,
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

interface KnowledgeExtraction {
  id: string;
  transcriptionId: string;
  extractedData: any;
  confidence: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_REVIEW";
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  transcription: {
    id: string;
    fileName: string;
    createdAt: string;
    originalText: string;
  };
  suggestedEntities: Array<{
    type: string;
    title: string;
    description?: string;
    confidence: number;
    attributes: Array<{
      key: string;
      value: string;
      dataType: string;
      confidence: number;
    }>;
  }>;
}

export default function KnowledgeExtractionsPage() {
  const [extractions, setExtractions] = useState<KnowledgeExtraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedExtractions, setExpandedExtractions] = useState<Set<string>>(new Set());
  const [editingExtractions, setEditingExtractions] = useState<Set<string>>(new Set());
  const [processingExtractions, setProcessingExtractions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [sortBy, setSortBy] = useState<string>("newest");

  useEffect(() => {
    fetchExtractions();
  }, [statusFilter]);

  const fetchExtractions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/knowledge/extractions?status=${statusFilter}&limit=50`);
      const data = await response.json();
      setExtractions(data.extractions || []);
    } catch (error) {
      console.error("Error fetching extractions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpansion = (id: string) => {
    setExpandedExtractions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleApprove = async (extractionId: string) => {
    setProcessingExtractions(prev => new Set(prev).add(extractionId));
    try {
      // Here you would make an API call to approve the extraction
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Update the extraction status
      setExtractions(prev => prev.map(extraction =>
        extraction.id === extractionId
          ? { ...extraction, status: "APPROVED" as const, reviewedAt: new Date().toISOString() }
          : extraction
      ));
      
      // Show success message
      alert("Knowledge extraction approved successfully!");
    } catch (error) {
      console.error("Error approving extraction:", error);
      alert("Failed to approve extraction");
    } finally {
      setProcessingExtractions(prev => {
        const newSet = new Set(prev);
        newSet.delete(extractionId);
        return newSet;
      });
    }
  };

  const handleReject = async (extractionId: string) => {
    setProcessingExtractions(prev => new Set(prev).add(extractionId));
    try {
      // Here you would make an API call to reject the extraction
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Update the extraction status
      setExtractions(prev => prev.map(extraction =>
        extraction.id === extractionId
          ? { ...extraction, status: "REJECTED" as const, reviewedAt: new Date().toISOString() }
          : extraction
      ));
      
      // Show success message
      alert("Knowledge extraction rejected");
    } catch (error) {
      console.error("Error rejecting extraction:", error);
      alert("Failed to reject extraction");
    } finally {
      setProcessingExtractions(prev => {
        const newSet = new Set(prev);
        newSet.delete(extractionId);
        return newSet;
      });
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "NEEDS_REVIEW":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredExtractions = extractions.filter(extraction => {
    const matchesSearch = !searchQuery || 
      extraction.transcription.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (extraction.suggestedEntities || []).some(entity => 
        entity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {[...Array(3)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Extractions</h1>
          <p className="text-gray-600">
            Review and approve extracted knowledge from your transcripts ({filteredExtractions.length} items)
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/knowledge">
              <Lightbulb className="h-4 w-4 mr-2" />
              Knowledge Base
            </Link>
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search extractions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending Review</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="NEEDS_REVIEW">Needs Review</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="confidence">Confidence</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Instructions */}
      {statusFilter === "PENDING" && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Review Knowledge Extractions</p>
                <p className="text-sm text-blue-700 mt-1">
                  AI has automatically extracted knowledge from your transcripts. Review each extraction and approve those that are accurate to add them to your knowledge base.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extractions List */}
      {filteredExtractions.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Lightbulb className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No extractions found</h3>
              <p className="text-gray-600 mb-4">
                {statusFilter === "PENDING" 
                  ? "No pending extractions at the moment. New extractions will appear here after transcribing audio."
                  : `No ${statusFilter.toLowerCase()} extractions found.`}
              </p>
              <Button asChild>
                <Link href="/record">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Transcript
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredExtractions.map((extraction) => (
            <Card key={extraction.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpansion(extraction.id)}
                        className="h-8 w-8 p-0"
                      >
                        {expandedExtractions.has(extraction.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <div>
                        <CardTitle className="text-lg">{extraction.transcription.fileName}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {(extraction.suggestedEntities || []).length} entities extracted • {formatDate(extraction.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(extraction.status)}>
                      {extraction.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline">
                      {Math.round(extraction.confidence * 100)}% confidence
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Entity Preview */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {(extraction.suggestedEntities || []).slice(0, 3).map((entity, index) => {
                      const IconComponent = getEntityIcon(entity.type);
                      return (
                        <div key={index} className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
                          <IconComponent className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium">{entity.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {entity.type}
                          </Badge>
                        </div>
                      );
                    })}
                    {(extraction.suggestedEntities || []).length > 3 && (
                      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
                        <span className="text-sm text-gray-600">
                          +{(extraction.suggestedEntities || []).length - 3} more
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedExtractions.has(extraction.id) && (
                  <div className="space-y-6 border-t pt-4">
                    {/* Source Context */}
                    <div>
                      <h4 className="font-medium mb-2">Source Context</h4>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {extraction.transcription.originalText}
                        </p>
                        <Button asChild variant="ghost" size="sm" className="mt-2">
                          <Link href={`/transcripts/${extraction.transcriptionId}`}>
                            View Full Transcript
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Suggested Entities */}
                    <div>
                      <h4 className="font-medium mb-3">Suggested Entities</h4>
                      <div className="space-y-4">
                        {(extraction.suggestedEntities || []).map((entity, index) => {
                          const IconComponent = getEntityIcon(entity.type);
                          return (
                            <div key={index} className="border rounded-lg p-4 bg-white">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <IconComponent className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h5 className="font-medium">{entity.title}</h5>
                                    <Badge variant="secondary">{entity.type}</Badge>
                                    <Badge variant="outline">
                                      {Math.round(entity.confidence * 100)}%
                                    </Badge>
                                  </div>
                                  {entity.description && (
                                    <p className="text-sm text-gray-600 mb-3">{entity.description}</p>
                                  )}
                                  
                                  {/* Entity Attributes */}
                                  {entity.attributes.length > 0 && (
                                    <div className="space-y-2">
                                      {entity.attributes.map((attr, attrIndex) => (
                                        <div key={attrIndex} className="flex items-center gap-2 text-sm">
                                          <span>{getAttributeIcon(attr.dataType)}</span>
                                          <span className="font-medium">{attr.key}:</span>
                                          <span className="text-gray-600">{attr.value}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {Math.round(attr.confidence * 100)}%
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {extraction.status === "PENDING" && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      onClick={() => handleApprove(extraction.id)}
                      disabled={processingExtractions.has(extraction.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processingExtractions.has(extraction.id) ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReject(extraction.id)}
                      disabled={processingExtractions.has(extraction.id)}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      {processingExtractions.has(extraction.id) ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-2" />
                      )}
                      Reject
                    </Button>
                    <Button variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit & Approve
                    </Button>
                  </div>
                )}

                {/* Review Info */}
                {extraction.reviewedAt && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      Reviewed on {formatDate(extraction.reviewedAt)}
                      {extraction.reviewNote && (
                        <span className="block mt-1 italic">"{extraction.reviewNote}"</span>
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
