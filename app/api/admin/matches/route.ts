import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth/adminSession';
import { getErrorMessage } from '@/lib/errors';
import { createMatch, listAdminMatches } from '@/lib/repositories/matches';
import { validateMatchInput } from '@/lib/validation/matches';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    const offsetParam = parseInt(searchParams.get('offset') || '0', 10);
    const limit = Number.isNaN(limitParam) ? 20 : Math.min(Math.max(limitParam, 1), 100);
    const offset = Number.isNaN(offsetParam) ? 0 : Math.max(offsetParam, 0);
    const search = searchParams.get('search')?.trim() || undefined;
    const status = searchParams.get('status')?.trim() || undefined;

    const result = await listAdminMatches({ limit, offset, search, status });

    return NextResponse.json({
      success: true,
      data: {
        matches: result.matches,
        total: result.total,
        limit,
        offset,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: getErrorMessage(error),
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const issues = validateMatchInput(payload);

    if (issues.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: issues,
        },
        { status: 400 }
      );
    }

    const result = await createMatch(payload);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: getErrorMessage(error),
        },
      },
      { status: 500 }
    );
  }
}
