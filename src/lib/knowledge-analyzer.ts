import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./db";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

interface ExtractedEntity {
  type: string;
  title: string;
  description?: string;
  confidence: number;
  attributes: Record<string, {
    value: string;
    dataType: string;
    confidence: number;
  }>;
  sourceText: string;
}

interface AnalysisResult {
  hasStructuredData: boolean;
  entities: ExtractedEntity[];
  suggestedEntityTypes: Array<{
    name: string;
    displayName: string;
    description: string;
    schema: Record<string, string>;
  }>;
  confidence: number;
}

export async function analyzeContent(
  text: string,
  transcriptionId: string,
  model: string = "gemini-2.0-flash"
): Promise<AnalysisResult> {
  try {
    // Get existing entity types to inform the analysis
    const existingEntityTypes = await prisma.entityType.findMany({
      where: { isActive: true },
      select: { name: true, displayName: true, description: true, schema: true }
    });

    const entityTypesContext = existingEntityTypes.length > 0
      ? `\n\nExisting entity types in the system:\n${existingEntityTypes.map(et => 
          `- ${et.name} (${et.displayName}): ${et.description || 'No description'}`
        ).join('\n')}`
      : '';

    const prompt = `
You are a knowledge extraction specialist. Analyze the following transcribed text and extract structured information that could be useful for a personal knowledge database.

TRANSCRIBED TEXT:
"${text}"

INSTRUCTIONS:
1. First, determine if this text contains structured information worth extracting (people, places, events, dates, contact info, etc.)
2. If it does, extract entities and classify them into appropriate types
3. For each entity, provide:
   - type: category of information (e.g., "person", "place", "event", "contact", "reminder", "task")
   - title: main identifier/name
   - description: brief description if helpful
   - confidence: your confidence level (0-1)
   - attributes: key-value pairs with specific details
   - sourceText: the original text segment that contains this information

4. If you encounter entity types not in the existing system, suggest new entity types with their schemas
5. Focus on information that would be valuable to retrieve later

ATTRIBUTE DATA TYPES:
- "string": text values
- "email": email addresses
- "phone": phone numbers
- "url": web addresses
- "date": dates (YYYY-MM-DD format)
- "time": times (HH:MM format)
- "number": numeric values
- "address": physical addresses

${entityTypesContext}

RESPOND IN VALID JSON FORMAT:
{
  "hasStructuredData": boolean,
  "entities": [
    {
      "type": "string",
      "title": "string",
      "description": "string (optional)",
      "confidence": number,
      "attributes": {
        "key": {
          "value": "string",
          "dataType": "string",
          "confidence": number
        }
      },
      "sourceText": "string"
    }
  ],
  "suggestedEntityTypes": [
    {
      "name": "string",
      "displayName": "string", 
      "description": "string",
      "schema": {
        "attributeName": "dataType"
      }
    }
  ],
  "confidence": number
}

EXAMPLES:
- "I met Sarah Johnson from TechCorp, her email is sarah@techcorp.com" → person entity with name, company, email
- "Meeting at cafe on Boulevard Saint-Laurent at 2088, open 6am-10pm" → place entity with name, address, hours
- "Call dentist tomorrow at 3pm" → reminder/task entity with action, date, time
- "John's birthday is March 15th" → event entity with person, date, type
`;

    const geminiModel = genAI.getGenerativeModel({ model });
    
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();

    // Parse the JSON response
    let analysis: AnalysisResult;
    try {
      // Clean up the response to extract JSON
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Error parsing analysis response:", parseError);
      console.error("Raw response:", analysisText);
      
      // Return empty result if parsing fails
      return {
        hasStructuredData: false,
        entities: [],
        suggestedEntityTypes: [],
        confidence: 0
      };
    }

    // Validate and save extraction reviews if entities were found
    if (analysis.hasStructuredData && analysis.entities.length > 0) {
      await saveExtractionReviews(transcriptionId, analysis.entities);
    }

    return analysis;

  } catch (error) {
    console.error("Error analyzing content:", error);
    throw error;
  }
}

