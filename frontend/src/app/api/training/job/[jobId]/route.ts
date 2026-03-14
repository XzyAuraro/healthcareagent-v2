import { NextRequest, NextResponse } from 'next/server';
import * as http from 'http';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  return new Promise<NextResponse>((resolve) => {
    const req = http.request(
      { hostname: '127.0.0.1', port: 8000, path: `/api/training/job/${encodeURIComponent(jobId)}`, method: 'GET' },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString();
          try { resolve(NextResponse.json(JSON.parse(text), { status: res.statusCode ?? 200 })); }
          catch { resolve(new NextResponse(text, { status: res.statusCode ?? 500 })); }
        });
      }
    );
    req.on('error', (e) => resolve(NextResponse.json({ error: e.message }, { status: 502 })));
    req.setTimeout(10_000, () => { req.destroy(); resolve(NextResponse.json({ error: 'timeout' }, { status: 504 })); });
    req.end();
  });
}
