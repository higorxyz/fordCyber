"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, LogOut } from "lucide-react";
import { getRole, logout, Role } from "@/lib/auth";

type NavLink = {
  href: string;
  label: string;
  code: string;
  roles: Role[];
};

const ALL_LINKS: NavLink[] = [
  { href: "/app", label: "App Cliente", code: "01", roles: ["usuario", "admin"] },
  { href: "/command", label: "Command", code: "02", roles: ["analista", "admin"] },
  { href: "/motor", label: "Motor IA", code: "03", roles: ["analista", "admin"] },
  { href: "/admin", label: "Admin", code: "04", roles: ["admin"] },
  { href: "/sessions", label: "Sessões", code: "05", roles: ["usuario", "analista", "admin"] },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [now, setNow] = useState<string>("");
  const [role, setRole] = useState<Role | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date();
      setNow(
        d.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let active = true;
    getRole()
      .then((value) => {
        if (active) setRole(value);
      })
      .finally(() => {
        if (active) setRoleLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const navLinks =
    roleLoaded && role
      ? ALL_LINKS.filter((link) => link.roles.includes(role))
      : [];
  const homeHref = role === "analista" ? "/command" : "/app";

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <nav className="sticky top-0 z-40 bg-ford-blue/95 backdrop-blur border-b border-ford-blue-light/40">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6">
        <div className="hidden md:flex h-14 items-center justify-between">
          <Link href={homeHref} className="flex items-center gap-3 group">
            <div className="relative">
              <Activity
                className="w-5 h-5 text-ford-blue-light group-hover:scale-110 transition-transform"
                strokeWidth={2.5}
              />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-ford-blue-light rec-dot" />
            </div>
            <span className="font-display font-bold tracking-[0.32em] text-white text-sm">
              FORD<span className="text-ford-blue-light">·</span>VISION
            </span>
            <span className="font-mono-tech text-[9px] text-white/40 ml-2 border-l border-white/20 pl-3">
              v2.6.0
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {navLinks.map((l) => {
              const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`font-display px-4 py-1.5 text-[11px] uppercase tracking-[0.25em] transition-all border-b-2 flex items-center gap-2 ${
                    active
                      ? "border-ford-blue-light text-white"
                      : "border-transparent text-white/60 hover:text-white"
                  }`}
                >
                  <span className="font-mono-tech text-[8px] text-ford-blue-light">
                    /{l.code}
                  </span>
                  {l.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 font-mono-tech text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-ford-red rec-dot" />
              <span className="text-ford-red tracking-wider">REC</span>
              <span className="text-white/50">·</span>
              <span className="text-white/80 tabular-nums">{now || "--:--:--"}</span>
            </div>
            <button
              onClick={handleLogout}
              className="font-display flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-ford-blue-light transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </div>

        <div className="md:hidden flex h-14 items-center justify-between">
          <Link href={homeHref} className="flex items-center gap-2 group min-w-0">
            <div className="relative">
              <Activity
                className="w-4 h-4 text-ford-blue-light group-hover:scale-110 transition-transform"
                strokeWidth={2.5}
              />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-ford-blue-light rec-dot" />
            </div>
            <span className="font-display font-bold tracking-[0.22em] text-white text-xs truncate">
              FORD<span className="text-ford-blue-light">·</span>VISION
            </span>
          </Link>

          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono-tech text-[10px] text-white/70 tabular-nums">
              {now || "--:--:--"}
            </span>
            <button
              onClick={handleLogout}
              className="font-display flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-ford-blue-light transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </div>

        <div className="md:hidden -mx-3 px-3 pb-2 overflow-x-auto">
          <div className="flex min-w-max items-center gap-1">
            {navLinks.map((l) => {
              const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`font-display px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-all border rounded-sm whitespace-nowrap flex items-center gap-1.5 ${
                    active
                      ? "border-ford-blue-light text-white bg-ford-blue-light/10"
                      : "border-white/20 text-white/65 hover:text-white"
                  }`}
                >
                  <span className="font-mono-tech text-[8px] text-ford-blue-light">
                    /{l.code}
                  </span>
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
