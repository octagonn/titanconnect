import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../create-context";
import { TRPCError } from "@trpc/server";

export const postsRouter = createTRPCRouter({
  getInfinite: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
        category: z.enum(['all', 'clubs', 'events', 'study']).optional(),
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

      if (category && category !== 'all') {
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

      const posts = data.map((post: any) => ({
        id: post.id,
        userId: post.user_id,
        userName: post.profiles?.name || 'Unknown',
        userAvatar: post.profiles?.avatar_url,
        content: post.content,
        imageUrl: post.image_url,
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
      }));

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

      const post = {
        id: data.id,
        userId: data.user_id,
        userName: data.profiles?.name || 'Unknown',
        userAvatar: data.profiles?.avatar_url,
        content: data.content,
        imageUrl: data.image_url,
        likes: data.likes ? data.likes.length : 0,
        likedBy: data.likes ? data.likes.map((l: any) => l.user_id) : [],
        comments: data.comments
          ? data.comments
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
        createdAt: data.created_at,
        category: data.category,
      };

      return post;
    }),

  create: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1),
        category: z.enum(['all', 'clubs', 'events', 'study']).default('all'),
        imageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { content, category, imageUrl } = input;

      const { data, error } = await ctx.supabase
        .from('posts')
        .insert({
          user_id: ctx.user.id,
          content,
          category,
          image_url: imageUrl,
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
});


