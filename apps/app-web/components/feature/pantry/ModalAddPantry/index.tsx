"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/common/Modal/Modal";
import type { PantryItemType } from "@/types/pantry";
import SearchInput from "../AddPantrySearchInput";
import type { Suggestion } from "@/types/suggestion";
import SuggestionList from "../AddPantrySuggestionList";
import styles from "./styles.module.css";
import { useToast } from "@/hooks/useToast";

type AddPantryModalProps = {
  onAdd: (item: Omit<PantryItemType, "_id">) => void;
  modalControl: { isOpen: boolean; close: () => void };
};

export default function AddPantryModal({
  onAdd,
  modalControl,
}: AddPantryModalProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const toast = useToast();

    useEffect(() => {
    if (!query) {
        setResults([]);
        return;
    }

    setLoading(true);

    const url =
        `https://trackapi.nutritionix.com/v2/search/instant` +
        `?query=${encodeURIComponent(query)}` +
        `&common=true&branded=false&self=false&detailed=false`;

    fetch(url, {
        headers: {
        "x-app-id": process.env.NEXT_PUBLIC_NUTRITIONIX_APP_ID as string,
        "x-app-key": process.env.NEXT_PUBLIC_NUTRITIONIX_APP_KEY as string,
        },
    })
        .then((r) => {
            if (!r.ok) throw new Error(r.statusText);
            return r.json();
        })
        .then((data: { common: any[] }) => {
            /* Map Nutritionix shape → local Suggestion shape */
            const mapped: Suggestion[] = data.common
                .slice(0, 10)
                .map((c) => ({
                    id: c.tag_id ?? c.food_name,
                    product_name: c.food_name,
                    image_front_small_url: c.photo?.thumb ?? null,
            }));
            setResults(mapped);
            setError(null);
        })
        .catch((err) => {
            console.error(err);
            setError("Failed to load suggestions");
        })
        .finally(() => setLoading(false));
    }, [query]);

    const handleAdd = (s: Suggestion) => {
    const newItem: Omit<PantryItemType, "_id"> = {
        name: s.product_name,
        quantity: 1,
        unit: "",
        createdAt: new Date().toISOString(),
    };
    onAdd(newItem);
    setQuery("");
    setResults([]);
    toast.success("Ingredient saved!");
    };

    return (
        <Modal isOpen={modalControl.isOpen} onClose={modalControl.close} title="Add Ingredient" className={styles.addPantryModal}>
            <SearchInput
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setQuery(e.target.value)
                }
                onClear={() => setQuery("")} />
            
            {loading && <div>Loading…</div>}
            {error && <div className="error">{error}</div>}

            <SuggestionList items={results} onAdd={handleAdd} />
        </Modal>
    );
}