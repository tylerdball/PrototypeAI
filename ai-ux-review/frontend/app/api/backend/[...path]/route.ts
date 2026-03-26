export const maxDuration = 300

const BACKEND = 'http://127.0.0.1:8007'

async function handler(req: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/')
  const url = new URL(req.url)
  const target = `${BACKEND}/${path}${url.search}`

  const headers = new Headers(req.headers)
  headers.delete('host')

  const res = await fetch(target, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    signal: AbortSignal.timeout(280_000),
    // @ts-expect-error Next.js streaming
    duplex: 'half',
  })

  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  })
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler
