import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../create-context";
import { TRPCError } from "@trpc/server";

export const reportsRouter = createTRPCRouter({
  reportUser: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        reason: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reporterId = ctx.user.id;
      const { userId, reason } = input;

      if (reporterId === userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot report yourself." });
      }

      const canReportAgain = await ctx.supabase
        .rpc("can_report_again", { rid: reporterId, target: userId });

      if (canReportAgain.error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: canReportAgain.error.message });
      }

      if (!canReportAgain.data) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Report cooldown active.",
        });
      }

      const { error } = await ctx.supabase
        .from("user_reports")
        .insert({
          reporter_id: reporterId,
          reported_id: userId,
          reason,
        });

      if (error) {
        if (error.code === "23505") {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "You recently reported this user." });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return { success: true };
    }),
});

