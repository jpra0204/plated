/**
 * Undo the last answer (single-step)
 *
 * WHAT IT DOES:
 * - Pops the last step off the path if it exists.
 * - Recomputes features from the truncated path.
 * - Returns the "current" node for the UI to show again.
 *
 * WHY ONLY ONE STEP:
 * - Your requirement says "allow 1-step back"; for more, you'd repeat pop().
 */

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@plated/db/src/mongoClient";
import { ObjectId } from "mongodb";
import { recomputeFeatures } from "@/lib/akinator";

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

  // If path is empty, we're at the root already.
  const path = session.state.path;
  if (!path.length) {
    return res
      .status(200)
      .json({ node: tree.nodes[tree.root], state: session.state });
  }

  // Pop one step and recompute features.
  path.pop();
  const features = recomputeFeatures(path);

  // Persist new state and log an event.
  await sessions.updateOne(
    { _id: session._id },
    { $set: { "state.path": path, "state.features": features } }
  );
  await events.insertOne({
    sessionId: session._id,
    ts: new Date(),
    type: "undo",
  });

  /**
   * What node should we show now?
   * - If we have remaining steps, we want the next question after the LAST answered node.
   * - If no steps remain, show the root node again.
   *
   * NOTE:
   * For this simple linear path, the last answered node's option defines "next".
   * If you later support multi-choice or conditional jumps, you may want to store
   * the "next" node id in each path step for perfect fidelity.
   */
  const last = path[path.length - 1];
  const nodeIdToShow = last
    ? (tree.nodes[last.nodeId]?.next ?? tree.root)
    : tree.root;
  const node = tree.nodes[nodeIdToShow] ?? tree.nodes[tree.root];

  return res.status(200).json({ node, state: { features, path } });
}
