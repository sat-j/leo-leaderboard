import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth/adminSession';
import { getErrorMessage } from '@/lib/errors';
import { updateSeason } from '@/lib/repositories/seasons';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { seasonId } = await params;
    const payload = await request.json();
    const season = await updateSeason(seasonId, {
      name: payload.name,
      startDate: payload.startDate,
      endDate: payload.endDate,
      isCurrent: payload.isCurrent,
      status: payload.status,
      notes: payload.notes,
    });

    return NextResponse.json({ success: true, data: { season } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) } },
      { status: 500 }
    );
  }
}
