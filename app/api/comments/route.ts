import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { postId, commentText, userId } = await req.json();

 
  console.log(`New comment on post ${postId} by ${userId}: ${commentText}`);

  return NextResponse.json({ success: true });
}
