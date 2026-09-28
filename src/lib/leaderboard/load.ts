import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const rowSchema = z.object({
  place: z.number().int(),
  username: z.string(),
  displayName: z.string().nullable(),
  rating: z.number().int(),
  answers: z.number().int(),
});

const youSchema = z.object({
  rating: z.number().int().nullable(),
  answers: z.number().int(),
  place: z.number().int().nullable(),
  listed: z.boolean(),
  reason: z.enum(["short", "hidden", "private", "accuracy"]).nullable(),
});

const boardSchema = z.object({
  rows: z.array(rowSchema),
  you: youSchema.nullable(),
});

export type BoardRow = z.infer<typeof rowSchema>;
export type YourRating = z.infer<typeof youSchema>;

export async function loadLeaderboard(): Promise<{ ready: false } | { ready: true; rows: BoardRow[]; you: YourRating | null } | { ready: true; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("leaderboard");
  if (error) {
    const text = error.message.toLowerCase();
    if (text.includes("schema cache") || text.includes("does not exist") || text.includes("could not find")) return { ready: false };
    return { ready: true, error: "The board could not be loaded." };
  }
  const parsed = boardSchema.safeParse(data);
  if (!parsed.success) return { ready: true, error: "The board could not be read." };
  return { ready: true, rows: parsed.data.rows, you: parsed.data.you };
}
