import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { postsRouter } from "./routes/posts/route";
import { connectionsRouter } from "./routes/connections/route";
import { messagesRouter } from "./routes/messages/route";
import { profilesRouter } from "./routes/profiles/route";
import { profileQrRouter } from "./routes/profile-qr/route";
import { reportsRouter } from "./routes/reports/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  posts: postsRouter,
  connections: connectionsRouter,
  messages: messagesRouter,
  profiles: profilesRouter,
  profileQr: profileQrRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;
