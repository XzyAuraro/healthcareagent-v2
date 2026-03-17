import { NextRequest } from 'next/server';

import { proxyToBackend } from '@/lib/backendProxy';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend({
    request,
    backendPath: '/api/clinical/analyze',
    method: 'POST',
    body,
    timeoutMs: 180_000,
  });
}
