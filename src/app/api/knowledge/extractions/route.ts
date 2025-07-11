import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createKnowledgeEntity, rejectExtraction } from "@/lib/knowledge-analyzer";

// Get pending extraction reviews
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    const extractions = await prisma.extractionReview.findMany({
      where: {
        status: status as "PENDING" | "APPROVED" | "REJECTED" | "MODIFIED"
      },
      include: {
        entityType: true,
        transcription: {
          select: {
            id: true,
            fileName: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit,
      skip: offset
    });

    const total = await prisma.extractionReview.count({
      where: {
        status: status as "PENDING" | "APPROVED" | "REJECTED" | "MODIFIED"
      }
    });

    return NextResponse.json({
      extractions: extractions.map(extraction => ({
        id: extraction.id,
        entityType: extraction.entityType,
        extractedData: JSON.parse(extraction.extractedData),
        sourceText: extraction.sourceText,
        confidence: extraction.confidence,
        status: extraction.status,
        createdAt: extraction.createdAt,
        reviewedAt: extraction.reviewedAt,
        reviewNotes: extraction.reviewNotes,
        transcription: extraction.transcription
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error("Error fetching extractions:", error);
    return NextResponse.json(
      { error: "Failed to fetch extractions" },
      { status: 500 }
    );
  }
}

// Approve, reject, or modify an extraction
export async function POST(request: NextRequest) {
  try {
    const { extractionId, action, modifications, reviewNotes } = await request.json();

    if (!extractionId || !action) {
      return NextResponse.json(
        { error: "Extraction ID and action are required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject", "modify"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve', 'reject', or 'modify'" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "approve":
        result = await createKnowledgeEntity(extractionId);
        break;

      case "modify":
        if (!modifications) {
          return NextResponse.json(
            { error: "Modifications are required for modify action" },
            { status: 400 }
          );
        }
        result = await createKnowledgeEntity(extractionId, modifications);
        break;

      case "reject":
        await rejectExtraction(extractionId, reviewNotes);
        result = { action: "rejected" };
        break;
    }

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error("Error processing extraction:", error);
    return NextResponse.json(
      { error: "Failed to process extraction" },
      { status: 500 }
    );
  }
}
