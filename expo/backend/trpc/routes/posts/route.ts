import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../create-context";
import { TRPCError } from "@trpc/server";

function mapPost(post: any, currentUserId?: string, taggedEventTitles?: Map<string, string>) {
  const isAnon = post.category === 'anon';
  const votes: { user_id: string; option_index: number }[] = post.post_votes ?? [];
  const joinRequests: { requester_id: string; status: string }[] = post.study_join_requests ?? [];
  const myJoinRequest = currentUserId
    ? joinRequests.find((r) => r.requester_id === currentUserId)
    : undefined;

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
    dealtWithUserId: post.dealt_with_user_id ?? undefined,
    dealtWithUserName: post.dealt_with_profile?.name ?? undefined,
    joinPolicy: (post.join_policy ?? 'open') as 'open' | 'approval',
    joinRequestStatus: myJoinRequest?.status as 'pending' | 'approved' | 'declined' | undefined,
    mediaType: (post.media_type ?? 'image') as 'image' | 'video',
    taggedUsers: (post.post_tagged_users ?? []).map((t: any) => ({
      id: t.user_id,
      name: t.profiles?.name || 'Unknown',
      avatar: t.profiles?.avatar_url,
    })),
    taggedEventId: post.tagged_event_id ?? undefined,
    taggedEventTitle: post.tagged_event_id ? taggedEventTitles?.get(post.tagged_event_id) : undefined,
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

// PostgREST doesn't reliably embed a self-referencing FK (posts.tagged_event_id
// -> posts.id) via the `!fkey` hint, so tagged-event titles are resolved with
// a plain follow-up lookup instead of trying to embed them in the main select.
async function fetchTaggedEventTitles(supabase: any, posts: any[]): Promise<Map<string, string>> {
  const eventIds = Array.from(
    new Set(posts.map((p) => p.tagged_event_id).filter((id): id is string => !!id))
  );
  if (eventIds.length === 0) return new Map();

  const { data, error } = await supabase.from('posts').select('id, title').in('id', eventIds);
  if (error || !data) return new Map();

  return new Map(data.map((row: any) => [row.id, row.title as string]));
}

export const postsRouter = createTRPCRouter({
  getInfinite: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
        search: z.string().optional(),
        category: z.enum(['all', 'clubs', 'events', 'study', 'anon', 'market']).optional(),
        userId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, category, userId } = input;

      let query = ctx.supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            name,
            avatar_url
          ),
          dealt_with_profile:profiles!posts_dealt_with_user_id_fkey (
            name
          ),
          likes (
            user_id
          ),
          study_join_requests (
            requester_id,
            status
          ),
          post_tagged_users (
            user_id,
            profiles (
              name,
              avatar_url
            )
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

      if (userId) {
        // Anonymous posts hide their author everywhere else in the app —
        // don't let a profile's post list deanonymize them.
        query = query.eq('user_id', userId).neq('category', 'anon');
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

      const taggedEventTitles = await fetchTaggedEventTitles(ctx.supabase, data);
      const posts = data.map((post: any) => mapPost(post, ctx.user?.id, taggedEventTitles));

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
          profiles!posts_user_id_fkey (
            name,
            avatar_url
          ),
          dealt_with_profile:profiles!posts_dealt_with_user_id_fkey (
            name
          ),
          likes (
            user_id
          ),
          study_join_requests (
            requester_id,
            status
          ),
          post_tagged_users (
            user_id,
            profiles (
              name,
              avatar_url
            )
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

      const taggedEventTitles = await fetchTaggedEventTitles(ctx.supabase, [data]);
      return mapPost(data, ctx.user?.id, taggedEventTitles);
    }),

  getJoined: protectedProcedure.query(async ({ ctx }) => {
    const { data: likedRows, error: likesError } = await ctx.supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', ctx.user.id);

    if (likesError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: likesError.message });
    }

    const postIds = (likedRows ?? []).map((row) => row.post_id);
    if (postIds.length === 0) {
      return [];
    }

    const { data, error } = await ctx.supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey (
          name,
          avatar_url
        ),
        dealt_with_profile:profiles!posts_dealt_with_user_id_fkey (
          name
        ),
        likes (
          user_id
        ),
        study_join_requests (
          requester_id,
          status
        ),
        post_tagged_users (
          user_id,
          profiles (
            name,
            avatar_url
          )
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
      .in('id', postIds)
      .in('category', ['events', 'study', 'market'])
      .order('scheduled_at', { ascending: true, nullsFirst: false });

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }

    const taggedEventTitles = await fetchTaggedEventTitles(ctx.supabase, data);
    return data.map((post: any) => mapPost(post, ctx.user.id, taggedEventTitles));
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
        joinPolicy: z.enum(['open', 'approval']).optional(),
        mediaType: z.enum(['image', 'video']).optional(),
        taggedUserIds: z.array(z.string().uuid()).max(10).optional(),
        taggedEventId: z.string().uuid().optional(),
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
        joinPolicy,
        mediaType,
        taggedUserIds,
        taggedEventId,
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
          join_policy: category === 'study' ? (joinPolicy ?? 'open') : 'open',
          media_type: mediaType ?? 'image',
          tagged_event_id: category === 'all' ? taggedEventId : undefined,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      if (category === 'all' && taggedUserIds?.length) {
        const { error: tagError } = await ctx.supabase
          .from('post_tagged_users')
          .insert(taggedUserIds.map((userId) => ({ post_id: data.id, user_id: userId })));

        if (tagError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: tagError.message });
        }
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

      if (!existingLike) {
        const { data: post, error: postError } = await ctx.supabase
          .from('posts')
          .select('category, join_policy, user_id')
          .eq('id', postId)
          .maybeSingle();

        if (postError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: postError.message });
        }
        if (post?.category === 'study' && post.join_policy === 'approval' && post.user_id !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This study group requires host approval — send a join request instead.',
          });
        }
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

  getInquirers: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { postId } = input;

      const { data: post, error: postError } = await ctx.supabase
        .from('posts')
        .select('id, user_id')
        .eq('id', postId)
        .maybeSingle();

      if (postError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: postError.message });
      }
      if (!post || post.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the seller can view inquirers' });
      }

      const { data, error } = await ctx.supabase
        .from('listing_inquiries')
        .select(`
          buyer_id,
          profiles (
            name,
            avatar_url
          )
        `)
        .eq('post_id', postId);

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return (data ?? []).map((row: any) => ({
        userId: row.buyer_id,
        userName: row.profiles?.name || 'Unknown',
        userAvatar: row.profiles?.avatar_url,
      }));
    }),

  markDealtWith: protectedProcedure
    .input(z.object({ postId: z.string(), dealtWithUserId: z.string().uuid().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const { postId, dealtWithUserId } = input;

      const { data: post, error: postError } = await ctx.supabase
        .from('posts')
        .select('id, user_id')
        .eq('id', postId)
        .maybeSingle();

      if (postError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: postError.message });
      }
      if (!post || post.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the seller can mark this listing' });
      }

      if (dealtWithUserId) {
        const { data: inquiry, error: inquiryError } = await ctx.supabase
          .from('listing_inquiries')
          .select('id')
          .eq('post_id', postId)
          .eq('buyer_id', dealtWithUserId)
          .maybeSingle();

        if (inquiryError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: inquiryError.message });
        }
        if (!inquiry) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'That user has not messaged you about this listing',
          });
        }
      }

      const { data, error } = await ctx.supabase
        .from('posts')
        .update({ dealt_with_user_id: dealtWithUserId })
        .eq('id', postId)
        .select()
        .single();

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return data;
    }),

  getJoinRequests: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { postId } = input;

      const { data: post, error: postError } = await ctx.supabase
        .from('posts')
        .select('id, user_id')
        .eq('id', postId)
        .maybeSingle();

      if (postError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: postError.message });
      }
      if (!post || post.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the host can view join requests' });
      }

      const { data, error } = await ctx.supabase
        .from('study_join_requests')
        .select(`
          requester_id,
          status,
          profiles!study_join_requests_requester_id_fkey (
            name,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .eq('status', 'pending');

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return (data ?? []).map((row: any) => ({
        userId: row.requester_id,
        userName: row.profiles?.name || 'Unknown',
        userAvatar: row.profiles?.avatar_url,
      }));
    }),

  requestToJoin: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;

      const { data: post, error: postError } = await ctx.supabase
        .from('posts')
        .select('id, user_id, category, join_policy')
        .eq('id', postId)
        .maybeSingle();

      if (postError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: postError.message });
      }
      if (!post) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
      }
      if (post.category !== 'study' || post.join_policy !== 'approval') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This group does not require a join request' });
      }
      if (post.user_id === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You already host this group' });
      }

      const { error } = await ctx.supabase
        .from('study_join_requests')
        .upsert(
          { post_id: postId, requester_id: ctx.user.id, status: 'pending' },
          { onConflict: 'post_id,requester_id' }
        );

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return { status: 'pending' as const };
    }),

  respondToJoinRequest: protectedProcedure
    .input(z.object({ postId: z.string(), requesterId: z.string().uuid(), action: z.enum(['approve', 'decline']) }))
    .mutation(async ({ ctx, input }) => {
      const { postId, requesterId, action } = input;

      const { data: post, error: postError } = await ctx.supabase
        .from('posts')
        .select('id, user_id')
        .eq('id', postId)
        .maybeSingle();

      if (postError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: postError.message });
      }
      if (!post || post.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the host can respond to join requests' });
      }

      const { error: updateError } = await ctx.supabase
        .from('study_join_requests')
        .update({ status: action === 'approve' ? 'approved' : 'declined' })
        .eq('post_id', postId)
        .eq('requester_id', requesterId);

      if (updateError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message });
      }

      if (action === 'approve') {
        const { error: likeError } = await ctx.supabase.rpc('approve_study_join', {
          p_post_id: postId,
          p_requester_id: requesterId,
        });

        if (likeError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: likeError.message });
        }
      }

      return { status: action === 'approve' ? 'approved' : 'declined' as const };
    }),
});


