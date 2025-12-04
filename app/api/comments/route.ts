import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const postId = url.searchParams.get('postId');

    // Validate input
    if (!postId) {
      return Response.json(
        { error: 'Missing postId parameter' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch comments for the post
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles (
          name,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Transform comments to match frontend interface
    const comments = data.map((comment: any) => ({
      id: comment.id,
      userId: comment.user_id,
      userName: comment.profiles?.name || 'Unknown',
      userAvatar: comment.profiles?.avatar_url,
      content: comment.content,
      createdAt: comment.created_at,
    }));

    return Response.json({
      success: true,
      comments,
      count: comments.length,
    });
  } catch (error) {
    return Response.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { postId, commentText, userId } = await req.json();

    // Validate inputs
    if (!postId || !commentText || !userId) {
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

    // Insert comment into database
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: commentText,
      })
      .select(`
        *,
        profiles (
          name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      comment: {
        id: data.id,
        userId: data.user_id,
        userName: data.profiles?.name || 'Unknown',
        userAvatar: data.profiles?.avatar_url,
        content: data.content,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    return Response.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { commentId, userId } = await req.json();

    // Validate inputs
    if (!commentId || !userId) {
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

    // Verify the comment belongs to the user
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (fetchError || !comment) {
      return Response.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    if (comment.user_id !== userId) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete the comment
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      return Response.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    return Response.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { commentId, userId, content } = await req.json();

    // Validate inputs
    if (!commentId || !userId || !content) {
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

    // Verify the comment belongs to the user
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (fetchError || !comment) {
      return Response.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    if (comment.user_id !== userId) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update the comment
    const { data, error: updateError } = await supabase
      .from('comments')
      .update({ content })
      .eq('id', commentId)
      .select(`
        *,
        profiles (
          name,
          avatar_url
        )
      `)
      .single();

    if (updateError) {
      return Response.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      comment: {
        id: data.id,
        userId: data.user_id,
        userName: data.profiles?.name || 'Unknown',
        userAvatar: data.profiles?.avatar_url,
        content: data.content,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    return Response.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}
