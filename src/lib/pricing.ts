import { prisma } from "./db";

// Pricing structure types
interface TieredPricing {
  input: {
    small: number;
    large: number;
  };
  output: {
    small: number;
    large: number;
  };
  threshold: number;
}

interface FlatPricing {
  input: number;
  output: number;
}

// Google Gemini API pricing (USD per million tokens)
export const GEMINI_PRICING: {
  "gemini-1.5-flash": TieredPricing;
  "gemini-1.5-pro": TieredPricing;
  "gemini-2.0-flash": TieredPricing;
  "gemini-2.0-flash-lite": FlatPricing;
  "gemini-2.5-flash": TieredPricing;
  "gemini-2.5-pro": TieredPricing;
  "text-embedding-004": FlatPricing;
} = {
  "gemini-1.5-flash": {
    input: {
      small: 0.075, // <= 128k tokens
      large: 0.15, // > 128k tokens
    },
    output: {
      small: 0.3, // <= 128k tokens
      large: 0.6, // > 128k tokens
    },
    threshold: 128000, // 128k tokens
  },
  "gemini-1.5-pro": {
    input: {
      small: 1.25, // <= 128k tokens
      large: 2.5, // > 128k tokens
    },
    output: {
      small: 5.0, // <= 128k tokens
      large: 10.0, // > 128k tokens
    },
    threshold: 128000, // 128k tokens
  },
  "gemini-2.0-flash": {
    input: {
      small: 0.1, // <= 128k tokens
      large: 0.1, // No tiering for 2.0 models
    },
    output: {
      small: 0.4, // <= 128k tokens
      large: 0.4, // No tiering for 2.0 models
    },
    threshold: 1000000, // 1M tokens
  },
  "gemini-2.0-flash-lite": {
    input: 0.075, // Flat pricing
    output: 0.3, // Flat pricing
  },
  "gemini-2.5-flash": {
    input: {
      small: 0.3, // <= 128k tokens
      large: 0.3, // No tiering for 2.5 models
    },
    output: {
      small: 2.5, // <= 128k tokens
      large: 2.5, // No tiering for 2.5 models
    },
    threshold: 1000000, // 1M tokens
  },
  "gemini-2.5-pro": {
    input: {
      small: 1.25, // <= 200k tokens
      large: 2.5, // > 200k tokens
    },
    output: {
      small: 10.0, // <= 200k tokens
      large: 15.0, // > 200k tokens
    },
    threshold: 200000, // 200k tokens
  },
  "text-embedding-004": {
    input: 0.0, // Free
    output: 0.0, // Free
  },
};

// Exchange rate API (free tier)
const EXCHANGE_RATE_API = "https://api.exchangerate-api.com/v4/latest/USD";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface CostCalculation {
  inputTokens: number;
  outputTokens: number;
  transcriptionCost: number;
  embeddingCost: number;
  totalCost: number;
  model: string;
  pricePerInputToken: number;
  pricePerOutputToken: number;
  exchangeRate: number;
}

/**
 * Get current USD to CAD exchange rate
 */
export async function getExchangeRate(): Promise<number> {
  try {
    const response = await fetch(EXCHANGE_RATE_API);
    if (!response.ok) {
      throw new Error("Failed to fetch exchange rate");
    }
    const data = await response.json();
    return data.rates.CAD || 1.35; // Fallback to approximate rate
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    return 1.35; // Fallback CAD exchange rate
  }
}

/**
 * Calculate cost based on token usage
 */
export function calculateTokenCost(
  inputTokens: number,
  outputTokens: number,
  model: string,
  exchangeRate: number
): CostCalculation {
  const pricing = GEMINI_PRICING[model as keyof typeof GEMINI_PRICING];

  if (!pricing) {
    throw new Error(`Pricing not found for model: ${model}`);
  }

  let inputCostUSD = 0;
  let outputCostUSD = 0;

  // Handle different pricing structures
  if ("threshold" in pricing) {
    // Model with tiered pricing (like gemini-1.5-flash)
    const tieredPricing = pricing as TieredPricing;

    if (inputTokens <= tieredPricing.threshold) {
      inputCostUSD = (inputTokens / 1000000) * tieredPricing.input.small;
    } else {
      inputCostUSD = (inputTokens / 1000000) * tieredPricing.input.large;
    }

    if (outputTokens <= tieredPricing.threshold) {
      outputCostUSD = (outputTokens / 1000000) * tieredPricing.output.small;
    } else {
      outputCostUSD = (outputTokens / 1000000) * tieredPricing.output.large;
    }
  } else {
    // Model with flat pricing (like text-embedding-004)
    const flatPricing = pricing as FlatPricing;
    inputCostUSD = (inputTokens / 1000000) * flatPricing.input;
    outputCostUSD = (outputTokens / 1000000) * flatPricing.output;
  }

  // Convert to CAD
  const inputCostCAD = inputCostUSD * exchangeRate;
  const outputCostCAD = outputCostUSD * exchangeRate;
  const totalCostCAD = inputCostCAD + outputCostCAD;

  // Calculate per-token prices in CAD
  const pricePerInputTokenCAD =
    inputTokens > 0 ? inputCostCAD / inputTokens : 0;
  const pricePerOutputTokenCAD =
    outputTokens > 0 ? outputCostCAD / outputTokens : 0;

  return {
    inputTokens,
    outputTokens,
    transcriptionCost: model === "text-embedding-004" ? 0 : totalCostCAD,
    embeddingCost: model === "text-embedding-004" ? totalCostCAD : 0,
    totalCost: totalCostCAD,
    model,
    pricePerInputToken: pricePerInputTokenCAD,
    pricePerOutputToken: pricePerOutputTokenCAD,
    exchangeRate,
  };
}

