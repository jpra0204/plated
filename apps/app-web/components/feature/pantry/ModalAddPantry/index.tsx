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
    const Toast = useToast();

    // fetch suggestions when query changes
    useEffect(() => {
    if (!query) {
        setResults([]);
        return;
    }
    setLoading(true);

    const params = new URLSearchParams({
        search_terms: query,
        search_simple: "1",
        action: "process",
        json: "1",
        page_size: "10",
        fields: "product_name,image_front_small_url",
        nocache: "1",
        taptype_0: "categories",
        tag_contains_0: "contains",
        tag_0: query,
    });

    fetch("https://world.openfoodfacts.org/cgi/search.pl?" + params.toString())
            .then((r) => r.json())
            .then((data: { products: Suggestion[] }) => {
            setResults(data.products || []);
            setError(null);
        })
        .catch((err) => {
            console.error(err);
            setError("Failed to load");
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
        Toast.success("Ingredient saved!");
    };

    return (
        <Modal isOpen={modalControl.isOpen} onClose={modalControl.close} title="Add Ingredient" className={styles.addPantryModal}>
            <SearchInput
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                onClear={() => setQuery("")}
            />
            {loading && <div>Loading…</div>}
            {error && <div className="error">{error}</div>}
            <SuggestionList items={results} onAdd={handleAdd} />
        </Modal>
    );
}