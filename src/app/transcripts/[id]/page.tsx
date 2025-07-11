"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  Download, 
  Edit, 
  Save, 
  X, 
  Tag, 
  Mic, 
  Upload, 
  Play, 
  Pause,
  Volume2,
  Eye,
  EyeOff,
  RefreshCw,
  Brain,
  Settings,
  Info
} from "lucide-react";
import { SpeakerAssignmentDialog } from "@/components/SpeakerAssignmentDialog";
import { KnowledgeExtractionPanel } from "@/components/KnowledgeExtractionPanel";

interface TranscriptionSpeaker {
  id: string;
  transcriptionId: string;
  speakerId: string | null;
  detectedSpeakerLabel: string;
  segments?: string;
  confidence?: number;
  speaker?: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    _count?: {
      transcriptionSpeakers: number;
    };
  };
}

interface Transcription {
  id: string;
  originalText: string;
  markdown: string;
  fileName: string;
  filePath?: string;
  fileSize?: number;
  duration?: number;
  language?: string;
  confidence: number;
  sourceType: "FILE" | "LIVE_RECORDING";
  tags: string[];
  createdAt: string;
  updatedAt: string;
  // Cost information
  inputTokens?: number;
  outputTokens?: number;
  transcriptionCost?: number;
  embeddingCost?: number;
  totalCost?: number;
  transcriptionModel?: string;
  embeddingModel?: string;
  exchangeRate?: number;
  // Speaker information
  speakerCount?: number;
  hasSpeakerDiarization?: boolean;
  speakerTranscription?: string;
  speakerMetadata?: string;
  transcriptionSpeakers?: TranscriptionSpeaker[];
  // Analysis
  hasBeenAnalyzed?: boolean;
  analysisStatus?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  analysisError?: string;
}