/**
 * Update cost summary in database
 */
export async function updateCostSummary(
  transcriptionCost: number,
  embeddingCost: number,
  searchCost: number = 0
): Promise<void> {
  try {
    // Get or create cost summary
    let costSummary = await prisma.costSummary.findFirst();

    if (!costSummary) {
      costSummary = await prisma.costSummary.create({
        data: {
          totalTranscriptionCost: transcriptionCost,
          totalEmbeddingCost: embeddingCost,
          totalSearchCost: searchCost,
          grandTotal: transcriptionCost + embeddingCost + searchCost,
          totalRequests: 1,
        },
      });
    } else {
      await prisma.costSummary.update({
        where: { id: costSummary.id },
        data: {
          totalTranscriptionCost:
            costSummary.totalTranscriptionCost + transcriptionCost,
          totalEmbeddingCost: costSummary.totalEmbeddingCost + embeddingCost,
          totalSearchCost: costSummary.totalSearchCost + searchCost,
          grandTotal:
            costSummary.grandTotal +
            transcriptionCost +
            embeddingCost +
            searchCost,
          totalRequests: costSummary.totalRequests + 1,
        },
      });
    }
  } catch (error) {
    console.error("Error updating cost summary:", error);
  }
}

/**
 * Track search cost
 */
export async function trackSearchCost(
  query: string,
  tokens: number,
  model: string,
  exchangeRate: number
): Promise<number> {
  try {
    const costCalc = calculateTokenCost(tokens, 0, model, exchangeRate);

    await prisma.searchCost.create({
      data: {
        query,
        tokens,
        cost: costCalc.totalCost,
        model,
        exchangeRate,
      },
    });

    // Update cost summary
    await updateCostSummary(0, 0, costCalc.totalCost);

    return costCalc.totalCost;
  } catch (error) {
    console.error("Error tracking search cost:", error);
    return 0;
  }
}

/**
 * Get cost summary
 */
export async function getCostSummary() {
  try {
    return await prisma.costSummary.findFirst();
  } catch (error) {
    console.error("Error getting cost summary:", error);
    return null;
  }
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(cost);
}

/**
 * Get recent search costs
 */
export async function getRecentSearchCosts(limit = 10) {
  try {
    return await prisma.searchCost.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch (error) {
    console.error("Error getting recent search costs:", error);
    return [];
  }
}

/**
 * Get available transcription models
 */
export function getAvailableTranscriptionModels() {
  return Object.keys(GEMINI_PRICING).filter(
    (model) => model !== "text-embedding-004"
  );
}

/**
 * Get available embedding models
 */
export function getAvailableEmbeddingModels() {
  return ["text-embedding-004"]; // Only one for now
}

/**
 * Get model display names
 */
export function getModelDisplayName(model: string): string {
  const displayNames: Record<string, string> = {
    "gemini-1.5-flash": "Gemini 1.5 Flash",
    "gemini-1.5-pro": "Gemini 1.5 Pro",
    "gemini-2.0-flash": "Gemini 2.0 Flash (Default)",
    "gemini-2.0-flash-lite": "Gemini 2.0 Flash Lite",
    "gemini-2.5-flash": "Gemini 2.5 Flash",
    "gemini-2.5-pro": "Gemini 2.5 Pro",
    "text-embedding-004": "Text Embedding 004 (Free)",
  };
  return displayNames[model] || model;
}

/**
 * Estimate cost for transcription based on file size
 */
export function estimateTranscriptionCost(
  fileSizeBytes: number,
  transcriptionModel: string,
  embeddingModel: string,
  exchangeRate: number
): {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  transcriptionCost: number;
  embeddingCost: number;
  totalCost: number;
} {
  // Rough estimation: 1 minute of audio ≈ 150 words ≈ 200 tokens
  // File size estimation: 1MB ≈ 1 minute of audio for compressed formats
  const estimatedMinutes = fileSizeBytes / (1024 * 1024); // MB
  const estimatedInputTokens = Math.ceil(estimatedMinutes * 200);
  const estimatedOutputTokens = Math.ceil(estimatedMinutes * 150); // Transcription output

  // Calculate transcription cost
  const transcriptionCostCalc = calculateTokenCost(
    estimatedInputTokens,
    estimatedOutputTokens,
    transcriptionModel,
    exchangeRate
  );

  // Calculate embedding cost (input tokens = transcription output length)
  const embeddingInputTokens = estimatedOutputTokens;
  const embeddingCostCalc = calculateTokenCost(
    embeddingInputTokens,
    0,
    embeddingModel,
    exchangeRate
  );

  return {
    estimatedInputTokens,
    estimatedOutputTokens,
    transcriptionCost: transcriptionCostCalc.totalCost,
    embeddingCost: embeddingCostCalc.totalCost,
    totalCost: transcriptionCostCalc.totalCost + embeddingCostCalc.totalCost,
  };
}

/**
 * Estimate cost for search query
 */
export function estimateSearchCost(
  query: string,
  embeddingModel: string,
  exchangeRate: number
): number {
  const estimatedTokens = Math.ceil(query.length / 4); // Rough estimate
  const costCalc = calculateTokenCost(
    estimatedTokens,
    0,
    embeddingModel,
    exchangeRate
  );
  return costCalc.totalCost;
}
