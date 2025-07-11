import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Get knowledge entities with filtering and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const search = searchParams.get("search");
    const verified = searchParams.get("verified");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {
      isActive: true
    };

    if (entityType) {
      where.entityType = {
        name: entityType
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ];
    }

    if (verified !== null) {
      where.isVerified = verified === "true";
    }

    const entities = await prisma.knowledgeEntity.findMany({
      where,
      include: {
        entityType: true,
        attributes: true,
        transcription: {
          select: {
            id: true,
            fileName: true,
            createdAt: true
          }
        },
        sourceRelationships: {
          include: {
            targetEntity: {
              select: {
                id: true,
                title: true,
                entityType: {
                  select: {
                    name: true,
                    displayName: true
                  }
                }
              }
            }
          }
        },
        targetRelationships: {
          include: {
            sourceEntity: {
              select: {
                id: true,
                title: true,
                entityType: {
                  select: {
                    name: true,
                    displayName: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit,
      skip: offset
    });

    const total = await prisma.knowledgeEntity.count({ where });

    return NextResponse.json({
      entities: entities.map(entity => ({
        id: entity.id,
        title: entity.title,
        description: entity.description,
        confidence: entity.confidence,
        isVerified: entity.isVerified,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        entityType: entity.entityType,
        attributes: entity.attributes.map(attr => ({
          id: attr.id,
          key: attr.key,
          value: attr.value,
          dataType: attr.dataType,
          confidence: attr.confidence,
          isVerified: attr.isVerified
        })),
        transcription: entity.transcription,
        relationships: [
          ...entity.sourceRelationships.map(rel => ({
            id: rel.id,
            type: rel.relationshipType,
            description: rel.description,
            direction: "outgoing",
            relatedEntity: rel.targetEntity
          })),
          ...entity.targetRelationships.map(rel => ({
            id: rel.id,
            type: rel.relationshipType,
            description: rel.description,
            direction: "incoming",
            relatedEntity: rel.sourceEntity
          }))
        ]
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error("Error fetching knowledge entities:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge entities" },
      { status: 500 }
    );
  }
}

// Create a new knowledge entity manually
export async function POST(request: NextRequest) {
  try {
    const { entityTypeId, title, description, attributes } = await request.json();

    if (!entityTypeId || !title) {
      return NextResponse.json(
        { error: "Entity type ID and title are required" },
        { status: 400 }
      );
    }

    // Check if entity type exists
    const entityType = await prisma.entityType.findUnique({
      where: { id: entityTypeId }
    });

    if (!entityType) {
      return NextResponse.json(
        { error: "Entity type not found" },
        { status: 404 }
      );
    }

    // Create the knowledge entity
    const knowledgeEntity = await prisma.knowledgeEntity.create({
      data: {
        entityTypeId,
        title,
        description,
        isVerified: true, // Manually created entities are considered verified
        confidence: 1.0   // Manual entries have full confidence
      },
      include: {
        entityType: true
      }
    });

    // Create attributes if provided
    if (attributes && Array.isArray(attributes)) {
      const attributePromises = attributes.map((attr: any) => {
        return prisma.entityAttribute.create({
          data: {
            entityId: knowledgeEntity.id,
            key: attr.key,
            value: attr.value,
            dataType: attr.dataType || "string",
            confidence: attr.confidence || 1.0,
            isVerified: true
          }
        });
      });

      await Promise.all(attributePromises);
    }

    return NextResponse.json({
      success: true,
      entity: {
        id: knowledgeEntity.id,
        title: knowledgeEntity.title,
        description: knowledgeEntity.description,
        entityType: knowledgeEntity.entityType,
        createdAt: knowledgeEntity.createdAt
      }
    });

  } catch (error) {
    console.error("Error creating knowledge entity:", error);
    return NextResponse.json(
      { error: "Failed to create knowledge entity" },
      { status: 500 }
    );
  }
}
