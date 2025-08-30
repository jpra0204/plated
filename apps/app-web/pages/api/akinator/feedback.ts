/**
 * Save user feedback on suggestions
 *
 * WHAT IT DOES:
 * - Stores which cluster the user picked and whether they gave a thumbs up/down.
 * - Logs an event for analytics/training.
 *
 * WHY THUMBS:
 * - Binary feedback is simple and gives immediate supervised signal
 *   (positive vs negative) for a future ranker/LLM.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@plated/db/src/mongoClient";
import { ObjectId } from "mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const { sessionId, selectedClusterId, thumb } = req.body ?? {};
  if (!sessionId || !selectedClusterId || !["up", "down"].includes(thumb)) {
    return res.status(400).json({ error: "Bad body" });
  }

  const db = (await clientPromise).db("plated");
  const outcomes = db.collection("akinator_outcomes");
  const events = db.collection("akinator_events");

  const _id = new ObjectId(sessionId);

  // Attach feedback to the previously upserted outcome.
  await outcomes.updateOne(
    { sessionId: _id },
    { $set: { selectedClusterId, thumb } }
  );

  // Emit an event so we can reconstruct timelines and export datasets easily.
  await events.insertOne({
    sessionId: _id,
    ts: new Date(),
    type: "feedback",
    payload: { selectedClusterId, thumb },
  });

  return res.status(200).json({ ok: true });
}
