import { useState } from 'react';
import PantryForm from '@/components/PantryForm';
import PantryList from '@/components/PantryList';

export default function Pantry() {
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="p-md">
      <h1 className="font-headline text-primary mb-md">Our Pantry</h1>
      <PantryForm onAdd={() => setRefresh(r => r + 1)} />
      <PantryList key={refresh} />
    </div>
  );
}