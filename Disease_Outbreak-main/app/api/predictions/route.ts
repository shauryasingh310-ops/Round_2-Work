// API route for ML predictions (mock, can be replaced with real logic)
import { NextResponse } from 'next/server';

export async function GET() {
  // Example: return mock predictions
  return NextResponse.json({
    predictions: [
      { region: 'Delhi', disease: 'Cholera', risk: 0.82 },
      { region: 'Maharashtra', disease: 'Dengue', risk: 0.67 },
      { region: 'Uttar Pradesh', disease: 'Typhoid', risk: 0.54 },
    ]
  });
}

export async function POST(req: Request) {
  // Accepts input for real-time prediction (mocked)
  const body = await req.json();
  // You can use OpenAI or ML logic here
  return NextResponse.json({
    result: `Received input: ${JSON.stringify(body)}`
  });
}
