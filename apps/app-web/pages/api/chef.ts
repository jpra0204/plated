import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "@plated/db/src/mongoClient";
import { generateRecipe } from "../api/chefService";
import { createHash } from "crypto";

interface Recipe {
    title: string;
    servings: number;
    ingredients: string[];
    steps: string[];
    cookingTime: string;
    difficulty: string;
    cuisine: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Recipe | { error: string }>) {
  
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).end();
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: "Not authenticated" });

    // 1) Load pantry
    const dbClient = await clientPromise;
    const db = dbClient.db("plated");
    const userDoc = await db.collection("users").findOne({ email: session.user.email });
    const pantry = Array.isArray(userDoc?.pantry) ? userDoc!.pantry : [];

    // 2) Build prompt
    const { mood } = req.body as { mood: string };
    const ingredientList = pantry.map((i: any) => `- ${i.quantity} ${i.unit} ${i.name}`).join("\n");
    const prompt = `You are Plated Chef.  
Using the following ingredients:\n${ingredientList}\n  
Generate a ${mood} recipe and **output ONLY** valid JSON with these keys exactly:  
- "title": string  
- "servings": integer  
- "ingredients": string[]  
- "steps": string[]
- "cookingTime": string (e.g. "30 minutes")
- "difficulty": string (e.g. "easy", "medium", "hard")
- "cuisine": string (e.g. "Italian", "Mexican", "Indian")

**Your response must be strictly the JSON object and nothing else.**`;

    // 3) Compute cache key
    const key = createHash("sha256").update(mood + "|" + ingredientList).digest("hex");
    const cacheCol = db.collection("chefCache");

    // 4) Check cache, if it exists, return it
    const cached = await cacheCol.findOne({ key });
    if (cached) {
        return res.status(200).json(cached.recipe as Recipe);
    }

    // 5) Generate new via service
    try {
        const raw = await generateRecipe(prompt);
        const recipe = JSON.parse(raw) as Recipe;

        // 6) Save to cache
        await cacheCol.insertOne({ key, recipe, createdAt: new Date() });

        return res.status(200).json(recipe);
    } catch (err: any) {
        console.error("Chef generation failed:", err);
        return res.status(500).json({ error: "Generation failed" });
    }
}