async function saveExtractionReviews(
  transcriptionId: string,
  entities: ExtractedEntity[]
): Promise<void> {
  try {
    // Get or create entity types for each extracted entity
    const entityTypePromises = entities.map(async (entity) => {
      // Use upsert to handle race conditions when multiple processes try to create the same entity type
      const entityType = await prisma.entityType.upsert({
        where: { name: entity.type },
        update: {}, // Don't update anything if it exists
        create: {
          name: entity.type,
          displayName: entity.type.charAt(0).toUpperCase() + entity.type.slice(1),
          description: `Auto-generated entity type for ${entity.type}`,
          isActive: true
        }
      });

      return entityType;
    });

    const entityTypes = await Promise.all(entityTypePromises);

    // Create extraction reviews for each entity
    const extractionPromises = entities.map(async (entity, index) => {
      const entityType = entityTypes[index];
      
      const extractedData = {
        title: entity.title,
        description: entity.description,
        attributes: entity.attributes,
        confidence: entity.confidence
      };

      return prisma.extractionReview.create({
        data: {
          transcriptionId,
          entityTypeId: entityType.id,
          extractedData: JSON.stringify(extractedData),
          sourceText: entity.sourceText,
          confidence: entity.confidence,
          status: "PENDING"
        }
      });
    });

    await Promise.all(extractionPromises);

  } catch (error) {
    console.error("Error saving extraction reviews:", error);
    throw error;
  }
}

export async function createKnowledgeEntity(
  extractionReviewId: string,
  modifications?: {
    title?: string;
    description?: string;
    attributes?: Record<string, {
      value: string;
      dataType: string;
      confidence: number;
    }>;
  }
): Promise<string> {
  try {
    const extractionReview = await prisma.extractionReview.findUnique({
      where: { id: extractionReviewId },
      include: { entityType: true }
    });

    if (!extractionReview) {
      throw new Error("Extraction review not found");
    }

    const extractedData = JSON.parse(extractionReview.extractedData);
    
    // Use modifications if provided, otherwise use extracted data
    const finalData = {
      title: modifications?.title || extractedData.title,
      description: modifications?.description || extractedData.description,
      attributes: modifications?.attributes || extractedData.attributes,
      confidence: extractedData.confidence
    };

    // Create the knowledge entity
    const knowledgeEntity = await prisma.knowledgeEntity.create({
      data: {
        entityTypeId: extractionReview.entityTypeId,
        transcriptionId: extractionReview.transcriptionId,
        title: finalData.title,
        description: finalData.description,
        confidence: finalData.confidence,
        isVerified: modifications ? true : false, // Mark as verified if user made modifications
      }
    });

    // Create entity attributes
    if (finalData.attributes) {
      const attributePromises = Object.entries(finalData.attributes).map(
        ([key, attr]) => {
          const typedAttr = attr as {
            value: string;
            dataType: string;
            confidence: number;
          };
          return prisma.entityAttribute.create({
            data: {
              entityId: knowledgeEntity.id,
              key,
              value: typedAttr.value,
              dataType: typedAttr.dataType,
              confidence: typedAttr.confidence,
              isVerified: modifications ? true : false
            }
          });
        }
      );

      await Promise.all(attributePromises);
    }

    // Update extraction review
    await prisma.extractionReview.update({
      where: { id: extractionReviewId },
      data: {
        entityId: knowledgeEntity.id,
        status: modifications ? "MODIFIED" : "APPROVED",
        reviewedAt: new Date()
      }
    });

    return knowledgeEntity.id;

  } catch (error) {
    console.error("Error creating knowledge entity:", error);
    throw error;
  }
}

export async function rejectExtraction(
  extractionReviewId: string,
  reviewNotes?: string
): Promise<void> {
  try {
    await prisma.extractionReview.update({
      where: { id: extractionReviewId },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewNotes
      }
    });
  } catch (error) {
    console.error("Error rejecting extraction:", error);
    throw error;
  }
}
