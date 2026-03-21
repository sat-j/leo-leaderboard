import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errors';
import { getOverallStats } from '@/lib/repositories/playerStats';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season') ?? undefined;
    const data = await getOverallStats(season);
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message,
        },
      },
      { status: 500 }
    );
  }
}
