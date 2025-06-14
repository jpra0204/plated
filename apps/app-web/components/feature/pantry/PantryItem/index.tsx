"use client";

import { useSwipeable } from "react-swipeable";
import { useState, CSSProperties } from "react";
import styles from "./styles.module.css";
import { FaTrashAlt, FaCartPlus } from "react-icons/fa";


interface PantryItemProps {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    onDelete: (id: string) => void;
    onAddToCart?: (id: string) => void;
}

export default function PantryItem({ id, name, quantity, unit, onDelete, onAddToCart }: PantryItemProps) {
    const [deltaX, setDeltaX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    // Function to delete a pantry item
    const handleOnDelete = (id: string) => {
        console.log(id)
        fetch('/api/pantry', {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
    };

    const handlers = useSwipeable({
        onSwiping: ({ deltaX }) => {
            setIsSwiping(true);
            // setDeltaX(deltaX); to add when swiping right is allowed
            setDeltaX(Math.min(deltaX, 0));
        },
        onSwiped: ({ absX, deltaX }) => {
            setIsSwiping(false);
            if (deltaX < 0 && absX > 100) {
                handleOnDelete(id);
            }
            //  else if (deltaX > 0 && absX > 100) {
            //     onAddToCart?.(id);
            // }
            setDeltaX(0);
        },
        trackMouse: true,
    });

    // Decide which direction class to apply
    const direction = deltaX < 0 ? "pantryItemBackgroundDelete" : deltaX > 0 ? "pantryItemBackgroundAdd" : "";
    // Determine the icon based on the swipe direction
    const icon = deltaX < 0 ? <FaTrashAlt /> : deltaX > 0 ? <FaCartPlus /> : "";

    // Inline styling
    const bgStyle: CSSProperties = {
        width: Math.abs(deltaX),
    };
    const itemStyle: CSSProperties = {
        transform: `translateX(${deltaX}px)`,
        transition: isSwiping ? "none" : "transform 150ms ease-out",
        boxShadow: isSwiping ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
    };

    
    return (
        <div className={styles.pantryItemWrapper} {...handlers}>

            { direction && (
                <div className={`${styles.pantryItemBackground} ${styles[direction]}`} style={bgStyle}>
                    {icon}
                </div>
            )}

            <div className={styles.pantryItem} style={itemStyle}>
                <span className={styles.pantryItemLabel}>{name}</span>
                <span className={styles.pantryItemQuantity} style={{ color: "#666", fontSize: "0.875rem" }}>
                    {quantity} {unit}
                </span>
            </div>
        </div>
    );
}