import SuggestionItem from "../AddPantrySuggestionItem";
import type { Suggestion } from "@/types/suggestion";
import styles from "./styles.module.css";

export default function SuggestionList({ items, onAdd }: { items: Suggestion[]; onAdd: (item: Suggestion) => void }) {
  // todo check the error handling ui
  if (!Array.isArray(items) || items.length === 0) {
    return <p>No suggestions</p>;
  }

  return (
    <ul className={styles.suggestionList}>
      {items.map(item => (
        <>
          <SuggestionItem key={item.id} item={item} onAdd={onAdd}/>
          <div className={styles.itemSeparator}></div>
        </>
      ))}
    </ul>
  )
}