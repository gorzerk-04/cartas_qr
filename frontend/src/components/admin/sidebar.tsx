"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  QrCode,
  Users,
  LogOut,
  ChevronLeft,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/use-auth";
import { useEscapeKey } from "../../hooks/use-escape-key";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Restaurantes",
    href: "/admin/restaurants",
    icon: UtensilsCrossed,
  },
  {
    label: "Códigos QR",
    href: "/admin/qr",
    icon: QrCode,
  },
  {
    label: "Usuarios",
    href: "/admin/users",
    icon: Users,
    adminOnly: true,
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ isCollapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { logout, isLoggingOut, user, isPlatformAdmin } = useAuth();
  const visibleItems = navItems.filter((item) => !item.adminOnly || isPlatformAdmin);

  useEscapeKey(onMobileClose, mobileOpen);

  // Las etiquetas de texto siempre se renderizan (necesarias en el drawer mobile,
  // que nunca está "colapsado"); `lg:hidden` las oculta solo en el sidebar de escritorio
  // colapsado, sin afectar el drawer mobile en viewports angostos.
  const labelClass = isCollapsed ? "lg:hidden" : "";

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-[#2D3147] bg-[#13151E] transition-transform duration-300 lg:transition-[width] lg:duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${isCollapsed ? "lg:w-[68px]" : "lg:w-[240px]"}`}
      >
        {/* Logo / Brand */}
        <div className="flex h-16 items-center justify-between border-b border-[#2D3147] px-4">
          <span className={`text-lg font-bold tracking-tight text-white ${labelClass}`}>
            Menu<span className="text-[#6366F1]">QR</span>
          </span>
          {/* Colapsar/expandir: solo escritorio, el drawer mobile se cierra con el botón X */}
          <button
            onClick={onToggle}
            className="hidden h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-[#1F2234] hover:text-white transition-colors lg:flex"
            aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {isCollapsed ? (
              <Menu className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={onMobileClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-[#1F2234] hover:text-white transition-colors lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#6366F1]/10 text-[#6366F1]"
                    : "text-gray-400 hover:bg-[#1F2234] hover:text-white"
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive ? "text-[#6366F1]" : "text-gray-500 group-hover:text-white"
                  }`}
                />
                <span className={labelClass}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="border-t border-[#2D3147] p-3">
          {user && (
            <div className={`mb-2 rounded-lg bg-[#1F2234] px-3 py-2 ${labelClass}`}>
              <p className="text-xs font-medium text-gray-300 truncate">
                {user.username}
              </p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[#6366F1]">
                {isPlatformAdmin ? "Administrador" : "Dueño"}
              </p>
            </div>
          )}
          <button
            onClick={() => logout()}
            disabled={isLoggingOut}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all ${
              isCollapsed ? "lg:justify-center" : ""
            }`}
            title={isCollapsed ? "Cerrar sesión" : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className={labelClass}>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
