/**
 * Start a new Akinator session
 *
 * WHAT IT DOES:
 * - Loads the active tree version from Mongo.
 * - Creates a new "session" document with empty features/path.
 * - Logs an event ("start") for analytics/training later.
 * - Returns the first node so the UI can render the first question.
 *
 * WHY SESSIONS:
 * - We need to keep track of the user's path through the tree (for undo and ML).
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import clientPromise from "@plated/db/src/mongoClient";
import { ObjectId } from "mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);

  const db = (await clientPromise).db("plated");
  const trees = db.collection("akinator_trees");
  const sessions = db.collection("akinator_sessions");
  const events = db.collection("akinator_events");

  // Load the active tree (versioned).
  const tree = await trees.findOne({ treeId: "food-akinator", active: true });
  if (!tree) return res.status(404).json({ error: "Tree not found" });

  // Create a session doc (we store minimal context now; locale only).
  const doc = {
    userId: session?.user?.id ? new ObjectId(session.user.id) : null,
    treeId: tree.treeId,
    version: tree.version,
    startedAt: new Date(),
    finishedAt: null,
    context: { locale: "en" },
    state: { features: {}, path: [] as any[] },
  };

  const { insertedId } = await sessions.insertOne(doc);

  // Emit an immutable event for analytics/training.
  await events.insertOne({
    sessionId: insertedId,
    ts: new Date(),
    type: "start",
    payload: { userId: doc.userId },
  });

  // Return the first node to render the first question.
  return res
    .status(200)
    .json({ sessionId: insertedId.toString(), node: tree.nodes[tree.root] });
}
