import { NextResponse } from 'next/server';

/**
 * Health check endpoint for deployment verification
 * Used by smoke tests and monitoring systems to verify the application is running
 */
export async function GET() {
  return NextResponse.json(
    { status: 'ok' },
    { status: 200 }
  );
}