export default function TranscriptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [transcript, setTranscript] = useState<Transcription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState<string>("");
  const [editedTags, setEditedTags] = useState<string>("");
  const [showSpeakerView, setShowSpeakerView] = useState(false);
  const [showKnowledgePanel, setShowKnowledgePanel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchTranscript(params.id as string);
    }
  }, [params.id]);

  const fetchTranscript = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First, try to get the transcript from the search API
      const response = await fetch(`/api/search?limit=1000`);
      const data = await response.json();
      
      if (data.transcriptions) {
        const found = data.transcriptions.find((t: any) => t.id === id);
        if (found) {
          setTranscript(found);
          setEditedTranscript(found.markdown);
          setEditedTags(found.tags.join(", "));
          return;
        }
      }
      
      // If not found in search, transcript doesn't exist
      setError("Transcript not found");
    } catch (error) {
      console.error("Error fetching transcript:", error);
      setError("Failed to load transcript");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!transcript) return;

    setIsSaving(true);
    try {
      // Here you would typically make an API call to update the transcript
      // For now, we'll just simulate the save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedTranscript = {
        ...transcript,
        markdown: editedTranscript,
        tags: editedTags.split(",").map(tag => tag.trim()).filter(Boolean),
        updatedAt: new Date().toISOString(),
      };
      
      setTranscript(updatedTranscript);
      setIsEditing(false);
      
      // Show success message
      // You would implement proper toast notifications here
      alert("Transcript updated successfully!");
    } catch (error) {
      console.error("Error saving transcript:", error);
      alert("Failed to save transcript");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (transcript) {
      setEditedTranscript(transcript.markdown);
      setEditedTags(transcript.tags.join(", "));
    }
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
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

  const exportTranscript = (format: "txt" | "md" | "json") => {
    if (!transcript) return;

    let content: string;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case "txt":
        content = transcript.originalText;
        mimeType = "text/plain";
        extension = "txt";
        break;
      case "md":
        content = transcript.markdown;
        mimeType = "text/markdown";
        extension = "md";
        break;
      case "json":
        content = JSON.stringify(transcript, null, 2);
        mimeType = "application/json";
        extension = "json";
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${transcript.fileName.replace(/\.[^/.]+$/, "")}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Transcript</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => router.push("/transcripts")}>
          Back to Transcripts
        </Button>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Transcript Not Found</h2>
        <p className="text-gray-600 mb-4">The transcript you're looking for doesn't exist.</p>
        <Button onClick={() => router.push("/transcripts")}>
          Back to Transcripts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{transcript.fileName}</h1>
          <p className="text-gray-600 mt-1">
            Created {formatDate(transcript.createdAt)}
            {transcript.updatedAt !== transcript.createdAt && (
              <span> • Updated {formatDate(transcript.updatedAt)}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowKnowledgePanel(!showKnowledgePanel)}
          >
            <Brain className="h-4 w-4 mr-2" />
            {showKnowledgePanel ? "Hide" : "Show"} Knowledge
          </Button>
          <Button
            variant="outline"
            onClick={() => exportTranscript("md")}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Badge variant={transcript.sourceType === "LIVE_RECORDING" ? "default" : "secondary"}>
                {transcript.sourceType === "LIVE_RECORDING" ? (
                  <><Mic className="h-3 w-3 mr-1" /> Live</>
                ) : (
                  <><Upload className="h-3 w-3 mr-1" /> File</>
                )}
              </Badge>
              <Badge variant="outline">
                {Math.round(transcript.confidence * 100)}% confident
              </Badge>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {transcript.fileSize && (
                <p>Size: {formatFileSize(transcript.fileSize)}</p>
              )}
              {transcript.duration && (
                <p>Duration: {formatDuration(transcript.duration)}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {transcript.speakerCount && transcript.speakerCount > 1 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="font-medium">{transcript.speakerCount} Speakers</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSpeakerView(!showSpeakerView)}
                >
                  {showSpeakerView ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                  {showSpeakerView ? "Hide" : "Show"} Speakers
                </Button>
                {transcript.transcriptionSpeakers && (
                  <SpeakerAssignmentDialog
                    transcriptionId={transcript.id}
                    transcriptionSpeakers={transcript.transcriptionSpeakers}
                    onAssignmentComplete={() => fetchTranscript(transcript.id)}
                  >
                    <Button variant="outline" size="sm">
                      <Settings className="h-3 w-3 mr-1" />
                      Assign
                    </Button>
                  </SpeakerAssignmentDialog>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {transcript.totalCost && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">Cost: {formatCost(transcript.totalCost)}</span>
              </div>
              <div className="text-sm text-gray-600">
                {transcript.inputTokens && transcript.outputTokens && (
                  <p>{transcript.inputTokens + transcript.outputTokens} tokens</p>
                )}
                {transcript.transcriptionModel && (
                  <p>Model: {transcript.transcriptionModel}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {transcript.hasBeenAnalyzed && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-green-600" />
                <span className="font-medium">Knowledge Extracted</span>
              </div>
              <div className="text-sm text-gray-600">
                <p>Status: {transcript.analysisStatus || "Completed"}</p>
                {transcript.analysisError && (
                  <p className="text-red-600">Error: {transcript.analysisError}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tags */}
      {(transcript.tags.length > 0 || isEditing) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={editedTags}
                  onChange={(e) => setEditedTags(e.target.value)}
                  placeholder="meeting, notes, important"
                />
              </div>
            ) : transcript.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {transcript.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No tags</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Transcription
                {showSpeakerView && transcript.hasSpeakerDiarization && (
                  <Badge variant="secondary">Speaker View</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <Label htmlFor="transcript">Transcript Content</Label>
                  <Textarea
                    id="transcript"
                    value={editedTranscript}
                    onChange={(e) => setEditedTranscript(e.target.value)}
                    rows={20}
                    className="font-mono text-sm"
                  />
                </div>
              ) : (
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                    {showSpeakerView && transcript.speakerTranscription
                      ? transcript.speakerTranscription
                      : transcript.originalText}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Options
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => exportTranscript("txt")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Plain Text (.txt)
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => exportTranscript("md")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Markdown (.md)
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => exportTranscript("json")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  JSON (.json)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Technical Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Language:</span>
                  <span>{transcript.language || "Auto-detected"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Confidence:</span>
                  <span>{Math.round(transcript.confidence * 100)}%</span>
                </div>
                {transcript.transcriptionModel && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model:</span>
                    <span>{transcript.transcriptionModel}</span>
                  </div>
                )}
                {transcript.exchangeRate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exchange Rate:</span>
                    <span>{transcript.exchangeRate.toFixed(4)} CAD/USD</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Knowledge Panel */}
      {showKnowledgePanel && (
        <div className="mt-8">
          <KnowledgeExtractionPanel />
        </div>
      )}
    </div>
  );
}
