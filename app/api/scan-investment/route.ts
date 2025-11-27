import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ScanInvestmentResult, ScannedInvestment } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSET_TYPES = ['stock', 'crypto'];
const ACCOUNT_LABELS = ['Margin', 'TFSA', 'RRSP', 'FHSA', 'Cash', 'Crypto'];

// Helper to get local date in YYYY-MM-DD format (not UTC)
function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const SYSTEM_PROMPT = `You are a financial document analyzer specialized in investment documents. Your job is to extract investment information from brokerage statements, trade confirmations, purchase receipts, or any investment-related document.

RULES:
1. For a single trade confirmation: Extract ONE investment entry
2. For brokerage statements with multiple positions: Extract MULTIPLE investments, one per position
3. For purchase receipts (e.g., crypto exchange): Extract ONE investment entry
4. Look for: symbol/ticker, quantity/shares, price per share/unit, account type, purchase date

ASSET TYPES:
- stock: For stocks, ETFs, mutual funds (e.g., AAPL, TSLA, SPY, VTI)
- crypto: For cryptocurrencies (e.g., BTC, ETH, USDC)

ACCOUNT LABELS:
- Margin: Standard brokerage account
- TFSA: Tax-Free Savings Account (Canadian)
- RRSP: Registered Retirement Savings Plan (Canadian)
- FHSA: First Home Savings Account (Canadian)
- Cash: Cash account
- Crypto: Cryptocurrency exchange/wallet

If account type is unclear, default to "Margin" for stocks and "Crypto" for cryptocurrencies.

SYMBOL EXTRACTION:
- Extract the ticker symbol (e.g., AAPL, TSLA, BTC, ETH)
- Convert to uppercase
- For crypto, use standard symbols (BTC, ETH, USDC, etc.)
- If symbol is not clearly visible, try to infer from company name or description

QUANTITY:
- Extract the number of shares/units purchased
- This is the quantity field

AVG_COST (Price per share/unit):
- Extract the price per share or unit
- This is the purchase price, not the total amount
- If only total amount is shown, divide by quantity to get avg_cost

DATE - CRITICAL RULES:
- ONLY extract a date if you can ABSOLUTELY CONFIRM it is clearly visible and readable on the document
- The date must be explicitly shown (e.g., "2025-11-27", "Nov 27, 2025", "27/11/2025", etc.)
- DO NOT guess or infer dates
- DO NOT use dates that are unclear, partially visible, or ambiguous
- If the date is not 100% certain and completely readable, DO NOT include a date field - the system will use today's date programmatically
- Format when included: YYYY-MM-DD
- Today's date (for reference only, do not use unless absolutely certain): ${getLocalDateString()}

CONFIDENCE:
- high: Clear image, all fields readable (symbol, quantity, price, date)
- medium: Some fields unclear but main info (symbol, quantity, price) visible
- low: Significant parts unclear, guessing required

Respond ONLY with valid JSON in this exact format:
{
  "investments": [
    {
      "symbol": "<ticker symbol in uppercase>",
      "quantity": <number>,
      "avg_cost": <number (price per share/unit)>,
      "asset_type": "<stock|crypto>",
      "account_label": "<Margin|TFSA|RRSP|FHSA|Cash|Crypto>",
      "date": "<YYYY-MM-DD>"
    }
  ],
  "summary": "<brief summary like 'Purchased 10 shares of AAPL at $150.00' or null>",
  "confidence": "<high|medium|low>"
}`;

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No image provided', investments: [], summary: null, confidence: 'low' } as ScanInvestmentResult,
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured', investments: [], summary: null, confidence: 'low' } as ScanInvestmentResult,
        { status: 500 }
      );
    }

    // Handle both data URL and raw base64
    const base64Image = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;

    const response = await openai.chat.completions.create({
    //   model: 'gpt-4o-mini',
    model: 'gpt-4.1',
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this investment document and extract investment details. Return JSON only.',
            },
            {
              type: 'image_url',
              image_url: {
                url: base64Image,
                detail: 'high',
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      return NextResponse.json(
        { success: false, error: 'No response from AI', investments: [], summary: null, confidence: 'low' } as ScanInvestmentResult,
        { status: 500 }
      );
    }

    // Parse JSON from response (handle potential markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response', investments: [], summary: null, confidence: 'low' } as ScanInvestmentResult,
        { status: 500 }
      );
    }

    // Get current date for default (local time, not UTC)
    const currentDate = getLocalDateString();

    // Validate and sanitize investments
    const investments: ScannedInvestment[] = (parsed.investments || []).map((inv: Record<string, unknown>) => ({
      symbol: String(inv.symbol || '').toUpperCase().trim(),
      quantity: typeof inv.quantity === 'number' ? inv.quantity : parseFloat(String(inv.quantity)) || 0,
      avg_cost: typeof inv.avg_cost === 'number' ? inv.avg_cost : parseFloat(String(inv.avg_cost)) || 0,
      asset_type: validateAssetType(String(inv.asset_type || '')),
      account_label: validateAccountLabel(String(inv.account_label || ''), String(inv.asset_type || '')),
      date: validateDate(String(inv.date || ''), currentDate),
    }));

    // Filter out investments with invalid data
    const validInvestments = investments.filter(inv => 
      inv.symbol.length > 0 && 
      inv.quantity > 0 && 
      inv.avg_cost > 0
    );

    if (validInvestments.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Could not extract any valid investments. Please ensure the image shows a brokerage statement, trade confirmation, or investment document clearly.', 
          investments: [], 
          summary: null, 
          confidence: 'low' 
        } as ScanInvestmentResult,
        { status: 200 }
      );
    }

    const result: ScanInvestmentResult = {
      success: true,
      investments: validInvestments,
      summary: parsed.summary || null,
      confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium',
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Scan investment error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred', 
        investments: [], 
        summary: null, 
        confidence: 'low' 
      } as ScanInvestmentResult,
      { status: 500 }
    );
  }
}

function validateAssetType(assetType: string): string {
  const normalized = assetType.toLowerCase().trim();
  if (ASSET_TYPES.includes(normalized)) {
    return normalized;
  }
  // Try to infer from common keywords
  if (normalized.includes('crypto') || normalized.includes('bitcoin') || normalized.includes('ethereum')) {
    return 'crypto';
  }
  return 'stock'; // Default to stock
}

function validateAccountLabel(accountLabel: string, assetType: string): string {
  const normalized = accountLabel.trim();
  if (ACCOUNT_LABELS.includes(normalized)) {
    return normalized;
  }
  // Try case-insensitive match
  const match = ACCOUNT_LABELS.find(label => label.toLowerCase() === normalized.toLowerCase());
  if (match) {
    return match;
  }
  // Default based on asset type
  return assetType.toLowerCase() === 'crypto' ? 'Crypto' : 'Margin';
}

function validateDate(date: string, defaultDate: string): string {
  // If date is empty, null, or just whitespace, use default
  if (!date || !date.trim()) {
    return defaultDate;
  }

  // Try to parse the date
  const parsed = new Date(date);
  
  // If invalid date, use default
  if (isNaN(parsed.getTime())) {
    return defaultDate;
  }

  // Validate the parsed date is reasonable (not too far in past/future)
  const today = new Date();
  const yearDiff = Math.abs(today.getFullYear() - parsed.getFullYear());
  
  // If date is more than 10 years in the past or future, likely invalid - use default
  if (yearDiff > 10) {
    return defaultDate;
  }

  // Return date in local format (YYYY-MM-DD), not UTC
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

