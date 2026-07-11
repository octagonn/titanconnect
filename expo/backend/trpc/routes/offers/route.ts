import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../create-context";
import { TRPCError } from "@trpc/server";
import { findOrCreateConversation } from "../../lib/conversations";

const postSelect = "id, user_id, title, content, price, condition, image_url, media_type, listing_status, payment_methods, dealt_with_user_id, category";

function mapOfferPost(post: any) {
  return {
    id: post.id,
    userId: post.user_id,
    title: post.title ?? undefined,
    content: post.content,
    price: post.price ?? undefined,
    condition: post.condition ?? undefined,
    imageUrl: post.image_url ?? undefined,
    mediaType: (post.media_type ?? "image") as "image" | "video",
    listingStatus: (post.listing_status ?? "available") as "available" | "pending" | "sold",
    paymentMethods: post.payment_methods ?? undefined,
    dealtWithUserId: post.dealt_with_user_id ?? undefined,
  };
}

function mapOffer(offer: any) {
  return {
    id: offer.id,
    postId: offer.post_id,
    buyerId: offer.buyer_id,
    buyerName: offer.profiles?.name,
    buyerAvatar: offer.profiles?.avatar_url,
    amount: offer.amount,
    status: offer.status as "pending" | "accepted" | "declined" | "withdrawn" | "cancelled",
    createdAt: offer.created_at,
    updatedAt: offer.updated_at,
  };
}

const STATUS_PRIORITY: Record<string, number> = {
  pending: 0,
  accepted: 1,
  declined: 2,
  withdrawn: 2,
  cancelled: 2,
};

