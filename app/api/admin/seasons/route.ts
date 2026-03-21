import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth/adminSession';
import { getErrorMessage } from '@/lib/errors';
import { createSeason, listSeasons } from '@/lib/repositories/seasons';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const seasons = await listSeasons();
    return NextResponse.json({ success: true, data: { seasons } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) } },
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
    const season = await createSeason({
      name: payload.name,
      slug: payload.slug,
      startDate: payload.startDate,
      endDate: payload.endDate ?? null,
      isCurrent: Boolean(payload.isCurrent),
      status: payload.status,
      resetStrategy: payload.resetStrategy,
      notes: payload.notes ?? null,
    });

    return NextResponse.json({ success: true, data: { season } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) } },
      { status: 500 }
    );
  }
}
