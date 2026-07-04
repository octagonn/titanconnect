import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../create-context";
import { TRPCError } from "@trpc/server";

function mapPost(post: any, currentUserId?: string) {
  const isAnon = post.category === 'anon';
  const votes: { user_id: string; option_index: number }[] = post.post_votes ?? [];

  let pollVotes: number[] | undefined;
  if (post.subtype === 'poll' && Array.isArray(post.poll_options)) {
    pollVotes = post.poll_options.map(() => 0);
    votes.forEach((v) => {
      if (pollVotes![v.option_index] !== undefined) pollVotes![v.option_index]++;
    });
  }

  let wishboneVotes: [number, number] | undefined;
  if (post.subtype === 'wishbone') {
    wishboneVotes = [0, 0];
    votes.forEach((v) => {
      if (v.option_index === 0 || v.option_index === 1) wishboneVotes![v.option_index]++;
    });
  }

  const myVoteIndex = currentUserId
    ? votes.find((v) => v.user_id === currentUserId)?.option_index
    : undefined;

  return {
    id: post.id,
    userId: post.user_id,
    userName: isAnon ? 'Anonymous Titan' : post.profiles?.name || 'Unknown',
    userAvatar: isAnon ? undefined : post.profiles?.avatar_url,
    isOwnPost: currentUserId === post.user_id,
    content: post.content,
    imageUrl: post.image_url,
    imageUrl2: post.image_url_2 ?? undefined,
    title: post.title ?? undefined,
    scheduledAt: post.scheduled_at ?? undefined,
    location: post.location ?? undefined,
    course: post.course ?? undefined,
    price: post.price ?? undefined,
    condition: post.condition ?? undefined,
    subtype: post.subtype ?? undefined,
    pollOptions: post.poll_options ?? undefined,
    pollVotes,
    wishboneVotes,
    myVoteIndex,
    tags: post.tags ?? undefined,
    likes: post.likes ? post.likes.length : 0,
    likedBy: post.likes ? post.likes.map((l: any) => l.user_id) : [],
    comments: post.comments
      ? post.comments
          .map((c: any) => ({
            id: c.id,
            userId: c.user_id,
            userName: c.profiles?.name || 'Unknown',
            userAvatar: c.profiles?.avatar_url,
            content: c.content,
            createdAt: c.created_at,
          }))
          .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      : [],
    createdAt: post.created_at,
    category: post.category,
  };
}

