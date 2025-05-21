import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "@plated/db/src/mongoClient";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // We only allow users that are logged in to access this API
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: "Not authenticated" });

    // Connect to the database
    const db = (await clientPromise).db("plated");
    const recipes = db.collection("recipes");

    const userId = session.user.id;

    if (req.method === "POST") {
        const recipe = { 
            ...req.body, 
            ownerId: new ObjectId(userId), 
            createdAt: new Date() 
        };
        const result = await recipes.insertOne(recipe);

        return res.status(201).json({ _id: result.insertedId, ...recipe });
    }

    if (req.method === "GET") {
        const list = await recipes
            .find({ ownerId: new ObjectId(userId) })
            .sort({ createdAt: -1 })
            .toArray();
            
        return res.status(200).json(list);
    }

    res.setHeader("Allow", ["GET","POST"]);
    res.status(405).end();
}
