import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Intentionally throw an error
    throw new Error('Test error from Next.js API route');
  } catch (error) {
    // Capture the error in Sentry
    Sentry.captureException(error);
    
    // Return error response
    return NextResponse.json(
      { message: 'Next.js API error sent to Sentry! Check your dashboard.' },
      { status: 500 }
    );
  }
}