export const postsRouter = createTRPCRouter({
  getInfinite: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
        search: z.string().optional(),
        category: z.enum(['all', 'clubs', 'events', 'study', 'anon', 'market']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, category } = input;

      let query = ctx.supabase
        .from('posts')
        .select(`
          *,
          profiles (
            name,
            avatar_url
          ),
          likes (
            user_id
          ),
          post_votes (
            user_id,
            option_index
          ),
          comments (
            id,
            user_id,
            content,
            created_at,
            profiles (
              name,
              avatar_url
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      query = query.limit(limit + 1);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching posts:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      let nextCursor: typeof cursor | undefined = undefined;
      if (data.length > limit) {
        const nextItem = data.pop();
        nextCursor = nextItem?.created_at;
      }

      const posts = data.map((post: any) => mapPost(post, ctx.user?.id));

      return {
        items: posts,
        nextCursor,
      };
    }),

  getById: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { id } = input;

      const { data, error } = await ctx.supabase
        .from('posts')
        .select(`
          *,
          profiles (
            name,
            avatar_url
          ),
          likes (
            user_id
          ),
          post_votes (
            user_id,
            option_index
          ),
          comments (
            id,
            user_id,
            content,
            created_at,
            profiles (
              name,
              avatar_url
            )
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching post by id:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      if (!data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      return mapPost(data, ctx.user?.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1),
        category: z.enum(['all', 'clubs', 'events', 'study', 'anon', 'market']).default('all'),
        imageUrl: z.string().optional(),
        imageUrl2: z.string().optional(),
        title: z.string().optional(),
        scheduledAt: z.string().optional(),
        location: z.string().optional(),
        course: z.string().optional(),
        price: z.number().optional(),
        condition: z.string().optional(),
        subtype: z.enum(['thought', 'poll', 'wishbone']).optional(),
        pollOptions: z.array(z.string().min(1)).min(2).max(4).optional(),
        tags: z.array(z.string().min(1)).max(6).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        content,
        category,
        imageUrl,
        imageUrl2,
        title,
        scheduledAt,
        location,
        course,
        price,
        condition,
        subtype,
        pollOptions,
        tags,
      } = input;

      const { data, error } = await ctx.supabase
        .from('posts')
        .insert({
          user_id: ctx.user.id,
          content,
          category,
          image_url: imageUrl,
          image_url_2: imageUrl2,
          title,
          scheduled_at: scheduledAt,
          location,
          course,
          price,
          condition,
          subtype,
          poll_options: pollOptions ? pollOptions.map((label, id) => ({ id, label })) : undefined,
          tags,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return data;
    }),

  update: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        content: z.string().min(1),
        imageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId, content, imageUrl } = input;

      const { data: post, error: fetchError } = await ctx.supabase
        .from('posts')
        .select('id, user_id')
        .eq('id', postId)
        .maybeSingle();

      if (fetchError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: fetchError.message,
        });
      }

      if (!post || post.user_id !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only edit your own posts',
        });
      }

      const { data, error } = await ctx.supabase
        .from('posts')
        .update({
          content,
          image_url: imageUrl ?? null,
        })
        .eq('id', postId)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return data;
    }),

  delete: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;

      const { data: post, error: fetchError } = await ctx.supabase
        .from('posts')
        .select('id, user_id')
        .eq('id', postId)
        .maybeSingle();

      if (fetchError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: fetchError.message,
        });
      }

      if (!post || post.user_id !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete your own posts',
        });
      }

      const { error } = await ctx.supabase.from('posts').delete().eq('id', postId);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return { success: true };
    }),

  toggleLike: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;
      const userId = ctx.user.id;

      // Check if already liked
      const { data: existingLike, error: checkError } = await ctx.supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: checkError.message,
        });
      }

      if (existingLike) {
        // Unlike
        const { error: deleteError } = await ctx.supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id);

        if (deleteError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: deleteError.message,
          });
        }
        return { liked: false };
      } else {
        // Like
        const { error: insertError } = await ctx.supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: userId,
          });

        if (insertError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: insertError.message,
          });
        }
        return { liked: true };
      }
    }),

  vote: protectedProcedure
    .input(z.object({ postId: z.string(), optionIndex: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const { postId, optionIndex } = input;

      const { error } = await ctx.supabase
        .from('post_votes')
        .upsert(
          { post_id: postId, user_id: ctx.user.id, option_index: optionIndex },
          { onConflict: 'post_id,user_id' }
        );

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return { optionIndex };
    }),

  addComment: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId, content } = input;

      const { data, error } = await ctx.supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: ctx.user.id,
          content,
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
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return {
        id: data.id,
        userId: data.user_id,
        userName: data.profiles?.name || 'Unknown',
        userAvatar: data.profiles?.avatar_url,
        content: data.content,
        createdAt: data.created_at,
      };
    }),

  updateComment: protectedProcedure
    .input(
      z.object({
        commentId: z.string(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { commentId, content } = input;

      const { data: comment, error: fetchError } = await ctx.supabase
        .from('comments')
        .select('id, user_id')
        .eq('id', commentId)
        .maybeSingle();

      if (fetchError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: fetchError.message,
        });
      }

      if (!comment || comment.user_id !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only edit your own comments',
        });
      }

      const { data: updated, error } = await ctx.supabase
        .from('comments')
        .update({ content })
        .eq('id', commentId)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return updated;
    }),

  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { commentId } = input;

      const { data: comment, error: fetchError } = await ctx.supabase
        .from('comments')
        .select('id, user_id')
        .eq('id', commentId)
        .maybeSingle();

      if (fetchError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: fetchError.message,
        });
      }

      if (!comment || comment.user_id !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete your own comments',
        });
      }

      const { error } = await ctx.supabase.from('comments').delete().eq('id', commentId);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return { success: true };
    }),
});


