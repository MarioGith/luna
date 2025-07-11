'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Brain, Check, X, Edit, Eye, AlertCircle, Lightbulb, Database } from 'lucide-react'

interface ExtractionReview {
  id: string
  entityType: {
    name: string
    displayName: string
    description?: string
  }
  extractedData: {
    title: string
    description?: string
    attributes: Record<string, {
      value: string
      dataType: string
      confidence: number
    }>
    confidence: number
  }
  sourceText: string
  confidence: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED'
  createdAt: string
  reviewedAt?: string
  reviewNotes?: string
  transcription: {
    id: string
    fileName: string
    createdAt: string
  }
}

interface KnowledgeEntity {
  id: string
  title: string
  description?: string
  confidence?: number
  isVerified: boolean
  createdAt: string
  entityType: {
    name: string
    displayName: string
    color?: string
    icon?: string
  }
  attributes: Array<{
    id: string
    key: string
    value: string
    dataType: string
    confidence?: number
    isVerified: boolean
  }>
  transcription?: {
    id: string
    fileName: string
    createdAt: string
  }
  relationships: Array<{
    id: string
    type: string
    description?: string
    direction: 'incoming' | 'outgoing'
    relatedEntity: {
      id: string
      title: string
      entityType: {
        name: string
        displayName: string
      }
    }
  }>
}

