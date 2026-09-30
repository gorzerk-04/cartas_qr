import { User } from "../types";

// Refleja la matriz de permisos del backend (la seguridad real vive allí: esto solo
// decide qué botones y pantallas se muestran).
export type Action =
  | "createRestaurant"
  | "deleteRestaurant"
  | "editSlug"
  | "toggleActive"
  | "manageUsers";

export function isPlatformAdmin(user: User | null | undefined): boolean {
  return user?.role === "platform_admin";
}

export function can(user: User | null | undefined, action: Action): boolean {
  switch (action) {
    case "createRestaurant":
    case "deleteRestaurant":
    case "toggleActive":
    case "manageUsers":
      return isPlatformAdmin(user);
    case "editSlug":
      // El slug es inmutable para todos: cambiarlo rompería los QR ya impresos
      return false;
  }
}

// A dónde va el usuario tras iniciar sesión o cambiar su contraseña
export function landingPath(user: User | null | undefined): string {
  if (!user) return "/admin/login";
  if (user.must_change_password) return "/admin/change-password";
  if (!isPlatformAdmin(user) && user.restaurants?.length === 1) {
    return `/admin/restaurants/${user.restaurants[0].id}`;
  }
  return "/admin/dashboard";
}
