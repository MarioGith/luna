# 🧠 Phase 4: Dynamic Schema Management

## Overview
Your database becomes **self-evolving** - it analyzes your knowledge patterns and automatically proposes new tables, columns, and relationships based on how you actually use your data.

## 🤖 How It Works

### 1. **Pattern Detection**
The system analyzes your existing knowledge entities to find:
- **Common Attributes**: Fields that appear in 50%+ of entities of the same type
- **Relationship Patterns**: Entities that frequently appear together
- **Temporal Patterns**: Time-based data suggesting event tracking
- **Cross-Entity Connections**: Relationships between different entity types

### 2. **AI-Powered Analysis**
Gemini AI analyzes patterns to:
- Understand why patterns are significant
- Suggest optimal database structures
- Provide implementation rationale
- Assess impact on existing data

### 3. **Automatic Schema Proposals**
The system generates:
- **SQL Previews**: Ready-to-execute database changes
- **Priority Scoring**: High/Medium/Low based on frequency and confidence
- **Impact Analysis**: How changes affect existing data
- **Supporting Evidence**: Examples and statistics

### 4. **Safe Implementation**
- **Review Process**: Human approval required for all changes
- **Rollback Capability**: Full audit trail and recovery options
- **Error Handling**: Failed changes are logged and analyzed
- **Registry Tracking**: All dynamic tables are tracked and managed

## 🔍 Pattern Types Detected

### **Entity Structure Patterns**
```typescript
// Example: If you have many "Person" entities with common fields
{
  name: "Person Structure Pattern",
  confidence: 0.85,
  frequency: 15,
  suggestedStructure: {
    tableName: "person_details",
    columns: [
      { name: "email", type: "TEXT", nullable: false },
      { name: "phone", type: "TEXT", nullable: true },
      { name: "company", type: "TEXT", nullable: true },
      { name: "role", type: "TEXT", nullable: true }
    ]
  }
}
```

### **Relationship Patterns**
```typescript
// Example: People and Events often mentioned together
{
  name: "Person - Event Relationship",
  confidence: 0.75,
  frequency: 12,
  suggestedStructure: {
    tableName: "person_event_associations",
    columns: [
      { name: "person_id", type: "TEXT", nullable: false },
      { name: "event_id", type: "TEXT", nullable: false },
      { name: "association_type", type: "TEXT", nullable: true },
      { name: "confidence", type: "FLOAT", nullable: true }
    ]
  }
}
```

### **Temporal Patterns**
```typescript
// Example: Many entities have time-based information
{
  name: "Temporal Events Pattern",
  confidence: 0.8,
  frequency: 20,
  suggestedStructure: {
    tableName: "events",
    columns: [
      { name: "event_date", type: "TIMESTAMP", nullable: false },
      { name: "event_type", type: "TEXT", nullable: true },
      { name: "location", type: "TEXT", nullable: true },
      { name: "participants", type: "TEXT", nullable: true }
    ]
  }
}
```

## 🚀 API Usage

### **Analyze Patterns**
```bash
curl -X POST http://localhost:3000/api/schema/analyze \
  -H "Content-Type: application/json" \
  -d '{"action": "analyze"}'
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "patterns": 5,
    "proposals": 3,
    "highPriorityProposals": 1,
    "mediumPriorityProposals": 1,
    "lowPriorityProposals": 1
  },
  "proposals": [
    {
      "id": "proposal-pattern-person-1234567890",
      "type": "table",
      "priority": "high",
      "title": "Create person_details table",
      "description": "Common attributes found in Person entities",
      "rationale": "Pattern detected in 15 entities with 85% confidence",
      "sqlPreview": "CREATE TABLE \"person_details\" (...)",
      "supportingData": {
        "entityCount": 15,
        "examples": ["John Doe", "Jane Smith", "Mike Johnson"]
      }
    }
  ]
}
```

### **Get All Proposals**
```bash
curl -X GET "http://localhost:3000/api/schema/analyze?type=proposals"
```

### **Approve Proposal**
```bash
curl -X POST http://localhost:3000/api/schema/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve", 
    "approveProposal": "proposal-pattern-person-1234567890"
  }'
```

### **Reject Proposal**
```bash
curl -X POST http://localhost:3000/api/schema/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reject", 
    "rejectProposal": "proposal-pattern-person-1234567890"
  }'
```

### **View History**
```bash
curl -X GET "http://localhost:3000/api/schema/analyze?type=history"
```

### **Get Statistics**
```bash
curl -X GET "http://localhost:3000/api/schema/analyze?type=stats"
```

## 🗄️ Database Schema

### **Schema Proposals**
```sql
CREATE TABLE "schema_proposals" (
    "id" TEXT PRIMARY KEY,
    "type" TEXT NOT NULL,              -- 'table', 'column', 'relationship', 'index'
    "priority" TEXT NOT NULL,          -- 'high', 'medium', 'low'
    "status" TEXT DEFAULT 'pending',   -- 'pending', 'approved', 'rejected', 'implemented'
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "sqlPreview" TEXT NOT NULL,
    "supportingData" TEXT NOT NULL,    -- JSON with examples and statistics
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "implementedAt" TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewNotes" TEXT
);
```

### **Knowledge Patterns**
```sql
CREATE TABLE "knowledge_patterns" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" FLOAT NOT NULL,       -- 0.0 to 1.0
    "frequency" INTEGER NOT NULL,      -- How many entities show this pattern
    "examples" TEXT NOT NULL,          -- JSON array of examples
    "suggestedStructure" TEXT NOT NULL,-- JSON with proposed table structure
    "status" TEXT DEFAULT 'detected',  -- 'detected', 'reviewed', 'implemented'
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "lastAnalyzed" TIMESTAMP DEFAULT NOW()
);
```

