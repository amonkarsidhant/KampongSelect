"use client";

import Link from "next/link";
import { User, Clipboard, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/lib/types";

interface Props {
  current: "player" | "captain" | "admin";
  userRole: UserRole;
}

/**
 * Shows the role tab the user is currently on, plus tabs for any other
 * roles they have permission for. Players see only "Player". Captains see
 * Player + Captain. Admins see all three.
 */
export default function RoleSwitcher({ current, userRole }: Props) {
  const router = useRouter();
  const tabs: {
    key: "player" | "captain" | "admin";
    label: string;
    icon: React.ReactNode;
    href: string;
  }[] = [
    {
      key: "player",
      label: "Player",
      icon: <User size={13} />,
      href: "/player",
    },
  ];
  if (userRole === "captain" || userRole === "admin") {
    tabs.push({
      key: "captain",
      label: "Captain",
      icon: <Clipboard size={13} />,
      href: "/captain",
    });
  }
  if (userRole === "admin") {
    tabs.push({
      key: "admin",
      label: "Admin",
      icon: <Settings size={13} />,
      href: "/admin",
    });
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex gap-1 p-1 bg-stone-100/[0.04] border border-stone-100/10 rounded-lg">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
              t.key === current
                ? "bg-stone-100 text-stone-900"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            {t.icon}
            {t.label}
          </Link>
        ))}
      </div>
      <button
        onClick={signOut}
        className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1.5"
      >
        <LogOut size={12} /> Sign out
      </button>
    </div>
  );
}
