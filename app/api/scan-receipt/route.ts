import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ScanResult, ScannedTransaction } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EXPENSE_CATEGORIES = [
  "Housing", "Transport", "Food", "Utilities", "Insurance",
  "Healthcare", "Saving", "Personal", "Entertainment", "Credit", "Miscellaneous"
];

const INCOME_CATEGORIES = ["Salary", "Bonus", "Investment", "Deposit", "Other"];

const SYSTEM_PROMPT = `You are a financial document analyzer. Your job is to extract transaction information from receipts, invoices, bank statements, payslips, or any financial document.

RULES:
1. For a single receipt with multiple items: Create ONE transaction with the TOTAL amount and merchant/store name as description
2. For multiple separate receipts in one image: Create MULTIPLE transactions, one per receipt
3. For bank statements: Create MULTIPLE transactions, one per entry
4. For invoices: Create ONE transaction with the total
5. For payslips/income documents: Set type to "income"

CATEGORIES:
- Expense categories: ${EXPENSE_CATEGORIES.join(', ')}
- Income categories: ${INCOME_CATEGORIES.join(', ')}

Choose the most appropriate category. If unsure, use "Miscellaneous" for expenses or "Other" for income.

CURRENCY:
- Default to CAD unless you clearly see USD, US$, or US Dollar
- Look for currency symbols: $ alone = CAD, US$ or USD = USD

DATE:
- Use the transaction/purchase date, not the print date
- Format: YYYY-MM-DD
- If no date visible, use today: ${new Date().toISOString().split('T')[0]}

CONFIDENCE:
- high: Clear image, all fields readable
- medium: Some fields unclear but main info (amount, merchant) visible
- low: Significant parts unclear, guessing required

Respond ONLY with valid JSON in this exact format:
{
  "transactions": [
    {
      "amount": <number>,
      "description": "<merchant/source name>",
      "category": "<from allowed categories>",
      "date": "<YYYY-MM-DD>",
      "type": "<income|expense>",
      "currency": "<CAD|USD>"
    }
  ],
  "summary": "<brief summary like '3 items from Costco totaling $142.50' or null>",
  "confidence": "<high|medium|low>"
}`;

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No image provided', transactions: [], summary: null, confidence: 'low' } as ScanResult,
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured', transactions: [], summary: null, confidence: 'low' } as ScanResult,
        { status: 500 }
      );
    }

    // Handle both data URL and raw base64
    const base64Image = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
              text: 'Analyze this financial document and extract transaction details. Return JSON only.',
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
        { success: false, error: 'No response from AI', transactions: [], summary: null, confidence: 'low' } as ScanResult,
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
        { success: false, error: 'Failed to parse AI response', transactions: [], summary: null, confidence: 'low' } as ScanResult,
        { status: 500 }
      );
    }

    // Validate and sanitize transactions
    const transactions: ScannedTransaction[] = (parsed.transactions || []).map((t: Record<string, unknown>) => ({
      amount: typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount)) || 0,
      description: String(t.description || 'Unknown'),
      category: validateCategory(String(t.category || ''), String(t.type || 'expense')),
      date: validateDate(String(t.date || '')),
      type: t.type === 'income' ? 'income' : 'expense',
      currency: t.currency === 'USD' ? 'USD' : 'CAD',
    }));

    // Filter out transactions with 0 amount
    const validTransactions = transactions.filter(t => t.amount > 0);

    if (validTransactions.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Could not extract any valid transactions. Please ensure the image shows a receipt or financial document clearly.', 
          transactions: [], 
          summary: null, 
          confidence: 'low' 
        } as ScanResult,
        { status: 200 }
      );
    }

    const result: ScanResult = {
      success: true,
      transactions: validTransactions,
      summary: parsed.summary || null,
      confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium',
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Scan receipt error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred', 
        transactions: [], 
        summary: null, 
        confidence: 'low' 
      } as ScanResult,
      { status: 500 }
    );
  }
}

function validateCategory(category: string, type: string): string {
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (categories.includes(category)) {
    return category;
  }
  // Try case-insensitive match
  const match = categories.find(c => c.toLowerCase() === category.toLowerCase());
  if (match) {
    return match;
  }
  return type === 'income' ? 'Other' : 'Miscellaneous';
}

function validateDate(date: string): string {
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  return parsed.toISOString().split('T')[0];
}

