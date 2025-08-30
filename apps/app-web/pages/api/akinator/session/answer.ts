/**
 * Answer the current node and move forward
 *
 * WHAT IT DOES:
 * - Reads the session and tree version.
 * - Computes "effects" for the chosen answer.
 * - Appends a step to the session path and recomputes features.
 * - Returns the next node for the UI to render.
 *
 * WHY RECOMPUTE:
 * - We rebuild features from the entire path so "undo" is trivial and consistent.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@plated/db/src/mongoClient";
import { ObjectId } from "mongodb";
import {
  effectsForAnswer,
  recomputeFeatures,
  nextNodeId,
} from "@/lib/akinator";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const { sessionId, nodeId, answerIds } = req.body ?? {};
  if (!sessionId || !nodeId || !Array.isArray(answerIds)) {
    return res.status(400).json({ error: "Bad body" });
  }

  // Validate the shape early, before new ObjectId(...)
  if (typeof sessionId !== "string" || !ObjectId.isValid(sessionId)) {
    return res.status(400).json({
      error: "Invalid sessionId: must be a 24-character hex string",
      got: sessionId,
    });
  }

  const db = (await clientPromise).db("plated");
  const trees = db.collection("akinator_trees");
  const sessions = db.collection("akinator_sessions");
  const events = db.collection("akinator_events");

  const session = await sessions.findOne({ _id: new ObjectId(sessionId) });
  if (!session) return res.status(404).json({ error: "Session not found" });

  const tree = await trees.findOne({
    treeId: session.treeId,
    version: session.version,
  });
  if (!tree) return res.status(404).json({ error: "Tree version not found" });

  // Compute effects for the chosen option(s) (single_choice for now).
  const effects = effectsForAnswer(tree, nodeId, answerIds);

  // Append to the path (immutable approach).
  const newStep = { nodeId, answerIds, effects, ts: new Date() };
  const newPath = [...session.state.path, newStep];

  // Rebuild features from path to avoid mutation errors.
  const features = recomputeFeatures(newPath);

  // Persist updated session state.
  await sessions.updateOne(
    { _id: session._id },
    { $set: { "state.path": newPath, "state.features": features } }
  );

  // Log event for analytics/training.
  await events.insertOne({
    sessionId: session._id,
    ts: new Date(),
    type: "answer",
    nodeId,
    payload: { answerIds, effects },
  });

  // Resolve next node from the tree.
  const nextId = nextNodeId(tree, nodeId, answerIds);
  const nextNode = nextId ? tree.nodes[nextId] : null;

  // Return next node and current state (for UI).
  return res
    .status(200)
    .json({ node: nextNode, state: { features, path: newPath } });
}
