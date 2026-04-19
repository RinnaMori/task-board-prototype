"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppShellProps = {
    title: string;
    description: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
};

const navItems = [
    { href: "/dashboard", label: "ボード" },
    { href: "/tasks", label: "タスク一覧" },
    { href: "/flows", label: "差配フロー" },
];

export function AppShell({ title, description, children, actions }: AppShellProps) {
    const pathname = usePathname();

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-6 lg:px-8">
            <div className="mx-auto max-w-[1680px] space-y-5">
                <header className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-500">Task Capacity Dashboard</p>
                            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{title}</h1>
                            <p className="mt-2 text-sm font-medium text-slate-500 md:text-base">{description}</p>
                        </div>

                        <div className="flex flex-col gap-3 lg:items-end">
                            <nav className="flex flex-wrap gap-2">
                                {navItems.map((item) => {
                                    const active = pathname === item.href || (item.href === "/dashboard" && pathname === "/");
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${active
                                                    ? "bg-slate-900 text-white"
                                                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                                }`}
                                        >
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>
                            {actions ? <div className="flex flex-wrap justify-end gap-2">{actions}</div> : null}
                        </div>
                    </div>
                </header>

                {children}
            </div>
        </main>
    );
}