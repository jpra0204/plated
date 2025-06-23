import type { Suggestion } from "@/types/suggestion"
import styles from "./styles.module.css"
import { FaPlus } from "react-icons/fa";

export default function SuggestionItem({ item, onAdd }: { item: Suggestion; onAdd: (it: Suggestion) => void }) {
    return (
        <li className={styles.suggestionItem} onClick={() => onAdd(item)}>
            <div className={styles.itemInfoContainer}>
                <img src={item.image_front_small_url} alt="" className={styles.itemImage} />
                <div className="info">
                    <div className="name">{item.product_name}</div>
                    {/* <div className="category">{item.category}</div> */}
                </div>
            </div>
            <FaPlus color="#A8B39A" /> 
        </li>
    )
}