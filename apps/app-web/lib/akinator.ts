/**
 * Akinator helpers (pure functions)
 *
 * WHY THIS FILE:
 * - Keep core decision-tree logic pure and testable (no DB/HTTP here).
 * - Reuse the same helpers across API routes (start/answer/undo/finish).
 *
 * WHAT'S INSIDE:
 * - Basic types for features/effects/path
 * - Functions to apply "effects" from answers to a cumulative "features" vector
 * - Logic to find next node and gather effects for the selected answer
 * - Very simple "candidateClusters" + "scoreCluster" as our first suggestion engine
 */

export type Features = Record<string, number | string>;
export type Effects = Record<string, number | string>;
export type PathStep = {
  nodeId: string;
  answerIds: string[];
  effects: Effects;
  ts: Date;
};

/**
 * applyEffects:
 * Given the current "features" vector and the "effects" of a chosen answer,
 * returns a new features object.
 *
 * WHY:
 * - Each answer may add a numeric bias (e.g., flavor.sweet +1) or set an enum (e.g., form.baked).
 * - We clamp numeric values to [-1, 1] to keep things bounded and simple for early ML later.
 */
export function applyEffects(base: Features, effects: Effects): Features {
  const out: Features = { ...base };
  for (const [key, value] of Object.entries(effects)) {
    if (typeof value === "number") {
      // If numeric: we treat as additive bias (e.g., +1 for sweet, -1 for light).
      const prev = typeof out[key] === "number" ? (out[key] as number) : 0;
      const nextVal = prev + value;
      // Clamp to [-1, 1] so values don't explode after many answers.
      out[key] = Math.max(-1, Math.min(1, nextVal));
    } else {
      // If string/enum: last answer wins (overwrite).
      out[key] = value;
    }
  }
  return out;
}

/**
 * recomputeFeatures:
 * Rebuild features by replaying the entire path (list of answered steps).
 *
 * WHY:
 * - This makes "undo" trivial and robust: pop the last step and recompute.
 * - We avoid tricky in-place mutation bugs and always derive features from the source of truth (path).
 */
export function recomputeFeatures(path: PathStep[]): Features {
  return path.reduce(
    (acc, step) => applyEffects(acc, step.effects),
    {} as Features
  );
}

/**
 * effectsForAnswer:
 * Look up the selected option in the current node and return its "effects" object.
 *
 * WHY:
 * - The decision-tree JSON defines "effects" on each option.
 * - This keeps our answer handler tiny: it just fetches effects and pushes into the path.
 */
export function effectsForAnswer(
  tree: any,
  nodeId: string,
  answerIds: string[]
): Effects {
  const node = tree.nodes?.[nodeId];
  const selected = node?.options?.find((o: any) => o.id === answerIds[0]);
  return selected?.effects ?? {};
}

/**
 * nextNodeId:
 * Resolve the next node id from the current node and chosen answer.
 *
 * WHY:
 * - The node describes which next node to jump to for each option.
 * - Returning null means we've hit a terminal node (or misconfigured tree).
 */
export function nextNodeId(
  tree: any,
  nodeId: string,
  answerIds: string[]
): string | null {
  const node = tree.nodes?.[nodeId];
  if (!node || node.type === "terminal") return null;
  const selected = node.options?.find((o: any) => o.id === answerIds[0]);
  return selected?.next ?? null;
}

/**
 * candidateClusters:
 * A tiny, first-pass mapping from features → list of cluster IDs.
 *
 * WHY:
 * - We don't have pantry or full recipe retrieval yet.
 * - Returning a short candidate set lets us score/learn later.
 * - You can expand these mappings as you grow the sweet path.
 */
export function candidateClusters(feat: Features): string[] {
  // Sweet + baked + rich → baked dessert candidates
  if (
    feat["flavor.sweet"] === 1 &&
    feat["form.baked"] === 1 &&
    feat["intensity"] === 1
  ) {
    return ["banana_muffins", "chewy_cookies", "choc_brownies_rich"];
  }
  // Sweet + cold + light → lighter cold desserts
  if (
    feat["flavor.sweet"] === 1 &&
    feat["form.cold"] === 1 &&
    feat["intensity"] === -1
  ) {
    return ["fruit_yogurt_parfait", "chia_pudding_light", "fruit_salad_light"];
  }
  // Sweet + fresh (no intensity constraint)
  if (feat["flavor.sweet"] === 1 && feat["form.fresh"] === 1) {
    return ["fruit_salad_light", "fruit_yogurt_parfait", "chia_pudding_light"];
  }
  // Fallback salty stubs until you expand that branch
  return ["savory_snack", "hearty_bite"];
}

/**
 * scoreCluster:
 * Tiny deterministic scoring function to sort candidates by how well they match features.
 *
 * WHY:
 * - Deterministic, readable logic makes early behavior predictable.
 * - Later you can replace this with a learned ranker (logistic regression/XGBoost) or LLM.
 */
export function scoreCluster(
  feat: Features,
  cluster: {
    flavor: string;
    form: string;
    intensityHint: "light" | "rich" | "either";
  }
): number {
  let score = 0;

  // Flavor alignment
  if (feat["flavor.sweet"] === 1 && cluster.flavor === "sweet") score += 0.5;
  if (feat["flavor.salty"] === 1 && cluster.flavor === "salty") score += 0.5;

  // Form alignment: infer current "form" from features and compare to cluster.form
  const form =
    feat["form.baked"] === 1
      ? "baked"
      : feat["form.cold"] === 1
        ? "cold"
        : feat["form.fresh"] === 1
          ? "fresh"
          : feat["form.snack"] === 1
            ? "snack"
            : feat["form.hearty"] === 1
              ? "hearty"
              : "other";
  if (form === cluster.form) score += 0.3;

  // Intensity alignment: light vs rich vs either
  if (typeof feat["intensity"] === "number") {
    const want = feat["intensity"] as number; // -1 light, +1 rich
    if (cluster.intensityHint === "rich" && want === 1) score += 0.2;
    if (cluster.intensityHint === "light" && want === -1) score += 0.2;
    if (cluster.intensityHint === "either") score += 0.1;
  }

  return score;
}
