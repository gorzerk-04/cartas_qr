import { MapPin } from "lucide-react";
import { PublicRestaurant } from "../../types";
import { getNextOpeningLabel } from "../../lib/schedule";
import MenuActions from "./menu-actions";

export default function RestaurantHeader({ restaurant }: { restaurant: PublicRestaurant }) {
  const closedLabel = !restaurant.is_open_now ? getNextOpeningLabel(restaurant.schedules) : null;

  return (
    <header className="relative">
      <div
        className="h-40 w-full bg-gray-200 sm:h-56"
        style={{
          backgroundImage: restaurant.cover_url ? `url(${restaurant.cover_url})` : undefined,
          backgroundColor: restaurant.cover_url ? undefined : "var(--color-primary)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="mx-auto max-w-3xl px-4">
        <div className="-mt-10 flex items-end gap-4 sm:-mt-14">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md sm:h-28 sm:w-28">
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
                {restaurant.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
          {restaurant.description && (
            <p className="mt-1 text-sm text-gray-600">{restaurant.description}</p>
          )}
          {(restaurant.address || restaurant.city) && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin className="h-4 w-4 shrink-0" />
              {[restaurant.address, restaurant.city].filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        <MenuActions loyalty={restaurant.loyalty} reviewUrl={restaurant.review_url} />

        {!restaurant.is_open_now && (
          <div className="mb-4 rounded-lg bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
            Cerrado ahora{closedLabel ? ` — ${closedLabel}` : ""}
          </div>
        )}
      </div>
    </header>
  );
}
