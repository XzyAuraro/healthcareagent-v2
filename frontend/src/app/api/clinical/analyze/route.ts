import { NextRequest, NextResponse } from 'next/server';
import * as http from 'http';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.text();

  return new Promise<NextResponse>((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 8000,
        path: '/api/clinical/analyze',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString();
          try {
            resolve(NextResponse.json(JSON.parse(text), { status: res.statusCode ?? 200 }));
          } catch {
            resolve(new NextResponse(text, { status: res.statusCode ?? 500 }));
          }
        });
      }
    );

    req.on('error', (e) => {
      console.error('[clinical/analyze proxy] error:', e.message, e);
      resolve(NextResponse.json({ error: e.message }, { status: 502 }));
    });

    req.setTimeout(180_000, () => {
      req.destroy();
      resolve(NextResponse.json({ error: 'backend timeout' }, { status: 504 }));
    });

    req.write(body);
    req.end();
  });
}
