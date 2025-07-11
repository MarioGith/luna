import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface SchemaPattern {
  id: string;
  name: string;
  description: string;
  confidence: number;
  frequency: number;
  examples: string[];
  suggestedStructure: {
    tableName: string;
    columns: Array<{
      name: string;
      type: string;
      nullable?: boolean;
      unique?: boolean;
      description?: string;
    }>;
    relationships?: Array<{
      type: 'oneToMany' | 'manyToOne' | 'manyToMany';
      targetTable: string;
      description: string;
    }>;
  };
}

export interface SchemaProposal {
  id: string;
  type: 'table' | 'column' | 'relationship' | 'index';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  title: string;
  description: string;
  rationale: string;
  impact: string;
  sqlPreview: string;
  supportingData: {
    transcriptCount: number;
    entityCount: number;
    examples: string[];
  };
  createdAt: Date;
  implementedAt?: Date;
}

export class SchemaAnalyzer {
  private prisma: PrismaClient;
  private aiModel: any;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.aiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  /**
   * Analyze knowledge patterns and suggest schema improvements
   */
  async analyzeKnowledgePatterns(): Promise<SchemaPattern[]> {
    console.log('🔍 Analyzing knowledge patterns...');
    
    // Get all knowledge entities with their attributes
    const entities = await this.prisma.knowledgeEntity.findMany({
      include: {
        attributes: true,
        entityType: true,
        transcription: true
      }
    });

    // Group entities by type
    const entityGroups = this.groupEntitiesByType(entities);
    
    // Analyze each group for patterns
    const patterns: SchemaPattern[] = [];
    
    for (const [entityType, entitiesInType] of Object.entries(entityGroups)) {
      const pattern = await this.analyzeEntityTypePattern(entityType, entitiesInType);
      if (pattern) {
        patterns.push(pattern);
      }
    }

    // Analyze cross-entity relationships
    const relationshipPatterns = await this.analyzeRelationshipPatterns(entities);
    patterns.push(...relationshipPatterns);

    // Analyze temporal patterns
    const temporalPatterns = await this.analyzeTemporalPatterns(entities);
    patterns.push(...temporalPatterns);

    return patterns;
  }

