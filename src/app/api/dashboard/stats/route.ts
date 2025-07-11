import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Get basic counts
    const [
      totalTranscriptions,
      totalSpeakers,
      totalKnowledgeEntities,
      pendingExtractions,
      costSummary,
      recentTranscriptions,
      recentEntities
    ] = await Promise.all([
      // Total transcriptions
      prisma.audioTranscription.count(),
      
      // Total speakers
      prisma.speaker.count(),
      
      // Total knowledge entities
      prisma.knowledgeEntity.count({
        where: { isActive: true }
      }),
      
      // Pending extractions
      prisma.extractionReview.count({
        where: { status: "PENDING" }
      }),
      
      // Cost summary
      prisma.costSummary.findFirst(),
      
      // Recent transcriptions (last 5)
      prisma.audioTranscription.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fileName: true,
          createdAt: true,
          confidence: true,
          speakerCount: true,
        }
      }),
      
      // Recent knowledge entities (last 5)
      prisma.knowledgeEntity.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          createdAt: true,
          entityType: {
            select: {
              displayName: true
            }
          }
        }
      })
    ]);

    // Calculate this month's cost
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthTranscriptions = await prisma.audioTranscription.aggregate({
      where: {
        createdAt: {
          gte: startOfMonth
        }
      },
      _sum: {
        totalCost: true
      }
    });

    const thisMonthSearches = await prisma.searchCost.aggregate({
      where: {
        createdAt: {
          gte: startOfMonth
        }
      },
      _sum: {
        cost: true
      }
    });

    const thisMonthCost = (thisMonthTranscriptions._sum.totalCost || 0) + (thisMonthSearches._sum.cost || 0);

    const stats = {
      totalTranscriptions,
      totalSpeakers,
      totalKnowledgeEntities,
      pendingExtractions,
      totalCost: costSummary?.grandTotal || 0,
      thisMonthCost,
      recentTranscriptions: recentTranscriptions.map(t => ({
        ...t,
        fileName: t.fileName || "Unknown",
        confidence: t.confidence || 0,
      })),
      recentEntities
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
