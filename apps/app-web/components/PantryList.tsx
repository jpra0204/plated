"use client"
import { useState, useEffect, use } from "react";

interface Item { 
    _id: string;
    name: string;
    quantity: number;
    unit: string;
}

export default function PantryList() {
    const [items, setItems] = useState<Item[]>([]);

    // Get the pantry items from the API
    const getItems = async () => {
        const res = await fetch('/api/pantry', { credentials: 'include' });
        // Check if the response is empty
        if (res.status === 204) {
          setItems([]);
          return;
        }
        if (!res.ok) {
          console.error("Failed to load pantry", res.statusText);
          return;
        }
        const data = await res.json();
        setItems(data);
    };
      

    useEffect(() => { getItems() }, []);

    // Function to delete a pantry item
    const handleDelete = async (id: string) => {
        await fetch(`/api/pantry?id=${id}`, {
            method: 'DELETE',
        });
        // Refresh the list of items
        getItems();
    }

    return (
        <ul>
          {items.map(item => (
            <li key={item._id} className="p-sm bg-background rounded-sm mb-xs flex justify-between">
              <span>{item.quantity}{item.unit} {item.name}</span>
              <button onClick={() => handleDelete(item._id!)} className="text-secondary">✕</button>
            </li>
          ))}
        </ul>
      );
}