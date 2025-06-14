"use client"
import { useState, useEffect, CSSProperties } from "react";
import PantryItem from "./feature/pantry/PantryItem";
import Card from "./common/Card/Card";

interface Item { 
  _id: string;
  name: string;
  quantity: number;
  unit: string;
}

export default function PantryList({items}: { items?: Item[] }) {
    // Function to delete a pantry item
    const handleDelete = (id: string) => {
        alert(`Delete item with id: ${id}`);
    }

    if(!items || items.length === 0) {
        return <p>No items in the pantry.</p>;
    }
    const totalItems = items.length;
    const bgStyle: CSSProperties = {
        width: "95%",
        margin: "0 auto",
        height: "1px",
        backgroundColor: "#efefef"
    };

    return (
        <Card>
          {items?.map((item, index) => (
            <div key={item._id}>
              <PantryItem id={item._id} {...item} onDelete={() => handleDelete(item._id)}/>
                { (totalItems - 1 !== index) && <div style={bgStyle}></div> }
            </div>

          ))}
        </Card>
      );
}