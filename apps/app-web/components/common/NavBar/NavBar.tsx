"use client";

import { useRouter } from "next/router";
import Link from "next/link";
import { FaHome, FaListUl, FaBook, FaUser } from "react-icons/fa";
import { PiChefHat } from "react-icons/pi";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSession } from "next-auth/react";

// Import both CSS Modules
import mobileStyles from "./mobile.module.css";
import desktopStyles from "./desktop.module.css";

const items = [
    { href: "/",        label: "Home",    Icon: FaHome   , showDesktop: false },
    { href: "/pantry",  label: "Pantry",  Icon: FaListUl , showDesktop: true },
    { href: "/chef",    label: "Chef it", Icon: PiChefHat, showDesktop: true },
    { href: "/recipes", label: "Recipes", Icon: FaBook,    showDesktop: true },
    { href: "/profile", label: "Profile", Icon: FaUser,    showDesktop: false },
];

export default function NavBar() {
    const { pathname } = useRouter();
    const isMobile = useIsMobile();
    const { data: session } = useSession();

    // Choose which CSS Module object to reference
    const styles = isMobile ? mobileStyles : desktopStyles;

    if (isMobile) {
        return (
            <nav className={styles.navigation}>
                <ul>
                    {items.map(({ href, label, Icon }) => {
                        const isActive = pathname === href;
                        // If the user is not logged in, we show the icon
                        if (!session && href === "/profile") {
                            label = "Login";
                        }

                        return (
                            <li key={href} className={isActive ? styles.active : ""}>
                            <Link href={href}>
                                <Icon className={styles.icon} />
                                <span className={styles.label}>{label}</span>
                            </Link>
                            </li>
                        );
                    })}
                    <div className={styles.indicator}></div>
                </ul>
            </nav>
        );
    }

    return (
        <nav className={styles.navigation}>
            <div className={styles.navigationContainer}>
                <div className={styles.sideContainer}>
                    <Link href="/">Home</Link>
                </div>
                <ul>
                    {items.map(({ href, label, showDesktop }) => {
                        const isActive = pathname === href;

                        if (!session && href === "/profile") {
                            label = "Login";
                        }
                        
                        if(showDesktop) {
                            return (
                                <li key={href} className={isActive ? styles.active : ""}>
                                    <Link className={styles.label} href={href}>
                                        {label}
                                    </Link>
                                </li>
                            );
                        } else {
                            return null;
                        }
                        
                    })}
                    <div className={styles.indicator}></div>
                </ul>
                <div className={styles.sideContainer}>
                    <Link href="/profile" className={styles.label}>
                        { session ? "Profile" : "Login" }
                    </Link>
                </div>
            </div>
        </nav>
    );
}