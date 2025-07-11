import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeContent } from "@/lib/knowledge-analyzer";

export async function POST(request: NextRequest) {
  try {
    const { transcriptionId, model } = await request.json();

    if (!transcriptionId) {
      return NextResponse.json(
        { error: "Transcription ID is required" },
        { status: 400 }
      );
    }

    // Get the transcription
    const transcription = await prisma.audioTranscription.findUnique({
      where: { id: transcriptionId }
    });

    if (!transcription) {
      return NextResponse.json(
        { error: "Transcription not found" },
        { status: 404 }
      );
    }

    // Check if already analyzed
    if (transcription.hasBeenAnalyzed) {
      return NextResponse.json(
        { error: "Transcription has already been analyzed" },
        { status: 400 }
      );
    }

    // Update status to processing
    await prisma.audioTranscription.update({
      where: { id: transcriptionId },
      data: { analysisStatus: "PROCESSING" }
    });

    try {
      // Analyze the content
      const analysis = await analyzeContent(
        transcription.originalText,
        transcriptionId,
        model || "gemini-2.0-flash"
      );

      // Update transcription with analysis results
      await prisma.audioTranscription.update({
        where: { id: transcriptionId },
        data: {
          hasBeenAnalyzed: true,
          analysisStatus: "COMPLETED"
        }
      });

      return NextResponse.json({
        success: true,
        analysis: {
          hasStructuredData: analysis.hasStructuredData,
          entitiesCount: analysis.entities.length,
          confidence: analysis.confidence,
          suggestedEntityTypes: analysis.suggestedEntityTypes
        }
      });

    } catch (analysisError) {
      // Update status to failed
      await prisma.audioTranscription.update({
        where: { id: transcriptionId },
        data: {
          analysisStatus: "FAILED",
          analysisError: analysisError instanceof Error ? analysisError.message : "Unknown error"
        }
      });

      throw analysisError;
    }

  } catch (error) {
    console.error("Error analyzing transcription:", error);
    return NextResponse.json(
      { error: "Failed to analyze transcription" },
      { status: 500 }
    );
  }
}

// Get analysis status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transcriptionId = searchParams.get("transcriptionId");

    if (!transcriptionId) {
      return NextResponse.json(
        { error: "Transcription ID is required" },
        { status: 400 }
      );
    }

    const transcription = await prisma.audioTranscription.findUnique({
      where: { id: transcriptionId },
      select: {
        hasBeenAnalyzed: true,
        analysisStatus: true,
        analysisError: true,
        extractionReviews: {
          include: {
            entityType: true
          }
        }
      }
    });

    if (!transcription) {
      return NextResponse.json(
        { error: "Transcription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      hasBeenAnalyzed: transcription.hasBeenAnalyzed,
      analysisStatus: transcription.analysisStatus,
      analysisError: transcription.analysisError,
      extractionReviews: transcription.extractionReviews.map(review => ({
        id: review.id,
        entityType: review.entityType.displayName,
        extractedData: JSON.parse(review.extractedData),
        sourceText: review.sourceText,
        confidence: review.confidence,
        status: review.status,
        createdAt: review.createdAt
      }))
    });

  } catch (error) {
    console.error("Error fetching analysis status:", error);
    return NextResponse.json(
      { error: "Failed to fetch analysis status" },
      { status: 500 }
    );
  }
}
