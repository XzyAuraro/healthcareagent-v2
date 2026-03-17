import * as http from 'http';
import { NextRequest, NextResponse } from 'next/server';

type ProxyMethod = 'GET' | 'POST' | 'PUT';

type BackendProxyOptions = {
  request: NextRequest;
  backendPath: string;
  method: ProxyMethod;
  body?: string;
  timeoutMs?: number;
  agent?: false | http.Agent;
  closeConnection?: boolean;
};

function buildProxyHeaders(
  request: NextRequest,
  body?: string,
  closeConnection = false
): Record<string, string> | undefined {
  const headers: Record<string, string> = {};
  const authorization = request.headers.get('authorization');
  const token = request.cookies.get('token')?.value;

  if (authorization) {
    headers.Authorization = authorization;
  } else if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(body).toString();
  }

  if (closeConnection) {
    headers.Connection = 'close';
  }

  return Object.keys(headers).length ? headers : undefined;
}

export function proxyToBackend({
  request,
  backendPath,
  method,
  body,
  timeoutMs = 10_000,
  agent,
  closeConnection = false,
}: BackendProxyOptions): Promise<NextResponse> {
  return new Promise<NextResponse>((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 8000,
        path: backendPath,
        method,
        agent,
        headers: buildProxyHeaders(request, body, closeConnection),
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

    req.on('error', (error) => {
      resolve(NextResponse.json({ error: error.message }, { status: 502 }));
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(NextResponse.json({ error: 'timeout' }, { status: 504 }));
    });

    if (body !== undefined) {
      req.write(body);
    }
    req.end();
  });
}
