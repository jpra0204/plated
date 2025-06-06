"use client";
import { log } from "console";
import { useState } from "react";

export default function PantryForm( { onAdd }: {onAdd: () => void}) {
    // Initialize the variables
    const [name, setName] = useState('');
    const [qty, setQty] = useState<number>(0);
    const [unit, setUnit] = useState('g');

    // Function to post a pantry item
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting', { name, qty, unit });
        await fetch('/api/pantry', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, quantity: qty, unit }),
        });
        setName(''); setQty(0); setUnit('g');
        onAdd();
    };

    return (
        <form onSubmit={handleSubmit} className="p-md bg-primary rounded-md mb-md">
            <input
                className="p-sm rounded-sm"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ingredient"
                required
            />
            <input
                className="p-sm rounded-sm"
                type="number"
                value={qty}
                onChange={e => setQty(Number(e.target.value))}
                min={0}
            />
            <select className="p-sm rounded-sm" value={unit} onChange={e => setUnit(e.target.value)}>
                {['g','kg','ml','l','oz','lb','cup','tbsp','tsp', 'unit'].map(u => (
                    <option key={u} value={u}>{u}</option>
                ))}
            </select>
            <button type="submit" className="bg-secondary text-primary p-sm rounded-sm ml-sm">
                Add
            </button>
        </form>
      );
}