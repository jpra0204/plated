import styles from "./styles.module.css";
import { FaPlus } from "react-icons/fa";

export default function AddPantryFloatingCta({ handleOnClick }: { handleOnClick: () => void }) {
    return (
        <button className={styles.floatingCta} onClick={handleOnClick}>
            <FaPlus />
        </button>
    );
}