  /**
   * Generate schema proposals based on patterns
   */
  async generateSchemaProposals(patterns: SchemaPattern[]): Promise<SchemaProposal[]> {
    console.log('💡 Generating schema proposals...');
    
    const proposals: SchemaProposal[] = [];

    for (const pattern of patterns) {
      // High-frequency patterns get priority
      if (pattern.frequency >= 5 && pattern.confidence >= 0.8) {
        const proposal = await this.createSchemaProposal(pattern, 'high');
        proposals.push(proposal);
      } else if (pattern.frequency >= 3 && pattern.confidence >= 0.6) {
        const proposal = await this.createSchemaProposal(pattern, 'medium');
        proposals.push(proposal);
      } else if (pattern.frequency >= 2 && pattern.confidence >= 0.5) {
        const proposal = await this.createSchemaProposal(pattern, 'low');
        proposals.push(proposal);
      }
    }

    // Sort by priority and confidence
    return proposals.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Analyze specific entity type for patterns
   */
  private async analyzeEntityTypePattern(entityType: string, entities: any[]): Promise<SchemaPattern | null> {
    if (entities.length < 2) return null;

    // Analyze attribute patterns
    const attributeFrequency = new Map<string, number>();
    const attributeTypes = new Map<string, string>();
    const attributeExamples = new Map<string, string[]>();

    for (const entity of entities) {
      for (const attr of entity.attributes || []) {
        attributeFrequency.set(attr.key, (attributeFrequency.get(attr.key) || 0) + 1);
        attributeTypes.set(attr.key, attr.dataType);
        
        if (!attributeExamples.has(attr.key)) {
          attributeExamples.set(attr.key, []);
        }
        attributeExamples.get(attr.key)!.push(attr.value);
      }
    }

    // Find common attributes (present in >50% of entities)
    const commonAttributes = Array.from(attributeFrequency.entries())
      .filter(([_, frequency]) => frequency / entities.length >= 0.5)
      .map(([key, frequency]) => ({
        key,
        frequency,
        type: attributeTypes.get(key) || 'string',
        examples: attributeExamples.get(key)?.slice(0, 3) || []
      }));

    if (commonAttributes.length === 0) return null;

    // Generate AI analysis
    const aiAnalysis = await this.getAIAnalysis(entityType, commonAttributes, entities);

    return {
      id: `pattern-${entityType}-${Date.now()}`,
      name: `${entityType} Structure Pattern`,
      description: `Common attributes found in ${entityType} entities`,
      confidence: Math.min(0.95, commonAttributes.length / 10 + 0.5),
      frequency: entities.length,
      examples: entities.slice(0, 3).map(e => e.title),
      suggestedStructure: {
        tableName: `${entityType}_details`,
        columns: [
          { name: 'id', type: 'string', nullable: false, description: 'Primary key' },
          { name: 'entity_id', type: 'string', nullable: false, description: 'Reference to KnowledgeEntity' },
          ...commonAttributes.map(attr => ({
            name: attr.key.toLowerCase().replace(/\s+/g, '_'),
            type: this.mapDataType(attr.type),
            nullable: attr.frequency < entities.length,
            description: `${attr.key} - found in ${Math.round(attr.frequency / entities.length * 100)}% of entities`
          }))
        ],
        relationships: [
          {
            type: 'manyToOne' as const,
            targetTable: 'KnowledgeEntity',
            description: `Each ${entityType} detail belongs to one knowledge entity`
          }
        ]
      }
    };
  }

  /**
   * Analyze relationship patterns between entities
   */
  private async analyzeRelationshipPatterns(entities: any[]): Promise<SchemaPattern[]> {
    const patterns: SchemaPattern[] = [];
    
    // Analyze co-occurrence patterns
    const coOccurrences = new Map<string, Map<string, number>>();
    
    // Group entities by transcription
    const transcriptionGroups = new Map<string, any[]>();
    for (const entity of entities) {
      if (entity.transcriptionId) {
        if (!transcriptionGroups.has(entity.transcriptionId)) {
          transcriptionGroups.set(entity.transcriptionId, []);
        }
        transcriptionGroups.get(entity.transcriptionId)!.push(entity);
      }
    }

    // Count co-occurrences
    for (const [_, entitiesInTranscript] of transcriptionGroups) {
      for (let i = 0; i < entitiesInTranscript.length; i++) {
        for (let j = i + 1; j < entitiesInTranscript.length; j++) {
          const type1 = entitiesInTranscript[i].entityType.name;
          const type2 = entitiesInTranscript[j].entityType.name;
          
          if (type1 !== type2) {
            const key = [type1, type2].sort().join('-');
            if (!coOccurrences.has(key)) {
              coOccurrences.set(key, new Map());
            }
            const pairKey = `${entitiesInTranscript[i].title}|${entitiesInTranscript[j].title}`;
            coOccurrences.get(key)!.set(pairKey, (coOccurrences.get(key)!.get(pairKey) || 0) + 1);
          }
        }
      }
    }

    // Generate relationship patterns
    for (const [typesPair, occurrences] of coOccurrences) {
      if (occurrences.size >= 3) { // At least 3 different pairs
        const [type1, type2] = typesPair.split('-');
        const frequency = Array.from(occurrences.values()).reduce((sum, count) => sum + count, 0);
        
        patterns.push({
          id: `relationship-${typesPair}-${Date.now()}`,
          name: `${type1} - ${type2} Relationship`,
          description: `Strong co-occurrence pattern between ${type1} and ${type2}`,
          confidence: Math.min(0.9, frequency / 20 + 0.3),
          frequency,
          examples: Array.from(occurrences.keys()).slice(0, 3),
          suggestedStructure: {
            tableName: `${type1}_${type2}_associations`,
            columns: [
              { name: 'id', type: 'string', nullable: false, description: 'Primary key' },
              { name: `${type1.toLowerCase()}_id`, type: 'string', nullable: false },
              { name: `${type2.toLowerCase()}_id`, type: 'string', nullable: false },
              { name: 'association_type', type: 'string', nullable: true },
              { name: 'confidence', type: 'float', nullable: true },
              { name: 'context', type: 'string', nullable: true },
              { name: 'created_at', type: 'datetime', nullable: false }
            ],
            relationships: [
              {
                type: 'manyToOne' as const,
                targetTable: 'KnowledgeEntity',
                description: `Links to ${type1} entities`
              },
              {
                type: 'manyToOne' as const,
                targetTable: 'KnowledgeEntity',
                description: `Links to ${type2} entities`
              }
            ]
          }
        });
      }
    }

    return patterns;
  }

  /**
   * Analyze temporal patterns in entities
   */
  private async analyzeTemporalPatterns(entities: any[]): Promise<SchemaPattern[]> {
    const patterns: SchemaPattern[] = [];
    
    // Find entities with date/time attributes
    const temporalEntities = entities.filter(entity => 
      entity.attributes?.some((attr: any) => 
        attr.dataType === 'date' || attr.key.toLowerCase().includes('date') || 
        attr.key.toLowerCase().includes('time') || attr.key.toLowerCase().includes('when')
      )
    );

    if (temporalEntities.length >= 5) {
      patterns.push({
        id: `temporal-events-${Date.now()}`,
        name: 'Temporal Events Pattern',
        description: 'Entities with time-based information suggesting event tracking',
        confidence: 0.8,
        frequency: temporalEntities.length,
        examples: temporalEntities.slice(0, 3).map(e => e.title),
        suggestedStructure: {
          tableName: 'events',
          columns: [
            { name: 'id', type: 'string', nullable: false, description: 'Primary key' },
            { name: 'entity_id', type: 'string', nullable: false, description: 'Reference to KnowledgeEntity' },
            { name: 'event_date', type: 'datetime', nullable: false },
            { name: 'event_type', type: 'string', nullable: true },
            { name: 'description', type: 'string', nullable: true },
            { name: 'location', type: 'string', nullable: true },
            { name: 'participants', type: 'string', nullable: true },
            { name: 'created_at', type: 'datetime', nullable: false }
          ],
          relationships: [
            {
              type: 'manyToOne' as const,
              targetTable: 'KnowledgeEntity',
              description: 'Each event is linked to a knowledge entity'
            }
          ]
        }
      });
    }

    return patterns;
  }

  /**
   * Get AI analysis of patterns
   */
  private async getAIAnalysis(entityType: string, attributes: any[], entities: any[]): Promise<string> {
    const prompt = `
Analyze this knowledge pattern:
- Entity Type: ${entityType}
- Common Attributes: ${attributes.map(a => `${a.key} (${a.type}) - ${a.frequency}/${entities.length} entities`).join(', ')}
- Examples: ${entities.slice(0, 3).map(e => e.title).join(', ')}

Provide a brief analysis of why this pattern is significant and how it could improve data organization.
`;

    try {
      const result = await this.aiModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('AI analysis error:', error);
      return `Pattern analysis for ${entityType} with ${attributes.length} common attributes.`;
    }
  }

  /**
   * Create schema proposal from pattern
   */
  private async createSchemaProposal(pattern: SchemaPattern, priority: 'high' | 'medium' | 'low'): Promise<SchemaProposal> {
    const sqlPreview = this.generateSQLPreview(pattern.suggestedStructure);
    
    return {
      id: `proposal-${pattern.id}`,
      type: 'table',
      priority,
      status: 'pending',
      title: `Create ${pattern.suggestedStructure.tableName} table`,
      description: pattern.description,
      rationale: `Pattern detected in ${pattern.frequency} entities with ${Math.round(pattern.confidence * 100)}% confidence. This structure would improve data organization and enable more sophisticated queries.`,
      impact: `Affects ${pattern.frequency} existing entities. Improves query performance and data relationships.`,
      sqlPreview,
      supportingData: {
        transcriptCount: pattern.frequency,
        entityCount: pattern.frequency,
        examples: pattern.examples
      },
      createdAt: new Date()
    };
  }

  /**
   * Generate SQL preview for schema structure
   */
  private generateSQLPreview(structure: any): string {
    const columns = structure.columns.map((col: any) => {
      let sql = `  "${col.name}" ${col.type.toUpperCase()}`;
      if (!col.nullable) sql += ' NOT NULL';
      if (col.unique) sql += ' UNIQUE';
      return sql;
    }).join(',\n');

    return `CREATE TABLE "${structure.tableName}" (\n${columns}\n);`;
  }

  /**
   * Map data types from attributes to SQL types
   */
  private mapDataType(type: string): string {
    const mapping: Record<string, string> = {
      'string': 'TEXT',
      'number': 'FLOAT',
      'integer': 'INTEGER',
      'boolean': 'BOOLEAN',
      'date': 'TIMESTAMP',
      'datetime': 'TIMESTAMP',
      'url': 'TEXT',
      'email': 'TEXT',
      'phone': 'TEXT'
    };
    
    return mapping[type] || 'TEXT';
  }

  /**
   * Group entities by type
   */
  private groupEntitiesByType(entities: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    
    for (const entity of entities) {
      const type = entity.entityType.name;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(entity);
    }
    
    return groups;
  }
}

export default SchemaAnalyzer;
