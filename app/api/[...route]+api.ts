import app from '@/backend/hono';

export async function GET(req: Request) {
  return app.fetch(req);
}

export async function POST(req: Request) {
  return app.fetch(req);
}


