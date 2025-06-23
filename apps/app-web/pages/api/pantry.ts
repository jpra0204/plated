import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "@plated/db/src/mongoClient";
import { MongoClient, ObjectId } from "mongodb";

interface PantryItem {
  id: ObjectId;
  name: string;
  quantity: number;
  unit: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // We only allow users that are logged in to access this API
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
  return res.status(401).json({ error: "Not authenticated" });
  }

  // Connect to the database
  const client = await clientPromise as MongoClient;
  const db = client.db("plated");

  // Set user db
  const userEmail = session.user?.email;
  const users =  db.collection("users");

  // Ensure the user exists
  let user = await users.findOne({ email: userEmail });
  if (!user) {
      const result = await users.insertOne({ email: userEmail, pantry: [] });
      user = await users.findOne({ _id: result.insertedId });
  }

  // Guarantee pantry is an array
  const pantry: any[] = Array.isArray(user!.pantry) ? user!.pantry : [];

  // If the method is GET, return the user's pantry
  if (req.method === "GET") {
      return res.status(200).json(pantry);
  }

  // If the method is POST, add a new item to the user's pantry
  if (req.method === "POST") {
      const { name, quantity, unit } = req.body as {
        name: string;
        quantity: number;
        unit: string;
      };
      // Create a new MongoDB ObjectId string for the item
      const newItem = {
        _id: new ObjectId().toHexString(),
        name,
        quantity,
        unit,
      };
      await users.updateOne(
        { email: userEmail },
        { $push: { pantry: newItem } }
      );
      return res.status(201).json(newItem);
  }

  // If the method is DELETE, remove an item from the user's pantry
  if (req.method === 'DELETE') {
      const { id } = req.query as { id: string };
      const deleteResult = await users.updateOne(
          { email: userEmail },
          { $pull: { pantry: { _id: id } } }
      );
      console.log("Delete Result:", deleteResult);
      // If no item with the id provided is found, modifiedCount will be 0
      if (deleteResult.modifiedCount === 0) {
        return res.status(404).json({ error: "No pantry item found to delete" });
      }
      // Success
      return res.status(204).end();
  }

  res.setHeader('Allow', ['GET','POST','DELETE']);
  res.status(405).end();
}