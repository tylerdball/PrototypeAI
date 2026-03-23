import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const BACKEND = "http://127.0.0.1:8002";

async function proxy(req: NextRequest, params: { path: string[] }) {
  const { path } = await params;
  const url = `${BACKEND}/${path.join("/")}${req.nextUrl.search}`;
  const headers = new Headers(req.headers);
  headers.delete("host");
  const init: RequestInit = {
    method: req.method,
    headers,
    // @ts-expect-error node fetch
    signal: AbortSignal.timeout(55_000),
  };
  if (req.method !== "GET" && req.method !== "HEAD") init.body = await req.text();
  const res = await fetch(url, init);
  return new NextResponse(res.body, { status: res.status, headers: res.headers });
}

export const GET = (req: NextRequest, { params }: { params: { path: string[] } }) => proxy(req, params);
export const POST = (req: NextRequest, { params }: { params: { path: string[] } }) => proxy(req, params);
