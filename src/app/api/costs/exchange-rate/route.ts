import { NextResponse } from "next/server";
import { getExchangeRate } from "@/lib/pricing";

export async function GET() {
  try {
    const exchangeRate = await getExchangeRate();

    return NextResponse.json({
      rate: exchangeRate,
      currency: "CAD",
      base: "USD",
    });
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch exchange rate",
      },
      { status: 500 }
    );
  }
}
