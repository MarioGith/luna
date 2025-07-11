import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SchemaAnalyzer } from '@/lib/schema-analyzer';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { action = 'analyze', approveProposal, rejectProposal } = await request.json();
    
    const analyzer = new SchemaAnalyzer(prisma);

    switch (action) {
      case 'analyze':
        return await handleAnalyze(analyzer);
      case 'approve':
        return await handleApprove(approveProposal);
      case 'reject':
        return await handleReject(rejectProposal);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Schema analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleAnalyze(analyzer: SchemaAnalyzer) {
  console.log('🔍 Starting schema analysis...');
  
  // 1. Analyze knowledge patterns
  const patterns = await analyzer.analyzeKnowledgePatterns();
  console.log(`📊 Found ${patterns.length} patterns`);
  
  // 2. Generate schema proposals
  const proposals = await analyzer.generateSchemaProposals(patterns);
  console.log(`💡 Generated ${proposals.length} proposals`);
  
  // 3. Store patterns in database
  for (const pattern of patterns) {
    await prisma.$executeRaw`
      INSERT INTO knowledge_patterns (id, name, description, confidence, frequency, examples, "suggestedStructure", status, "createdAt", "lastAnalyzed")
      VALUES (${pattern.id}, ${pattern.name}, ${pattern.description}, ${pattern.confidence}, ${pattern.frequency}, ${JSON.stringify(pattern.examples)}, ${JSON.stringify(pattern.suggestedStructure)}, 'detected', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        confidence = EXCLUDED.confidence,
        frequency = EXCLUDED.frequency,
        "lastAnalyzed" = NOW()
    `;
  }
  
  // 4. Store proposals in database
  for (const proposal of proposals) {
    await prisma.$executeRaw`
      INSERT INTO schema_proposals (id, type, priority, status, title, description, rationale, impact, "sqlPreview", "supportingData", "createdAt", "updatedAt")
      VALUES (${proposal.id}, ${proposal.type}, ${proposal.priority}, ${proposal.status}, ${proposal.title}, ${proposal.description}, ${proposal.rationale}, ${proposal.impact}, ${proposal.sqlPreview}, ${JSON.stringify(proposal.supportingData)}, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `;
  }
  
  // 5. Get summary statistics
  const stats = await getAnalysisStats();
  
  return NextResponse.json({
    success: true,
    analysis: {
      patterns: patterns.length,
      proposals: proposals.length,
      highPriorityProposals: proposals.filter(p => p.priority === 'high').length,
      mediumPriorityProposals: proposals.filter(p => p.priority === 'medium').length,
      lowPriorityProposals: proposals.filter(p => p.priority === 'low').length
    },
    stats,
    proposals: proposals.slice(0, 10), // Return top 10 proposals
    timestamp: new Date().toISOString()
  });
}

async function handleApprove(proposalId: string) {
  if (!proposalId) {
    return NextResponse.json({ error: 'Proposal ID required' }, { status: 400 });
  }
  
  // Get the proposal
  const proposal = await prisma.$queryRaw`
    SELECT * FROM schema_proposals WHERE id = ${proposalId} AND status = 'pending'
  `;
  
  if (!Array.isArray(proposal) || proposal.length === 0) {
    return NextResponse.json({ error: 'Proposal not found or already processed' }, { status: 404 });
  }
  
  const proposalData = proposal[0];
  
  try {
    // Execute the SQL
    await prisma.$executeRawUnsafe(proposalData.sqlPreview);
    
    // Update proposal status
    await prisma.$executeRaw`
      UPDATE schema_proposals 
      SET status = 'approved', "implementedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${proposalId}
    `;
    
    // Record in evolution history
    await prisma.$executeRaw`
      INSERT INTO schema_evolution_history (id, "proposalId", "actionType", "sqlExecuted", success, "executedAt")
      VALUES (${crypto.randomUUID()}, ${proposalId}, 'approve', ${proposalData.sqlPreview}, true, NOW())
    `;
    
    // Register in dynamic tables if it's a table creation
    if (proposalData.type === 'table') {
      const tableName = extractTableName(proposalData.sqlPreview);
      if (tableName) {
        await prisma.$executeRaw`
          INSERT INTO dynamic_tables (id, "tableName", "createdFromProposal", schema, "isActive", "createdAt", "lastModified")
          VALUES (${crypto.randomUUID()}, ${tableName}, ${proposalId}, ${proposalData.sqlPreview}, true, NOW(), NOW())
        `;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Proposal approved and implemented successfully',
      proposalId,
      executedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Schema implementation error:', error);
    
    // Update proposal status to failed
    await prisma.$executeRaw`
      UPDATE schema_proposals 
      SET status = 'rejected', "updatedAt" = NOW()
      WHERE id = ${proposalId}
    `;
    
    // Record failure in evolution history
    await prisma.$executeRaw`
      INSERT INTO schema_evolution_history (id, "proposalId", "actionType", "sqlExecuted", success, "errorMessage", "executedAt")
      VALUES (${crypto.randomUUID()}, ${proposalId}, 'approve', ${proposalData.sqlPreview}, false, ${error instanceof Error ? error.message : 'Unknown error'}, NOW())
    `;
    
    return NextResponse.json({
      success: false,
      error: 'Failed to implement proposal',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handleReject(proposalId: string) {
  if (!proposalId) {
    return NextResponse.json({ error: 'Proposal ID required' }, { status: 400 });
  }
  
  // Update proposal status
  await prisma.$executeRaw`
    UPDATE schema_proposals 
    SET status = 'rejected', "updatedAt" = NOW()
    WHERE id = ${proposalId} AND status = 'pending'
  `;
  
  // Record in evolution history
  await prisma.$executeRaw`
    INSERT INTO schema_evolution_history (id, "proposalId", "actionType", "sqlExecuted", success, "executedAt")
    VALUES (${crypto.randomUUID()}, ${proposalId}, 'reject', '', true, NOW())
  `;
  
  return NextResponse.json({
    success: true,
    message: 'Proposal rejected successfully',
    proposalId,
    rejectedAt: new Date().toISOString()
  });
}

async function getAnalysisStats() {
  const stats = await prisma.$queryRaw`
    SELECT 
      COUNT(*) as total_entities,
      COUNT(DISTINCT "entityTypeId") as entity_types,
      COUNT(DISTINCT "transcriptionId") as transcriptions_with_entities,
      AVG(confidence) as avg_confidence
    FROM "KnowledgeEntity"
    WHERE "isActive" = true
  `;
  
  const proposals = await prisma.$queryRaw`
    SELECT 
      status,
      priority,
      COUNT(*) as count
    FROM schema_proposals
    GROUP BY status, priority
    ORDER BY status, priority
  `;
  
  return {
    entities: Array.isArray(stats) ? stats[0] : {},
    proposals: Array.isArray(proposals) ? proposals : []
  };
}

function extractTableName(sql: string): string | null {
  const match = sql.match(/CREATE TABLE "([^"]+)"/i);
  return match ? match[1] : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'proposals';
    
    switch (type) {
      case 'proposals':
        return await getProposals();
      case 'patterns':
        return await getPatterns();
      case 'history':
        return await getHistory();
      case 'stats':
        return await getStats();
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Schema GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getProposals() {
  const proposals = await prisma.$queryRaw`
    SELECT * FROM schema_proposals 
    ORDER BY 
      CASE priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
      END,
      "createdAt" DESC
  `;
  
  return NextResponse.json({
    proposals: Array.isArray(proposals) ? proposals : [],
    count: Array.isArray(proposals) ? proposals.length : 0
  });
}

async function getPatterns() {
  const patterns = await prisma.$queryRaw`
    SELECT * FROM knowledge_patterns 
    ORDER BY confidence DESC, frequency DESC
  `;
  
  return NextResponse.json({
    patterns: Array.isArray(patterns) ? patterns : [],
    count: Array.isArray(patterns) ? patterns.length : 0
  });
}

async function getHistory() {
  const history = await prisma.$queryRaw`
    SELECT 
      h.*,
      p.title as proposal_title,
      p.type as proposal_type
    FROM schema_evolution_history h
    JOIN schema_proposals p ON h."proposalId" = p.id
    ORDER BY h."executedAt" DESC
    LIMIT 50
  `;
  
  return NextResponse.json({
    history: Array.isArray(history) ? history : [],
    count: Array.isArray(history) ? history.length : 0
  });
}

async function getStats() {
  const stats = await getAnalysisStats();
  
  const dynamicTables = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM dynamic_tables WHERE "isActive" = true
  `;
  
  return NextResponse.json({
    ...stats,
    dynamicTables: Array.isArray(dynamicTables) ? dynamicTables[0] : { count: 0 }
  });
}
