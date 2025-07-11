"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Mic, 
  MicOff, 
  Upload, 
  Settings, 
  DollarSign, 
  FileAudio, 
  Zap,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useRouter } from "next/navigation";

interface CostInfo {
  transcriptionCost: number;
  embeddingCost: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  exchangeRate: number;
}

interface CostEstimate {
  transcriptionCost: number;
  embeddingCost: number;
  totalCost: number;
}

export default function RecordPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tags, setTags] = useState("");
  const [progress, setProgress] = useState(0);
  const [transcriptionModel, setTranscriptionModel] = useState("gemini-2.0-flash");
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-004");
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [exchangeRate, setExchangeRate] = useState(1.35);
  const [lastTranscriptionCost, setLastTranscriptionCost] = useState<CostInfo | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [processingStep, setProcessingStep] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchExchangeRate();
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const fetchExchangeRate = async () => {
    try {
      const response = await fetch("/api/costs/exchange-rate");
      if (response.ok) {
        const data = await response.json();
        setExchangeRate(data.rate);
      }
    } catch (error) {
      console.error("Error fetching exchange rate:", error);
    }
  };

  const updateCostEstimate = useCallback(
    async (fileSize?: number) => {
      if (!fileSize) return;

      try {
        const response = await fetch("/api/costs/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileSizeBytes: fileSize,
            transcriptionModel,
            embeddingModel,
          }),
        });

        if (response.ok) {
          const estimate = await response.json();
          setCostEstimate(estimate);
        }
      } catch (error) {
        console.error("Error calculating cost estimate:", error);
      }
    },
    [transcriptionModel, embeddingModel]
  );

  useEffect(() => {
    if (audioFile) {
      updateCostEstimate(audioFile.size);
    }
  }, [audioFile, updateCostEstimate]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioFile = new File(
          [audioBlob],
          `recording_${Date.now()}.webm`,
          { type: "audio/webm" }
        );
        await transcribeAudio(audioFile, "LIVE_RECORDING");
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Error accessing microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const transcribeAudio = async (
    file: File,
    sourceType: "FILE" | "LIVE_RECORDING" = "FILE"
  ) => {
    setIsLoading(true);
    setProgress(0);
    setProcessingStep("Preparing audio...");

    // Enhanced progress simulation
    const progressSteps = [
      { step: "Uploading audio...", progress: 20 },
      { step: "Transcribing speech...", progress: 60 },
      { step: "Analyzing speakers...", progress: 80 },
      { step: "Generating embeddings...", progress: 90 },
      { step: "Finalizing...", progress: 95 },
    ];

    let currentStep = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < progressSteps.length) {
        setProcessingStep(progressSteps[currentStep].step);
        setProgress(progressSteps[currentStep].progress);
        currentStep++;
      }
    }, 1000);

    try {
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("sourceType", sourceType);
      formData.append("tags", tags);
      formData.append("transcriptionModel", transcriptionModel);
      formData.append("embeddingModel", embeddingModel);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to transcribe audio");
      }

      const result = await response.json();
      
      setProgress(100);
      setProcessingStep("Complete!");

      // Store cost information
      if (result.cost) {
        setLastTranscriptionCost(result.cost);
      }

      // Reset form
      setAudioFile(null);
      setTags("");
      setRecordingTime(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Redirect to transcript view after a short delay
      setTimeout(() => {
        router.push(`/transcripts/${result.id}`);
      }, 1500);

    } catch (error) {
      console.error("Error transcribing audio:", error);
      setProcessingStep("Error occurred");
      alert(
        `Error: ${
          error instanceof Error ? error.message : "Failed to transcribe audio"
        }`
      );
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
      setTimeout(() => {
        setProgress(0);
        setProcessingStep("");
      }, 2000);
    }
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getModelDisplayName = (model: string) => {
    const displayNames: Record<string, string> = {
      "gemini-1.5-flash": "Gemini 1.5 Flash",
      "gemini-1.5-pro": "Gemini 1.5 Pro",
      "gemini-2.0-flash": "Gemini 2.0 Flash (Default)",
      "gemini-2.0-flash-lite": "Gemini 2.0 Flash Lite",
      "gemini-2.5-flash": "Gemini 2.5 Flash",
      "gemini-2.5-pro": "Gemini 2.5 Pro",
      "text-embedding-004": "Text Embedding 004 (Free)",
    };
    return displayNames[model] || model;
  };

  const getAvailableTranscriptionModels = () => {
    return [
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
    ];
  };

  const getAvailableEmbeddingModels = () => {
    return ["text-embedding-004"];
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Record Audio</h1>
        <p className="text-gray-600">
          Record live audio or upload files to create transcriptions
        </p>
      </div>

      {/* Recording Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Live Recording
          </CardTitle>
          <CardDescription>
            Record audio directly from your microphone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              size="lg"
              className={`w-32 h-32 rounded-full ${
                isRecording ? "bg-red-500 hover:bg-red-600" : ""
              }`}
            >
              {isRecording ? (
                <MicOff className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {isRecording ? "Recording..." : "Click to start recording"}
            </p>
            {isRecording && (
              <div className="mt-2">
                <Badge variant="destructive" className="animate-pulse">
                  {formatTime(recordingTime)}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            File Upload
          </CardTitle>
          <CardDescription>
            Upload MP3, WAV, WebM, or OGG files (max 10MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="audio-file">Audio File</Label>
            <Input
              id="audio-file"
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              disabled={isLoading}
            />
            {audioFile && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileAudio className="h-4 w-4" />
                <span>{audioFile.name}</span>
                <Badge variant="outline">
                  {formatFileSize(audioFile.size)}
                </Badge>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (optional)</Label>
            <Input
              id="tags"
              placeholder="meeting, notes, lecture (comma-separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <Button
            onClick={() => audioFile && transcribeAudio(audioFile)}
            disabled={!audioFile || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileAudio className="h-4 w-4 mr-2" />
                Transcribe Audio
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Model Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Model Configuration
          </CardTitle>
          <CardDescription>
            Choose AI models for transcription and embedding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Transcription Model</Label>
              <Select
                value={transcriptionModel}
                onValueChange={setTranscriptionModel}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select transcription model" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableTranscriptionModels().map((model) => (
                    <SelectItem key={model} value={model}>
                      {getModelDisplayName(model)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Embedding Model</Label>
              <Select
                value={embeddingModel}
                onValueChange={setEmbeddingModel}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select embedding model" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableEmbeddingModels().map((model) => (
                    <SelectItem key={model} value={model}>
                      {getModelDisplayName(model)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Estimation */}
      {costEstimate && audioFile && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <DollarSign className="h-5 w-5" />
              Cost Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Transcription:</span>
                <span className="font-mono">
                  {formatCost(costEstimate.transcriptionCost)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Embedding:</span>
                <span className="font-mono">
                  {formatCost(costEstimate.embeddingCost)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Total:</span>
                <span className="font-mono">
                  {formatCost(costEstimate.totalCost)}
                </span>
              </div>
              <div className="text-xs text-gray-600">
                File size: {formatFileSize(audioFile.size)} • Exchange rate: {exchangeRate.toFixed(4)} CAD/USD
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Progress */}
      {isLoading && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-600 animate-spin" />
                <span className="font-medium text-green-900">
                  {processingStep}
                </span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-green-700">
                Please wait while we process your audio...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Transcription Cost */}
      {lastTranscriptionCost && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle className="h-5 w-5" />
              Last Transcription Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Transcription:</span>
                <span className="font-mono">
                  {formatCost(lastTranscriptionCost.transcriptionCost)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Embedding:</span>
                <span className="font-mono">
                  {formatCost(lastTranscriptionCost.embeddingCost)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Total:</span>
                <span className="font-mono">
                  {formatCost(lastTranscriptionCost.totalCost)}
                </span>
              </div>
              <div className="text-xs text-gray-600">
                {lastTranscriptionCost.inputTokens + lastTranscriptionCost.outputTokens} tokens processed
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Tips for Better Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Use high-quality audio with minimal background noise</li>
            <li>• Speak clearly and at a moderate pace</li>
            <li>• For multiple speakers, ensure they don't talk over each other</li>
            <li>• Add relevant tags to help organize and find your transcripts later</li>
            <li>• Files under 5MB typically process faster</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
