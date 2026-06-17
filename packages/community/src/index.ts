// @resonance/community — the social layer: posts, the feed, follows, likes & replies,
// topic selection. Central to the product (the `Post` is the most-used component).
//
// SKELETON: types only for now; flows build out post-checkpoint (the feed is a later
// vertical slice — ADR-0013 picks Creator Interview → ProfileGen first).

import { z } from "zod";

export const PostSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  body: z.string().max(5000),
  createdAt: z.date(),
});
export type Post = z.infer<typeof PostSchema>;
