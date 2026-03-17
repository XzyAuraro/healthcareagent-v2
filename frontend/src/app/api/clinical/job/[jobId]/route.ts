import { NextRequest } from 'next/server';

import { proxyToBackend } from '@/lib/backendProxy';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  return proxyToBackend({
    request,
    backendPath: `/api/clinical/job/${encodeURIComponent(jobId)}`,
    method: 'GET',
  });
}
