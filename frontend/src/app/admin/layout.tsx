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
  const { isAuthenticated, isLoading, isPlatformAdmin, mustChangePassword } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Allow the login page to render without auth check
  const isLoginPage = pathname === "/admin/login";
  const isChangePasswordPage = pathname === "/admin/change-password";
  // Rutas solo para administradores de plataforma (la seguridad real está en el backend)
  const isAdminOnlyRoute =
    pathname === "/admin/users" ||
    pathname.startsWith("/admin/users/") ||
    pathname === "/admin/qr" ||
    pathname === "/admin/google-reviews" ||
    pathname.startsWith("/admin/google-reviews/") ||
    /^\/admin\/restaurants\/[^/]+\/qr\/?$/.test(pathname);
  const mustRedirectToChangePassword = isAuthenticated && mustChangePassword && !isChangePasswordPage;
  const mustRedirectToDashboard = isAuthenticated && !isPlatformAdmin && isAdminOnlyRoute;

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoginPage) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, isLoginPage, router]);

  useEffect(() => {
    if (mustRedirectToChangePassword) {
      router.replace("/admin/change-password");
    } else if (mustRedirectToDashboard) {
      router.replace("/admin/dashboard");
    }
  }, [mustRedirectToChangePassword, mustRedirectToDashboard, router]);

  // Cierra el drawer mobile al navegar a otra ruta del panel
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el formulario con las props/datos cargados
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

  // Redirigiendo (contraseña temporal pendiente o ruta solo para admin): no pintar nada
  if (mustRedirectToChangePassword || mustRedirectToDashboard) {
    return null;
  }

  // Cambio de contraseña: pantalla propia, sin el shell del panel
  if (isChangePasswordPage) {
    return <>{children}</>;
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
