import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { transcribeAudio, generateEmbedding } from "@/lib/gemini";
import { prisma } from "@/lib/db";
import { analyzeContent } from "@/lib/knowledge-analyzer";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("audio") as File;
    const sourceType = (formData.get("sourceType") as string) || "FILE";
    const tags = (formData.get("tags") as string) || "";
    const transcriptionModel =
      (formData.get("transcriptionModel") as string) || "gemini-2.0-flash";
    const embeddingModel =
      (formData.get("embeddingModel") as string) || "text-embedding-004";

    if (!file) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "audio/mp3",
      "audio/wav",
      "audio/mpeg",
      "audio/webm",
      "audio/ogg",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only MP3, WAV, WebM, and OGG files are supported",
        },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || "10485760");
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: "File size too large. Maximum size is 10MB",
        },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = process.env.UPLOAD_DIR || "./uploads";
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name}`;
    const filepath = path.join(uploadDir, filename);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Transcribe audio using Google Gemini
    const transcription = await transcribeAudio(
      buffer,
      file.type,
      transcriptionModel
    );

    // Generate embedding for RAG
    const embeddingResult = await generateEmbedding(
      transcription.originalText,
      embeddingModel
    );

    // Parse tags
    const tagArray = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    // Calculate total cost (transcription + embedding)
    const totalCost = transcription.totalCost + embeddingResult.cost;

    // Save to database with cost tracking
    const audioTranscription = await prisma.audioTranscription.create({
      data: {
        fileName: file.name,
        filePath: filepath,
        fileSize: file.size,
        originalText: transcription.originalText,
        markdown: transcription.markdown,
        confidence: transcription.confidence,
        sourceType: sourceType as "FILE" | "LIVE_RECORDING",
        tags: tagArray,
        embedding: JSON.stringify(embeddingResult.embedding),
        // Cost tracking fields
        inputTokens: transcription.inputTokens + embeddingResult.inputTokens,
        outputTokens: transcription.outputTokens + embeddingResult.outputTokens,
        transcriptionCost: transcription.transcriptionCost,
        embeddingCost: embeddingResult.cost,
        totalCost: totalCost,
        transcriptionModel: transcription.model,
        embeddingModel: embeddingResult.model,
        transcriptionPriceInput: transcription.pricePerInputToken,
        transcriptionPriceOutput: transcription.pricePerOutputToken,
        embeddingPriceInput:
          embeddingResult.cost / Math.max(embeddingResult.inputTokens, 1),
        exchangeRate: transcription.exchangeRate,
        // Speaker detection fields
        speakerCount: transcription.speakerCount,
        hasSpeakerDiarization: transcription.hasSpeakerDiarization,
        speakerTranscription: transcription.speakerTranscription,
        speakerMetadata: transcription.speakerMetadata,
      },
    });

    // Create TranscriptionSpeaker records for detected speakers
    if (transcription.hasSpeakerDiarization && transcription.speakerCount > 1) {
      const speakerPromises = [];
      for (let i = 1; i <= transcription.speakerCount; i++) {
        const detectedSpeakerLabel = `Speaker ${i}`;
        speakerPromises.push(
          prisma.transcriptionSpeaker.create({
            data: {
              transcriptionId: audioTranscription.id,
              detectedSpeakerLabel,
              speakerId: null, // Initially unassigned
              confidence: 0.8, // Default confidence for detected speakers
            }
          })
        );
      }
      await Promise.all(speakerPromises);
    }

    // Update cost summary
    const { updateCostSummary } = await import("@/lib/pricing");
    await updateCostSummary(
      transcription.transcriptionCost,
      embeddingResult.cost,
      0
    );

    // Automatically analyze content for knowledge extraction (async, non-blocking)
    analyzeContent(transcription.originalText, audioTranscription.id, transcriptionModel)
      .then(analysis => {
        console.log(`Knowledge analysis completed for transcription ${audioTranscription.id}:`, {
          hasStructuredData: analysis.hasStructuredData,
          entitiesFound: analysis.entities.length,
          confidence: analysis.confidence
        });
      })
      .catch(error => {
        console.error(`Knowledge analysis failed for transcription ${audioTranscription.id}:`, error);
        // Update transcription with error status
        prisma.audioTranscription.update({
          where: { id: audioTranscription.id },
          data: {
            analysisStatus: "FAILED",
            analysisError: error.message
          }
        }).catch(updateError => {
          console.error("Failed to update analysis error status:", updateError);
        });
      });

    return NextResponse.json({
      id: audioTranscription.id,
      originalText: transcription.originalText,
      markdown: transcription.markdown,
      confidence: transcription.confidence,
      fileName: file.name,
      fileSize: file.size,
      sourceType: audioTranscription.sourceType,
      tags: audioTranscription.tags,
      createdAt: audioTranscription.createdAt,
      // Include cost information in response
      cost: {
        transcriptionCost: transcription.transcriptionCost,
        embeddingCost: embeddingResult.cost,
        totalCost: totalCost,
        inputTokens: transcription.inputTokens + embeddingResult.inputTokens,
        outputTokens: transcription.outputTokens + embeddingResult.outputTokens,
        exchangeRate: transcription.exchangeRate,
      },
      models: {
        transcriptionModel: transcription.model,
        embeddingModel: embeddingResult.model,
      },
      // Speaker detection information
      speakers: {
        speakerCount: transcription.speakerCount,
        hasSpeakerDiarization: transcription.hasSpeakerDiarization,
        speakerTranscription: transcription.speakerTranscription,
        speakerMetadata: transcription.speakerMetadata,
      },
    });
  } catch (error) {
    console.error("Error processing audio:", error);
    return NextResponse.json(
      {
        error: "Failed to process audio file",
      },
      { status: 500 }
    );
  }
}
