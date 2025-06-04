"use client";

import { useRouter } from "next/router";
import Link from "next/link";
import { FaHome, FaListUl, FaBook, FaUser } from "react-icons/fa";
import { PiChefHat } from "react-icons/pi";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSession } from "next-auth/react";

const items = [
    { href: "/",        label: "Home",    Icon: FaHome },
    { href: "/pantry",  label: "Pantry",  Icon: FaListUl },
    { href: "/chef",    label: "Chef it", Icon: PiChefHat },
    { href: "/recipes", label: "Recipes", Icon: FaBook },
    { href: "/profile", label: "Profile", Icon: FaUser },
];

export default function NavBar() {
    const { pathname } = useRouter();
    const isMobile = useIsMobile();
    const { data: session } = useSession();

    if (isMobile) {
        return (
            <nav className="navigation navigation-mobile">
                <ul>
                    {items.map(({ href, label, Icon }) => {
                        const isActive = pathname === href;
                        // If the user is not logged in, we show the icon
                        if (!session && href === "/profile") {
                            label = "Login";
                        }

                        return (
                            <li key={href} className={isActive ? "active" : ""}>
                            <Link href={href}>
                                <Icon className="icon" />
                                <span className="label">{label}</span>
                            </Link>
                            </li>
                        );
                    })}
                    <div className="indicator"></div>
                </ul>
            </nav>
        );
    }

    return (
        <nav className="navigation-desktop">
            
        </nav>
    );
}