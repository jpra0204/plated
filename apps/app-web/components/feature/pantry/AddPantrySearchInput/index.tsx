import styles from "./styles.module.css";
import InputText from "@/components/common/Input";
import { FaXmark } from "react-icons/fa6";

export default function SearchInput({ value, onChange, onClear }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: ()=>void }) {
  return (
    <div className={styles.searchInputWrapper}>
      <InputText
        className="search-input-field"
        id="search-input"
        placeholder="Search ingredients…"
        value={value}
        onChange={e => onChange(e)}
      />
      {value && <FaXmark onClick={onClear} className={styles.clearCta} />}
    </div>
  )
}