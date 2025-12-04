import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { postId, userId } = await req.json();

    // Validate inputs
    if (!postId || !userId) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return Response.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      return Response.json(
        { error: 'Already liked' },
        { status: 400 }
      );
    }

    // Add like
    const { error: likeError } = await supabase
      .from('likes')
      .insert({
        post_id: postId,
        user_id: userId,
      });

    if (likeError) {
      return Response.json(
        { error: likeError.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: 'Post liked successfully',
    });
  } catch (error) {
    return Response.json(
      { error: 'Failed to like post' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { postId, userId } = await req.json();

    // Validate inputs
    if (!postId || !userId) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Remove like
    const { error: deleteError } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (deleteError) {
      return Response.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: 'Post unliked successfully',
    });
  } catch (error) {
    return Response.json(
      { error: 'Failed to unlike post' },
      { status: 500 }
    );
  }
}
