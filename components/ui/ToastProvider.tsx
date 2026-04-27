"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
    id: number;
    message: string;
    type: ToastType;
};

type ToastContextValue = {
    showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toastClassNameByType: Record<ToastType, string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-red-200 bg-red-50 text-red-900",
    info: "border-slate-200 bg-white text-slate-900",
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = "info") => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setToasts((prev) => [...prev, { id, message, type }]);

        window.setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 3500);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-32px))] flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg ${toastClassNameByType[toast.type]}`}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToastContext() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error("useToast must be used within ToastProvider");
    }

    return context;
}