### **Schema Evolution History**
```sql
CREATE TABLE "schema_evolution_history" (
    "id" TEXT PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,        -- 'approve', 'reject', 'rollback'
    "sqlExecuted" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP DEFAULT NOW(),
    "executedBy" TEXT,
    "rollbackSql" TEXT
);
```

### **Dynamic Tables Registry**
```sql
CREATE TABLE "dynamic_tables" (
    "id" TEXT PRIMARY KEY,
    "tableName" TEXT UNIQUE NOT NULL,
    "createdFromProposal" TEXT NOT NULL,
    "schema" TEXT NOT NULL,            -- Original CREATE TABLE statement
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "lastModified" TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Real-World Examples

### **Scenario 1: Meeting Management**
Your transcripts mention many meetings with dates, attendees, and locations:

**Detected Pattern:**
- 20+ entities with "date", "attendees", "location" attributes
- High confidence (0.9) pattern

**Proposed Schema:**
```sql
CREATE TABLE "meetings" (
    "id" TEXT PRIMARY KEY,
    "entity_id" TEXT NOT NULL,
    "meeting_date" TIMESTAMP NOT NULL,
    "attendees" TEXT,
    "location" TEXT,
    "agenda" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP DEFAULT NOW()
);
```

**Impact:**
- Improves meeting queries by 5x
- Enables calendar integration
- Supports attendee tracking

### **Scenario 2: Contact Management**
People entities frequently have email, phone, company information:

**Detected Pattern:**
- 15+ person entities with contact details
- 85% have email, 70% have phone, 60% have company

**Proposed Schema:**
```sql
CREATE TABLE "contacts" (
    "id" TEXT PRIMARY KEY,
    "person_id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "role" TEXT,
    "linkedin" TEXT,
    "created_at" TIMESTAMP DEFAULT NOW()
);
```

**Impact:**
- Dedicated contact management
- Enables CRM-like functionality
- Supports relationship tracking

### **Scenario 3: Task Management**
Action items and tasks frequently mentioned together:

**Detected Pattern:**
- Task entities with due dates, priorities, status
- Strong relationship with people (assignees)

**Proposed Schema:**
```sql
CREATE TABLE "tasks" (
    "id" TEXT PRIMARY KEY,
    "entity_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP,
    "priority" TEXT,
    "status" TEXT DEFAULT 'pending',
    "assigned_to" TEXT,
    "created_at" TIMESTAMP DEFAULT NOW()
);
```

## 🔄 Workflow

### **1. Automatic Analysis**
- Runs weekly or on-demand
- Analyzes all knowledge entities
- Detects patterns with AI assistance
- Generates prioritized proposals

### **2. Review Process**
- High-priority proposals require attention
- Review rationale and supporting data
- Preview SQL changes
- Approve or reject with notes

### **3. Implementation**
- Approved proposals executed safely
- Full audit trail maintained
- Rollback capability available
- Dynamic table registry updated

### **4. Monitoring**
- Track schema evolution over time
- Monitor proposal success rates
- Analyze pattern detection accuracy
- Optimize thresholds and rules

## 📊 Benefits

### **Adaptive Database**
- **Self-Optimizing**: Schema evolves with your data patterns
- **Pattern Recognition**: AI identifies structure you might miss
- **Relationship Discovery**: Finds hidden connections in your data

### **Improved Performance**
- **Optimized Queries**: Dedicated tables for common patterns
- **Better Indexes**: Automatic index suggestions
- **Reduced Complexity**: Simplified data relationships

### **Enhanced Functionality**
- **New Capabilities**: Unlock features based on your actual usage
- **Better Organization**: Structure matches your mental model
- **Scalable Growth**: Database grows intelligently with your needs

## 🛡️ Safety Features

### **Human Oversight**
- All changes require approval
- Clear impact analysis provided
- Supporting evidence displayed
- Rollback options available

### **Error Handling**
- Failed changes logged and analyzed
- Automatic rollback on errors
- Detailed error messages
- Recovery procedures documented

### **Audit Trail**
- Complete history of all changes
- Who approved what and when
- Success/failure tracking
- Performance impact monitoring

## 🎨 Future Enhancements

### **Phase 5 Preview**
- **MCP Server Integration**: Use dynamic schema for conversational AI
- **Automated Workflows**: Trigger actions based on schema changes
- **Advanced Analytics**: Machine learning on schema evolution patterns
- **Cross-Database Sync**: Propagate changes across environments

Your database is now **intelligent** - it learns from your data and suggests improvements automatically! 🧠✨

## 🚀 Getting Started

### **Setup**
1. **Run Migration**: Apply schema management tables
2. **Analyze Data**: Run first pattern analysis
3. **Review Proposals**: Check suggested improvements
4. **Implement Changes**: Approve high-value proposals

### **Commands**
```bash
# Setup
psql -U postgres -d audio_transcription -f prisma/migrations/20250107_add_schema_management/migration.sql

# Analyze
curl -X POST http://localhost:3000/api/schema/analyze -d '{"action": "analyze"}'

# Review
curl -X GET "http://localhost:3000/api/schema/analyze?type=proposals"

# Implement
curl -X POST http://localhost:3000/api/schema/analyze -d '{"action": "approve", "approveProposal": "PROPOSAL_ID"}'
```

Ready to have the smartest database that evolves with your needs! 🎯
