'use client';
import { useState, useEffect } from 'react';
import PantryForm from '@/components/PantryForm';
import PantryList from '@/components/PantryList';
import { useSession } from 'next-auth/react';
import Modal from '@/components/common/Modal/Modal';
import AddPantryFloatingCta from '@/components/feature/pantry/AddPantryFloatingCta';
import { useModal } from '@/hooks/useModal';

interface PantryItem { 
  _id: string;
  name: string;
  quantity: number;
  unit: string;
}

export default function Pantry() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [isOpen, setOpen] = useState(false);
  const modal = useModal();

  useEffect(() => {
    // We do not make the call if the user is not authenticated
    if (status !== "authenticated") return;

    fetch('/api/pantry')
    .then((res) => res.json())
    .then((data: PantryItem[]) => {
      setItems(data)
    })
  }, [status]);

  const handleAddItem = (newItem: Omit<PantryItem, "_id">) => {
    // Post to server, then append to state
    fetch("/api/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    })
      .then((res) => res.json())
      .then((saved: PantryItem) => {
        setItems((prev) => [...prev, saved]);
      });
  }

  return (
    <>
      <h1 className="font-headline text-primary mb-md">Your Pantry</h1>
      
      <PantryList items={items} />
      <AddPantryFloatingCta handleOnClick={modal.open} />

      <Modal isOpen={modal.isOpen} onClose={modal.close} title="Add Ingredient">
        <div className="p-md">
            <PantryForm onAdd={() => handleAddItem} />
          <button onClick={() => setOpen(false)}>Close</button>
        </div>
      </Modal>
    </>
  );
}