import { GoogleGenerativeAI } from '@google/generative-ai'
import { getExchangeRate, calculateTokenCost } from './pricing'

function getGenAI() {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is not defined in environment variables')
  }
  return new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
}

export interface TranscriptionResult {
  originalText: string
  markdown: string
  confidence: number
  inputTokens: number
  outputTokens: number
  transcriptionCost: number
  embeddingCost: number
  totalCost: number
  model: string
  pricePerInputToken: number
  pricePerOutputToken: number
  exchangeRate: number
  // Speaker detection fields
  speakerCount: number
  hasSpeakerDiarization: boolean
  speakerTranscription: string | null
  speakerMetadata: string | null
}

export interface EmbeddingResult {
  embedding: number[]
  inputTokens: number
  outputTokens: number
  cost: number
  model: string
  exchangeRate: number
}

export const transcribeAudio = async (
  audioBuffer: Buffer, 
  mimeType: string, 
  selectedModel: string = 'gemini-2.0-flash'
): Promise<TranscriptionResult> => {
  try {
    const genAI = getGenAI()
    const model = genAI.getGenerativeModel({ model: selectedModel })
    
    const result = await model.generateContent([
      {
        inlineData: {
          data: audioBuffer.toString('base64'),
          mimeType: mimeType
        }
      },
      `Please transcribe this audio file with speaker detection capabilities. Follow these requirements:

1. **Speaker Detection**: Analyze the audio to determine how many different speakers are present (limit: 10 speakers max)
2. **Output Format**: Provide the response in this exact JSON structure:
{
  "speakerCount": [number of speakers detected],
  "hasSpeakerDiarization": [true if multiple speakers detected, false if single speaker],
  "regularTranscription": "[clean transcription without speaker labels in markdown format]",
  "speakerTranscription": "[transcription with speaker labels like **Speaker 1:** Hello **Speaker 2:** Hi there]",
  "speakerMetadata": {
    "speakers": [
      {"id": "Speaker 1", "segments": [{"start": "approximate timestamp", "text": "what they said"}]},
      {"id": "Speaker 2", "segments": [{"start": "approximate timestamp", "text": "what they said"}]}
    ],
    "confidence": "high/medium/low"
  }
}

3. **Speaker Labeling**: Use "Speaker 1", "Speaker 2", etc. for different voices
4. **Single Speaker**: If only one speaker detected, set hasSpeakerDiarization to false and speakerTranscription to null
5. **Quality**: Focus on accuracy - if unsure about speaker changes, be conservative

Return ONLY the JSON response, no additional text.`
    ])
    
    const response = await result.response
    const text = response.text()
    
    // Extract token usage information
    const usageMetadata = response.usageMetadata
    const inputTokens = usageMetadata?.promptTokenCount || 0
    const outputTokens = usageMetadata?.candidatesTokenCount || 0
    
    // Get exchange rate and calculate costs
    const exchangeRate = await getExchangeRate()
    const costCalc = calculateTokenCost(inputTokens, outputTokens, selectedModel, exchangeRate)
    
    // Parse the JSON response for speaker detection
    let parsedResponse: {
      speakerCount?: number
      hasSpeakerDiarization?: boolean
      regularTranscription?: string
      speakerTranscription?: string | null
      speakerMetadata?: {
        speakers: Array<{
          id: string
          segments: Array<{
            start: string
            text: string
          }>
        }>
        confidence: string
      }
    } | null = null
    let speakerCount = 1
    let hasSpeakerDiarization = false
    let speakerTranscription: string | null = null
    let speakerMetadata: string | null = null
    let originalText = text
    let markdown = text
    
    try {
      // Try to parse JSON response
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim()
      parsedResponse = JSON.parse(cleanedText)
      
      speakerCount = parsedResponse?.speakerCount || 1
      hasSpeakerDiarization = parsedResponse?.hasSpeakerDiarization || false
      speakerTranscription = parsedResponse?.speakerTranscription || null
      speakerMetadata = parsedResponse?.speakerMetadata ? JSON.stringify(parsedResponse.speakerMetadata) : null
      originalText = parsedResponse?.regularTranscription || text
      markdown = parsedResponse?.regularTranscription || text
    } catch (error) {
      // If JSON parsing fails, treat as single speaker with fallback
      console.warn('Failed to parse speaker detection JSON, using fallback:', error)
      speakerCount = 1
      hasSpeakerDiarization = false
      speakerTranscription = null
      speakerMetadata = null
      originalText = text
      markdown = text
    }
    
    return {
      originalText,
      markdown,
      confidence: 0.95, // Gemini doesn't provide confidence scores, so we use a default
      inputTokens,
      outputTokens,
      transcriptionCost: costCalc.transcriptionCost,
      embeddingCost: 0, // Transcription doesn't include embedding cost
      totalCost: costCalc.totalCost,
      model: selectedModel,
      pricePerInputToken: costCalc.pricePerInputToken,
      pricePerOutputToken: costCalc.pricePerOutputToken,
      exchangeRate,
      // Speaker detection fields
      speakerCount,
      hasSpeakerDiarization,
      speakerTranscription,
      speakerMetadata
    }
  } catch (error) {
    console.error('Error transcribing audio:', error)
    throw new Error('Failed to transcribe audio')
  }
}

export const generateEmbedding = async (
  text: string, 
  selectedModel: string = 'text-embedding-004'
): Promise<EmbeddingResult> => {
  try {
    const genAI = getGenAI()
    const model = genAI.getGenerativeModel({ model: selectedModel })
    
    const result = await model.embedContent(text)
    
    // Estimate token usage for embedding (approximate)
    const inputTokens = Math.ceil(text.length / 4) // Rough estimate: 4 chars per token
    const outputTokens = 0 // Embeddings don't have output tokens
    
    // Get exchange rate and calculate costs
    const exchangeRate = await getExchangeRate()
    const costCalc = calculateTokenCost(inputTokens, outputTokens, selectedModel, exchangeRate)
    
    return {
      embedding: result.embedding.values,
      inputTokens,
      outputTokens,
      cost: costCalc.totalCost,
      model: selectedModel,
      exchangeRate
    }
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw new Error('Failed to generate embedding')
  }
}

export const searchSimilarTranscriptions = async (
  query: string, 
  embeddings: number[][], 
  texts: string[], 
  topK: number = 5,
  embeddingModel: string = 'text-embedding-004'
) => {
  try {
    const queryEmbeddingResult = await generateEmbedding(query, embeddingModel)
    
    // Calculate cosine similarity
    const similarities = embeddings.map((embedding, index) => {
      const similarity = cosineSimilarity(queryEmbeddingResult.embedding, embedding)
      return { index, similarity, text: texts[index] }
    })
    
    // Sort by similarity and return top K
    const results = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
    
    return {
      results,
      searchCost: queryEmbeddingResult.cost,
      inputTokens: queryEmbeddingResult.inputTokens,
      model: queryEmbeddingResult.model,
      exchangeRate: queryEmbeddingResult.exchangeRate
    }
  } catch (error) {
    console.error('Error searching similar transcriptions:', error)
    throw new Error('Failed to search transcriptions')
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0)
  const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0))
  const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0))
  
  return dotProduct / (magnitudeA * magnitudeB)
}
