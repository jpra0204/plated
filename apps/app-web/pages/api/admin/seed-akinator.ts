/**
 * Admin-only seeding endpoint to insert:
 *  - the initial Akinator decision tree (versioned JSON),
 *  - a few starter "dish clusters".
 *
 * IMPORTANT:
 *  - In Next.js **Pages API** routes, you MUST `export default` a function.
 *  - The function signature is `(req: NextApiRequest, res: NextApiResponse)`.
 *  - If you do not export a default, Next will throw:
 *    "Page /api/... does not export a default function."
 */

import type { NextApiRequest, NextApiResponse } from "next";
// Use your existing shared Mongo client (this matches your repo setup)
import clientPromise from "@plated/db/src/mongoClient";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Limit to POST to avoid accidental seeding via GET in the browser
  if (req.method !== "POST") return res.status(405).end();

  // 1) Connect to Mongo using your shared client
  const db = (await clientPromise).db("plated");

  // 2) Collections used for decision tree and clusters
  const trees = db.collection("akinator_trees");
  const clusters = db.collection("dish_clusters");

  // 3) Seed some starter clusters (labels to suggest and later train on)
  const seedClusters = [
    {
      id: "banana_muffins",
      label: "Banana Muffins",
      flavor: "sweet",
      form: "baked",
      intensityHint: "either",
      examples: ["High-protein banana muffins", "Classic banana muffins"],
    },
    {
      id: "chewy_cookies",
      label: "Chewy Chocolate Chip Cookies",
      flavor: "sweet",
      form: "baked",
      intensityHint: "rich",
      examples: ["NYC-style cookies"],
    },
    {
      id: "choc_brownies_rich",
      label: "Fudgy Brownies",
      flavor: "sweet",
      form: "baked",
      intensityHint: "rich",
      examples: ["One-bowl brownies"],
    },
    {
      id: "fruit_yogurt_parfait",
      label: "Fruit & Yogurt Parfait",
      flavor: "sweet",
      form: "cold",
      intensityHint: "light",
      examples: ["Greek yogurt parfait"],
    },
    {
      id: "chia_pudding_light",
      label: "Chia Pudding",
      flavor: "sweet",
      form: "cold",
      intensityHint: "light",
      examples: ["Vanilla chia pudding"],
    },
    {
      id: "fruit_salad_light",
      label: "Fresh Fruit Salad",
      flavor: "sweet",
      form: "fresh",
      intensityHint: "light",
      examples: ["Berry melon salad"],
    },
    // salty placeholders for now:
    {
      id: "savory_snack",
      label: "Savory Snack (Stub)",
      flavor: "salty",
      form: "snack",
      intensityHint: "either",
      examples: ["Seasoned popcorn"],
    },
    {
      id: "hearty_bite",
      label: "Hearty Bite (Stub)",
      flavor: "salty",
      form: "hearty",
      intensityHint: "either",
      examples: ["Mini sandwich"],
    },
  ];

  // 4) Versioned tree JSON (easy to extend later without changing code)
  const treeV1 = {
    treeId: "food-akinator",
    version: 1,
    root: "q_flavor",
    nodes: {
      q_flavor: {
        type: "single_choice",
        prompt: "What flavor are you craving?",
        options: [
          {
            id: "sweet",
            label: "Sweet",
            next: "q_sweet_form",
            effects: { "flavor.sweet": 1 },
          },
          {
            id: "salty",
            label: "Salty",
            next: "q_salty_form",
            effects: { "flavor.salty": 1 },
          },
        ],
      },
      q_sweet_form: {
        type: "single_choice",
        prompt: "What form sounds best?",
        options: [
          {
            id: "baked",
            label: "Baked",
            next: "q_sweet_weight",
            effects: { "form.baked": 1 },
          },
          {
            id: "cold",
            label: "Cold/creamy",
            next: "q_sweet_weight",
            effects: { "form.cold": 1 },
          },
          {
            id: "fresh",
            label: "Fresh/fruit-forward",
            next: "q_sweet_weight",
            effects: { "form.fresh": 1 },
          },
        ],
      },
      q_sweet_weight: {
        type: "single_choice",
        prompt: "How intense?",
        options: [
          {
            id: "light",
            label: "Light",
            next: "t_sweet",
            effects: { intensity: -1 },
          },
          {
            id: "rich",
            label: "Rich",
            next: "t_sweet",
            effects: { intensity: 1 },
          },
        ],
      },
      q_salty_form: {
        type: "single_choice",
        prompt: "Quick savory fork (you can expand later):",
        options: [
          {
            id: "snack",
            label: "Snacky",
            next: "t_salty",
            effects: { "form.snack": 1 },
          },
          {
            id: "hearty",
            label: "Hearty",
            next: "t_salty",
            effects: { "form.hearty": 1 },
          },
        ],
      },
      // Terminal nodes: reaching these means we're ready to compute suggestions.
      t_sweet: { type: "terminal", intent: { cluster: "sweet" } },
      t_salty: { type: "terminal", intent: { cluster: "salty" } },
    },
    active: true,
  };

  // 5) Reset and insert fresh seed data (fine for dev)
  await clusters.deleteMany({});
  await clusters.insertMany(seedClusters);

  await trees.deleteMany({ treeId: "food-akinator" });
  await trees.insertOne(treeV1);

  // 6) Respond with a simple OK payload
  return res
    .status(200)
    .json({ ok: true, clusters: seedClusters.length, treeVersion: 1 });
}
