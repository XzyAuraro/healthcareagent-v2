import { NextRequest } from 'next/server';

import { proxyToBackend } from '@/lib/backendProxy';

export const dynamic = 'force-dynamic';

type RouteParams = {
  path?: string[];
};

function proxyRequest(
  method: 'GET' | 'POST' | 'PUT',
  request: NextRequest,
  params: RouteParams,
  body?: string
) {
  const suffix = params.path?.length ? `/${params.path.map(encodeURIComponent).join('/')}` : '';
  const query = request.nextUrl.search || '';
  return proxyToBackend({
    request,
    backendPath: `/api/clinical/cases${suffix}${query}`,
    method,
    body,
    timeoutMs: 30_000,
  });
}

export async function GET(request: NextRequest, { params }: { params: RouteParams }) {
  return proxyRequest('GET', request, params);
}

export async function POST(request: NextRequest, { params }: { params: RouteParams }) {
  const body = await request.text();
  return proxyRequest('POST', request, params, body);
}

export async function PUT(request: NextRequest, { params }: { params: RouteParams }) {
  const body = await request.text();
  return proxyRequest('PUT', request, params, body);
}