export function KnowledgeExtractionPanel() {
  const [pendingExtractions, setPendingExtractions] = useState<ExtractionReview[]>([])
  const [knowledgeEntities, setKnowledgeEntities] = useState<KnowledgeEntity[]>([])
  const [selectedExtraction, setSelectedExtraction] = useState<ExtractionReview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editedData, setEditedData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'entities'>('pending')

  useEffect(() => {
    fetchPendingExtractions()
    fetchKnowledgeEntities()
  }, [])

  const fetchPendingExtractions = async () => {
    try {
      const response = await fetch('/api/knowledge/extractions?status=PENDING&limit=20')
      const data = await response.json()
      setPendingExtractions(data.extractions || [])
    } catch (error) {
      console.error('Error fetching pending extractions:', error)
    }
  }

  const fetchKnowledgeEntities = async () => {
    try {
      const response = await fetch('/api/knowledge/entities?limit=20')
      const data = await response.json()
      setKnowledgeEntities(data.entities || [])
    } catch (error) {
      console.error('Error fetching knowledge entities:', error)
    }
  }

  const handleExtractionAction = async (extractionId: string, action: 'approve' | 'reject' | 'modify', modifications?: any, reviewNotes?: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/knowledge/extractions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractionId,
          action,
          modifications,
          reviewNotes
        })
      })

      if (response.ok) {
        await fetchPendingExtractions()
        await fetchKnowledgeEntities()
        setSelectedExtraction(null)
        setEditMode(false)
        setEditedData(null)
      } else {
        const error = await response.json()
        console.error('Error processing extraction:', error)
      }
    } catch (error) {
      console.error('Error processing extraction:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (extraction: ExtractionReview) => {
    setEditMode(true)
    setEditedData({
      title: extraction.extractedData.title,
      description: extraction.extractedData.description || '',
      attributes: { ...extraction.extractedData.attributes }
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getDataTypeIcon = (dataType: string) => {
    switch (dataType) {
      case 'email': return '📧'
      case 'phone': return '📞'
      case 'url': return '🔗'
      case 'date': return '📅'
      case 'time': return '⏰'
      case 'address': return '📍'
      case 'number': return '🔢'
      default: return '📝'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Knowledge Management
          </CardTitle>
          <CardDescription>
            Review and manage automatically extracted structured information from your transcriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Pending Reviews ({pendingExtractions.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('entities')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'entities'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Database className="h-4 w-4" />
                Knowledge Base ({knowledgeEntities.length})
              </div>
            </button>
          </div>

          {/* Pending Extractions Tab */}
          {activeTab === 'pending' && (
            <div className="space-y-4">
              {pendingExtractions.length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No pending extractions</p>
                  <p className="text-sm text-gray-400">
                    Knowledge will be automatically extracted from new transcriptions
                  </p>
                </div>
              ) : (
                pendingExtractions.map((extraction) => (
                  <Card key={extraction.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              {extraction.entityType.displayName}
                            </Badge>
                            <span className={`text-sm font-medium ${getConfidenceColor(extraction.confidence)}`}>
                              {Math.round(extraction.confidence * 100)}% confidence
                            </span>
                          </div>
                          <h4 className="font-semibold text-lg">
                            {extraction.extractedData.title}
                          </h4>
                          {extraction.extractedData.description && (
                            <p className="text-gray-600 mt-1">
                              {extraction.extractedData.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedExtraction(extraction)}>
                                <Eye className="h-4 w-4 mr-1" />
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Review Knowledge Extraction</DialogTitle>
                                <DialogDescription>
                                  Review and approve, modify, or reject this extracted information
                                </DialogDescription>
                              </DialogHeader>
                              
                              {selectedExtraction && (
                                <div className="space-y-6">
                                  {/* Source Information */}
                                  <div>
                                    <Label className="text-sm font-medium">Source</Label>
                                    <div className="bg-gray-50 p-3 rounded-md mt-1">
                                      <p className="text-sm font-medium">
                                        {selectedExtraction.transcription.fileName}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {formatDate(selectedExtraction.transcription.createdAt)}
                                      </p>
                                      <Separator className="my-2" />
                                      <p className="text-sm italic">
                                        "{selectedExtraction.sourceText}"
                                      </p>
                                    </div>
                                  </div>

                                  {/* Extracted Data */}
                                  <div>
                                    <Label className="text-sm font-medium">Extracted Information</Label>
                                    {editMode ? (
                                      <div className="space-y-4 mt-2">
                                        <div>
                                          <Label>Title</Label>
                                          <Input
                                            value={editedData?.title || ''}
                                            onChange={(e) => setEditedData({
                                              ...editedData,
                                              title: e.target.value
                                            })}
                                          />
                                        </div>
                                        <div>
                                          <Label>Description</Label>
                                          <Textarea
                                            value={editedData?.description || ''}
                                            onChange={(e) => setEditedData({
                                              ...editedData,
                                              description: e.target.value
                                            })}
                                          />
                                        </div>
                                        {/* Attributes editing would go here */}
                                      </div>
                                    ) : (
                                      <div className="bg-gray-50 p-3 rounded-md mt-1">
                                        <h4 className="font-medium">
                                          {selectedExtraction.extractedData.title}
                                        </h4>
                                        {selectedExtraction.extractedData.description && (
                                          <p className="text-sm text-gray-600 mt-1">
                                            {selectedExtraction.extractedData.description}
                                          </p>
                                        )}
                                        
                                        {Object.keys(selectedExtraction.extractedData.attributes).length > 0 && (
                                          <div className="mt-3 space-y-2">
                                            <Label className="text-xs font-medium">Attributes:</Label>
                                            {Object.entries(selectedExtraction.extractedData.attributes).map(([key, attr]) => (
                                              <div key={key} className="flex items-center gap-2 text-sm">
                                                <span>{getDataTypeIcon(attr.dataType)}</span>
                                                <span className="font-medium">{key}:</span>
                                                <span>{attr.value}</span>
                                                <Badge variant="outline" className="text-xs">
                                                  {Math.round(attr.confidence * 100)}%
                                                </Badge>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex justify-between">
                                    <div className="flex gap-2">
                                      {!editMode ? (
                                        <>
                                          <Button
                                            onClick={() => handleExtractionAction(selectedExtraction.id, 'approve')}
                                            disabled={isLoading}
                                            size="sm"
                                          >
                                            <Check className="h-4 w-4 mr-1" />
                                            Approve
                                          </Button>
                                          <Button
                                            variant="outline"
                                            onClick={() => startEdit(selectedExtraction)}
                                            size="sm"
                                          >
                                            <Edit className="h-4 w-4 mr-1" />
                                            Modify
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button
                                            onClick={() => handleExtractionAction(
                                              selectedExtraction.id, 
                                              'modify', 
                                              editedData
                                            )}
                                            disabled={isLoading}
                                            size="sm"
                                          >
                                            <Check className="h-4 w-4 mr-1" />
                                            Save Changes
                                          </Button>
                                          <Button
                                            variant="outline"
                                            onClick={() => {
                                              setEditMode(false)
                                              setEditedData(null)
                                            }}
                                            size="sm"
                                          >
                                            Cancel
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleExtractionAction(selectedExtraction.id, 'reject')}
                                      disabled={isLoading}
                                      size="sm"
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>

                      <div className="text-sm text-gray-500">
                        <p>From: {extraction.transcription.fileName}</p>
                        <p>Detected: {formatDate(extraction.createdAt)}</p>
                        <p className="italic mt-2">"{extraction.sourceText.substring(0, 100)}..."</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Knowledge Entities Tab */}
          {activeTab === 'entities' && (
            <div className="space-y-4">
              {knowledgeEntities.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No knowledge entities yet</p>
                  <p className="text-sm text-gray-400">
                    Approved extractions will appear here
                  </p>
                </div>
              ) : (
                knowledgeEntities.map((entity) => (
                  <Card key={entity.id} className="border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">
                              {entity.entityType.displayName}
                            </Badge>
                            {entity.isVerified && (
                              <Badge variant="outline" className="text-green-600">
                                <Check className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-semibold text-lg">{entity.title}</h4>
                          {entity.description && (
                            <p className="text-gray-600 mt-1">{entity.description}</p>
                          )}
                          
                          {entity.attributes.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {entity.attributes.map((attr) => (
                                <div key={attr.id} className="flex items-center gap-2 text-sm">
                                  <span>{getDataTypeIcon(attr.dataType)}</span>
                                  <span className="font-medium">{attr.key}:</span>
                                  <span>{attr.value}</span>
                                  {attr.isVerified && (
                                    <Check className="h-3 w-3 text-green-600" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {entity.relationships.length > 0 && (
                            <div className="mt-3">
                              <Label className="text-xs font-medium">Related:</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {entity.relationships.map((rel) => (
                                  <Badge key={rel.id} variant="outline" className="text-xs">
                                    {rel.relatedEntity.title} ({rel.type})
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-500 mt-4">
                        {entity.transcription && (
                          <p>Source: {entity.transcription.fileName}</p>
                        )}
                        <p>Created: {formatDate(entity.createdAt)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
