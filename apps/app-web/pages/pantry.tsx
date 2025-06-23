'use client';
import { useState, useEffect } from 'react';
import PantryList from '@/components/PantryList';
import { useSession } from 'next-auth/react';
import AddPantryModal from '@/components/feature/pantry/ModalAddPantry';
import AddPantryFloatingCta from '@/components/feature/pantry/AddPantryFloatingCta';
import { useModal } from '@/hooks/useModal';
import type { PantryItemType } from "@/types/pantry";

export default function Pantry() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<PantryItemType[]>([]);
  const modal = useModal();

  useEffect(() => {
    // We do not make the call if the user is not authenticated
    if (status !== "authenticated") return;

    fetch('/api/pantry')
    .then((res) => res.json())
    .then((data: PantryItemType[]) => {
      setItems(data)
    })
  }, [status]);

  const handleAddItem = (newItem: Omit<PantryItemType, "_id">) => {
    fetch("/api/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    })
      .then((r) => r.json())
      .then((saved: PantryItemType) => {
        setItems((prev) => [...prev, saved]);
      });
  };

  // Function to delete a pantry item
  const handleOnDelete = async (id: string) => {
      const res = await fetch(`/api/pantry?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
          credentials: "include"
      });

      if (!res.ok) {
          console.error("Delete failed", await res.text());
        } else {
          console.log("Deleted!");
          // update your UI here, e.g. refetch pantry or remove from state
          setItems((current) => current.filter((it) => it._id !== id))
        }
  };

  return (
    <>
      <h1 className="font-headline text-primary mb-md">Your Pantry</h1>
      
      <PantryList items={items} onDelete={handleOnDelete}/>
      <AddPantryFloatingCta handleOnClick={modal.open} />

      <AddPantryModal modalControl={modal} onAdd={handleAddItem} />
    </>
  );
}