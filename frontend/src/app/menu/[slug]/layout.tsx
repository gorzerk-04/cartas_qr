import { getPublicRestaurant } from "../../../services/public";

export default async function MenuLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getPublicRestaurant(slug);

  // Colores de marca del restaurante como CSS custom properties — el resto de
  // /menu se aparta del tema oscuro del panel admin (heredado del layout raíz).
  const cssVars = restaurant
    ? ({
        "--color-primary": restaurant.primary_color,
        "--color-secondary": restaurant.secondary_color,
        "--color-accent": restaurant.accent_color,
      } as React.CSSProperties)
    : undefined;

  return (
    <div style={cssVars} className="min-h-screen bg-white text-gray-900">
      {children}
    </div>
  );
}
