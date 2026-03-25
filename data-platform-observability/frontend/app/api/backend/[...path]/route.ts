import { NextRequest } from "next/server";

const BACKEND = "http://127.0.0.1:8004";

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = new URL(`${BACKEND}/api/${path}`);
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method: req.method,
    headers: { "Content-Type": "application/json" },
    body: req.method !== "GET" ? await req.text() : undefined,
    signal: AbortSignal.timeout(60_000),
  });

  const data = await res.text();
  return new Response(data, { status: res.status, headers: { "Content-Type": "application/json" } });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
