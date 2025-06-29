import styles from './styles.module.css';

export default function Card({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`${styles.card} ${className}`}>
            {children}
        </div>
    );
}