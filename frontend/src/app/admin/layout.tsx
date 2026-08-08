"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../../hooks/use-auth";
import Sidebar from "../../components/admin/sidebar";
import { Loader2, Menu } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Allow the login page to render without auth check
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoginPage) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, isLoginPage, router]);

  // Cierra el drawer mobile al navegar a otra ruta del panel
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Login page renders without the admin shell
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show loader while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0F1117]">
        <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
      </div>
    );
  }

  // Not authenticated and not login page — handled by redirect above
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#0F1117]">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <main
        className={`min-w-0 flex-1 transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-[240px]"
        }`}
      >
        {/* Barra superior solo mobile: el sidebar vive fuera de flujo (fixed) y arranca
            oculto (-translate-x-full) por debajo de lg, así que necesita su propio disparador */}
        <div className="flex items-center gap-3 border-b border-[#2D3147] bg-[#13151E] px-4 py-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-[#1F2234] hover:text-white transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-base font-bold tracking-tight text-white">
            Menu<span className="text-[#6366F1]">QR</span>
          </span>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
