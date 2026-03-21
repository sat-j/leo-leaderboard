import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth/adminSession';
import { getErrorMessage } from '@/lib/errors';
import { listSeasonAssignments, updateSeasonAssignment } from '@/lib/repositories/seasons';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { seasonId } = await params;
    const assignments = await listSeasonAssignments(seasonId);
    return NextResponse.json({ success: true, data: { assignments } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await params;
    const payload = await request.json();
    await updateSeasonAssignment(payload.assignmentId, {
      level: payload.level,
      seedMu: payload.seedMu,
      seedSigma: payload.seedSigma,
      isActive: payload.isActive,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: getErrorMessage(error) } },
      { status: 500 }
    );
  }
}
