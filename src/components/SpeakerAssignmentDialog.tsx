"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Plus, Brain, TrendingUp } from "lucide-react";

interface Speaker {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    transcriptionSpeakers: number;
  };
}

interface TranscriptionSpeaker {
  id: string;
  transcriptionId: string;
  speakerId: string | null;
  detectedSpeakerLabel: string;
  segments?: string;
  confidence?: number;
  speaker?: Speaker;
}

interface SpeakerSuggestion {
  speakerId: string;
  speakerName: string;
  confidence: number;
  reason: string;
}

interface SpeakerAssignmentDialogProps {
  transcriptionId: string;
  transcriptionSpeakers: TranscriptionSpeaker[];
  onAssignmentComplete: () => void;
  children: React.ReactNode;
}

export function SpeakerAssignmentDialog({
  transcriptionId,
  transcriptionSpeakers,
  onAssignmentComplete,
  children,
}: SpeakerAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [newSpeakerName, setNewSpeakerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<
    Record<string, SpeakerSuggestion[]>
  >({});

  const fetchSpeakers = async () => {
    try {
      const response = await fetch("/api/speakers");
      const data = await response.json();
      setSpeakers(data.speakers || []);
    } catch (error) {
      console.error("Error fetching speakers:", error);
    }
  };

  const generateSuggestions = useCallback(async () => {
    try {
      const response = await fetch("/api/speakers/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptionId }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || {});
      }
    } catch (error) {
      console.error("Error getting speaker suggestions:", error);
    }
  }, [transcriptionId]);

  useEffect(() => {
    if (open) {
      fetchSpeakers();
      generateSuggestions();
      // Initialize assignments with existing assignments
      const existingAssignments: Record<string, string> = {};
      transcriptionSpeakers.forEach((ts) => {
        if (ts.speakerId) {
          existingAssignments[ts.detectedSpeakerLabel] = ts.speakerId;
        }
      });
      setAssignments(existingAssignments);
    }
  }, [open, transcriptionSpeakers, generateSuggestions]);

  const createSpeaker = async (name: string): Promise<string | null> => {
    try {
      const response = await fetch("/api/speakers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const speaker = await response.json();
        setSpeakers((prev) => [...prev, speaker]);
        return speaker.id;
      }
    } catch (error) {
      console.error("Error creating speaker:", error);
    }
    return null;
  };

  const handleAssignSpeaker = (detectedLabel: string, speakerId: string) => {
    setAssignments((prev) => ({
      ...prev,
      [detectedLabel]: speakerId,
    }));
  };

  const handleCreateAndAssign = async (detectedLabel: string) => {
    if (!newSpeakerName.trim()) return;

    const speakerId = await createSpeaker(newSpeakerName.trim());
    if (speakerId) {
      handleAssignSpeaker(detectedLabel, speakerId);
      setNewSpeakerName("");
    }
  };

  const applySuggestion = (
    detectedLabel: string,
    suggestion: SpeakerSuggestion
  ) => {
    handleAssignSpeaker(detectedLabel, suggestion.speakerId);
  };

  const saveAssignments = async () => {
    setIsLoading(true);
    try {
      const assignmentData = transcriptionSpeakers.map((ts) => ({
        detectedSpeakerLabel: ts.detectedSpeakerLabel,
        speakerId: assignments[ts.detectedSpeakerLabel] || null,
        confidence: assignments[ts.detectedSpeakerLabel] ? 1.0 : null,
      }));

      const response = await fetch("/api/speakers/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptionId,
          assignments: assignmentData,
        }),
      });

      if (response.ok) {
        setOpen(false);
        onAssignmentComplete();
      }
    } catch (error) {
      console.error("Error saving assignments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAssignedCount = () => {
    return Object.keys(assignments).filter((key) => assignments[key]).length;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Speakers
          </DialogTitle>
          <DialogDescription>
            Assign detected speakers to existing speaker profiles or create new
            ones. Progress: {getAssignedCount()}/{transcriptionSpeakers.length}{" "}
            assigned
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {transcriptionSpeakers.map((ts) => (
            <Card key={ts.detectedSpeakerLabel}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{ts.detectedSpeakerLabel}</span>
                  {assignments[ts.detectedSpeakerLabel] && (
                    <Badge variant="secondary">Assigned</Badge>
                  )}
                </CardTitle>
                {ts.confidence && (
                  <CardDescription>
                    Detection confidence: {Math.round(ts.confidence * 100)}%
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Suggestions */}
                {suggestions[ts.detectedSpeakerLabel] &&
                  suggestions[ts.detectedSpeakerLabel].length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        <Label className="text-sm font-medium">
                          AI Suggestions
                        </Label>
                      </div>
                      <div className="space-y-2">
                        {suggestions[ts.detectedSpeakerLabel].map(
                          (suggestion, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 border rounded-lg bg-blue-50"
                            >
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">
                                  {suggestion.speakerName}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(suggestion.confidence * 100)}%
                                  match
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {suggestion.reason}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    applySuggestion(
                                      ts.detectedSpeakerLabel,
                                      suggestion
                                    )
                                  }
                                >
                                  Apply
                                </Button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                      <Separator />
                    </div>
                  )}

                {/* Existing Speaker Assignment */}
                <div className="space-y-2">
                  <Label>Assign to existing speaker</Label>
                  <Select
                    value={assignments[ts.detectedSpeakerLabel] || ""}
                    onValueChange={(value) =>
                      handleAssignSpeaker(ts.detectedSpeakerLabel, value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a speaker..." />
                    </SelectTrigger>
                    <SelectContent>
                      {speakers.map((speaker) => (
                        <SelectItem key={speaker.id} value={speaker.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{speaker.name}</span>
                            {speaker._count && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {speaker._count.transcriptionSpeakers}{" "}
                                transcriptions
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Create New Speaker */}
                <div className="space-y-2">
                  <Label>Or create new speaker</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter speaker name..."
                      value={newSpeakerName}
                      onChange={(e) => setNewSpeakerName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleCreateAndAssign(ts.detectedSpeakerLabel);
                        }
                      }}
                    />
                    <Button
                      onClick={() =>
                        handleCreateAndAssign(ts.detectedSpeakerLabel)
                      }
                      disabled={!newSpeakerName.trim()}
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create & Assign
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {getAssignedCount() > 0 && (
              <span>
                {getAssignedCount()} of {transcriptionSpeakers.length} speakers
                assigned. Embeddings will be regenerated with speaker context.
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveAssignments}
              disabled={isLoading || getAssignedCount() === 0}
            >
              {isLoading
                ? "Saving..."
                : `Save Assignments (${getAssignedCount()})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
