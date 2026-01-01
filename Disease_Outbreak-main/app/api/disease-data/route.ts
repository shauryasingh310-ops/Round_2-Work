// API route for disease data (mock, can be replaced with real logic)
import { NextResponse } from 'next/server';

export async function GET() {
  // Example: return mock disease data
  return NextResponse.json({
    data: [
      { state: 'Delhi', cases: 120, deaths: 2 },
      { state: 'Maharashtra', cases: 340, deaths: 8 },
      { state: 'Uttar Pradesh', cases: 210, deaths: 4 },
    ]
  });
}
