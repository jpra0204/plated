/**
 * Finish the session and compute suggestions
 *
 * WHAT IT DOES:
 * - Marks the session as finished the first time it's called.
 * - Computes a simple "intent" (sweet/salty) from features.
 * - Resolves candidate cluster IDs and scores them against current features.
 * - Upserts an "outcome" document with suggestions (for later feedback).
 * - Returns { intent, suggestions } to the UI.
 *
 * WHY OUTCOME:
 * - We want a stable record of what we suggested to the user, so their
 *   later feedback (thumb up/down) has proper context.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@plated/db/src/mongoClient";
import { ObjectId } from "mongodb";
import { candidateClusters, scoreCluster } from "@/lib/akinator";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();
  const { sessionId } = req.body ?? {};
  if (!sessionId) return res.status(400).json({ error: "Bad body" });

  const db = (await clientPromise).db("plated");
  const trees = db.collection("akinator_trees");
  const sessions = db.collection("akinator_sessions");
  const events = db.collection("akinator_events");
  const outcomes = db.collection("akinator_outcomes");
  const clusters = db.collection("dish_clusters");

  const session = await sessions.findOne({ _id: new ObjectId(sessionId) });
  if (!session) return res.status(404).json({ error: "Session not found" });

  // Validate the shape early, before new ObjectId(...)
  if (typeof sessionId !== "string" || !ObjectId.isValid(sessionId)) {
    return res.status(400).json({
      error: "Invalid sessionId: must be a 24-character hex string",
      got: sessionId,
    });
  }

  const tree = await trees.findOne({
    treeId: session.treeId,
    version: session.version,
  });
  if (!tree) return res.status(404).json({ error: "Tree version not found" });

  // First finish call stamps finishedAt + logs event.
  if (!session.finishedAt) {
    await sessions.updateOne(
      { _id: session._id },
      { $set: { finishedAt: new Date() } }
    );
    await events.insertOne({
      sessionId: session._id,
      ts: new Date(),
      type: "finish",
    });
  }

  // Simple intent: sweet if flavor.sweet=1 else salty.
  // WHY: Gives the LLM a clean, reproducible label later.
  const intent = {
    cluster: session.state.features["flavor.sweet"] === 1 ? "sweet" : "salty",
    features: session.state.features,
  };

  // Retrieve a short list of candidate cluster IDs and fetch their docs.
  const ids = candidateClusters(session.state.features);
  const docs = await clusters.find({ id: { $in: ids } }).toArray();

  // Score each candidate using our small scoring function and sort descending.
  const suggestions = docs
    .map((d: any) => ({
      clusterId: d.id,
      score: scoreCluster(session.state.features, d),
    }))
    .sort((a, b) => b.score - a.score);

  // Upsert an outcome: we want to track what we suggested for later thumbs feedback.
  await outcomes.updateOne(
    { sessionId: session._id },
    { $set: { intent, suggestions, createdAt: new Date() } },
    { upsert: true }
  );

  return res.status(200).json({ intent, suggestions });
}
