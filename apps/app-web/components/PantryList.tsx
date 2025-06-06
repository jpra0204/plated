"use client"
import { useState, useEffect, use } from "react";

interface Item { 
  _id: string;
  name: string;
  quantity: number;
  unit: string;
}

export default function PantryList({items}: { items?: Item[] }) {
    // Function to delete a pantry item
    // const handleDelete = async (id: string) => {
        
    // }

    console.log("Rendering PantryList with items:", items);
    if(!items || items.length === 0) {
        return <p>No items in the pantry.</p>;
    }

    return (
        <ul>
          {items?.map(item => (
            <li key={item._id} className="p-sm bg-background rounded-sm mb-xs flex justify-between">
              <span>{item.quantity}{item.unit} {item.name}</span>
              <button onClick={() => console.log("delete")} className="text-secondary">✕</button>
            </li>
          ))}
        </ul>
      );
}