export const offersRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(z.object({ postId: z.string().uuid(), amount: z.number().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { postId, amount } = input;

      const { data: post, error: postError } = await ctx.supabase
        .from("posts")
        .select("id, user_id, category, listing_status")
        .eq("id", postId)
        .maybeSingle();

      if (postError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: postError.message });
      }
      if (!post || post.category !== "market") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
      }
      if (post.user_id === userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You can't make an offer on your own listing" });
      }
      if (post.listing_status !== "available") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This listing is no longer available" });
      }

      const { data: existing, error: existingError } = await ctx.supabase
        .from("marketplace_offers")
        .select("id")
        .eq("post_id", postId)
        .eq("buyer_id", userId)
        .eq("status", "pending")
        .maybeSingle();

      if (existingError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: existingError.message });
      }

      let offerId = existing?.id;
      if (existing) {
        const { error: updateError } = await ctx.supabase
          .from("marketplace_offers")
          .update({ amount })
          .eq("id", existing.id);
        if (updateError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: updateError.message });
        }
      } else {
        const { data: inserted, error: insertError } = await ctx.supabase
          .from("marketplace_offers")
          .insert({ post_id: postId, buyer_id: userId, amount })
          .select("id")
          .single();
        if (insertError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: insertError.message });
        }
        offerId = inserted.id;
      }

      const { error: inquiryError } = await ctx.supabase
        .from("listing_inquiries")
        .upsert(
          { post_id: postId, buyer_id: userId },
          { onConflict: "post_id,buyer_id", ignoreDuplicates: true }
        );
      if (inquiryError) {
        console.error("Error recording listing inquiry:", inquiryError);
      }

      const conversation = await findOrCreateConversation(ctx.supabase, userId, post.user_id);

      await ctx.supabase.rpc("create_notification", {
        p_recipient_id: post.user_id,
        p_actor_id: userId,
        p_type: "offer_new",
        p_post_id: postId,
        p_offer_id: offerId,
      });

      return { offerId, conversationId: conversation.id };
    }),

  withdraw: protectedProcedure
    .input(z.object({ offerId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: offer, error } = await ctx.supabase
        .from("marketplace_offers")
        .select("id, buyer_id, status")
        .eq("id", input.offerId)
        .maybeSingle();

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }
      if (!offer || offer.buyer_id !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your offer" });
      }
      if (offer.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This offer can no longer be withdrawn" });
      }

      const { error: updateError } = await ctx.supabase
        .from("marketplace_offers")
        .update({ status: "withdrawn" })
        .eq("id", input.offerId);
      if (updateError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: updateError.message });
      }
      return { status: "withdrawn" as const };
    }),

  decline: protectedProcedure
    .input(z.object({ offerId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: offer, error } = await ctx.supabase
        .from("marketplace_offers")
        .select("id, status, buyer_id, post_id, posts(user_id)")
        .eq("id", input.offerId)
        .maybeSingle();

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }
      const sellerId = (offer as any)?.posts?.user_id;
      if (!offer || sellerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the seller can decline this offer" });
      }
      if (offer.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This offer can no longer be declined" });
      }

      const { error: updateError } = await ctx.supabase
        .from("marketplace_offers")
        .update({ status: "declined" })
        .eq("id", input.offerId);
      if (updateError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: updateError.message });
      }

      await ctx.supabase.rpc("create_notification", {
        p_recipient_id: offer.buyer_id,
        p_actor_id: ctx.user.id,
        p_type: "offer_declined",
        p_post_id: offer.post_id,
        p_offer_id: offer.id,
      });

      return { status: "declined" as const };
    }),

  accept: protectedProcedure
    .input(z.object({ offerId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.rpc("accept_marketplace_offer", { p_offer_id: input.offerId });
      if (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      }
      return { success: true };
    }),

  confirmCompleted: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.rpc("confirm_marketplace_deal", { p_post_id: input.postId });
      if (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      }
      return { success: true };
    }),

  cancelDeal: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.rpc("cancel_marketplace_deal", { p_post_id: input.postId });
      if (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      }
      return { success: true };
    }),

  listForPost: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: post, error: postError } = await ctx.supabase
        .from("posts")
        .select("id, user_id")
        .eq("id", input.postId)
        .maybeSingle();
      if (postError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: postError.message });
      }
      if (!post || post.user_id !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the seller can view offers" });
      }

      const { data, error } = await ctx.supabase
        .from("marketplace_offers")
        .select("id, post_id, buyer_id, amount, status, created_at, updated_at, profiles(name, avatar_url)")
        .eq("post_id", input.postId);

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return (data ?? [])
        .map(mapOffer)
        .sort((a, b) => {
          const p = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
          if (p !== 0) return p;
          return b.amount - a.amount;
        });
    }),

  getMine: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("marketplace_offers")
        .select("id, post_id, buyer_id, amount, status, created_at, updated_at")
        .eq("post_id", input.postId)
        .eq("buyer_id", ctx.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }
      return data ? mapOffer(data) : null;
    }),

  getForConversation: protectedProcedure
    .input(z.object({ otherUserId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const otherUserId = input.otherUserId;

      const [asBuyerRes, asSellerRes] = await Promise.all([
        ctx.supabase
          .from("marketplace_offers")
          .select(`id, post_id, buyer_id, amount, status, created_at, updated_at, posts(${postSelect})`)
          .eq("buyer_id", userId),
        ctx.supabase
          .from("marketplace_offers")
          .select(`id, post_id, buyer_id, amount, status, created_at, updated_at, posts(${postSelect})`)
          .eq("buyer_id", otherUserId),
      ]);

      if (asBuyerRes.error || asSellerRes.error) {
        const message = asBuyerRes.error?.message || asSellerRes.error?.message || "Failed to load offers";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }

      const candidates: any[] = [
        ...(asBuyerRes.data ?? []).filter((row: any) => row.posts?.user_id === otherUserId),
        ...(asSellerRes.data ?? []).filter((row: any) => row.posts?.user_id === userId),
      ];

      let bestOffer: any = null;
      for (const row of candidates) {
        if (!bestOffer) {
          bestOffer = row;
          continue;
        }
        const rowActionable = row.status === "pending" || row.posts?.listing_status === "pending";
        const bestActionable = bestOffer.status === "pending" || bestOffer.posts?.listing_status === "pending";
        if (rowActionable && !bestActionable) {
          bestOffer = row;
        } else if (rowActionable === bestActionable && row.updated_at > bestOffer.updated_at) {
          bestOffer = row;
        }
      }

      let post: any = bestOffer?.posts ?? null;

      if (!post) {
        const [inqAsBuyerRes, inqAsSellerRes] = await Promise.all([
          ctx.supabase
            .from("listing_inquiries")
            .select(`id, post_id, buyer_id, created_at, posts(${postSelect})`)
            .eq("buyer_id", userId),
          ctx.supabase
            .from("listing_inquiries")
            .select(`id, post_id, buyer_id, created_at, posts(${postSelect})`)
            .eq("buyer_id", otherUserId),
        ]);

        if (inqAsBuyerRes.error || inqAsSellerRes.error) {
          const message = inqAsBuyerRes.error?.message || inqAsSellerRes.error?.message || "Failed to load inquiries";
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
        }

        const inquiryCandidates = [
          ...(inqAsBuyerRes.data ?? []).filter((row: any) => row.posts?.user_id === otherUserId),
          ...(inqAsSellerRes.data ?? []).filter((row: any) => row.posts?.user_id === userId),
        ];

        let bestInquiry: any = null;
        for (const row of inquiryCandidates) {
          if (!bestInquiry || row.created_at > bestInquiry.created_at) bestInquiry = row;
        }

        if (!bestInquiry) return null;
        post = bestInquiry.posts;
      }

      if (!post) return null;

      const myRole: "buyer" | "seller" = post.user_id === userId ? "seller" : "buyer";

      let confirmedBySeller = false;
      let confirmedByBuyer = false;
      if (post.listing_status === "pending" && post.dealt_with_user_id) {
        const { data: confirmations, error: confError } = await ctx.supabase
          .from("marketplace_deal_confirmations")
          .select("user_id")
          .eq("post_id", post.id);
        if (confError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: confError.message });
        }
        const confirmedIds = new Set((confirmations ?? []).map((c: any) => c.user_id));
        confirmedBySeller = confirmedIds.has(post.user_id);
        confirmedByBuyer = confirmedIds.has(post.dealt_with_user_id);
      }

      return {
        post: mapOfferPost(post),
        offer: bestOffer ? mapOffer(bestOffer) : null,
        myRole,
        confirmedBySeller,
        confirmedByBuyer,
      };
    }),
});
