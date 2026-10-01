import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicRestaurant } from "../../../services/public";
import RestaurantHeader from "../../../components/public/restaurant-header";
import MenuExperience from "../../../components/public/menu-experience";
import WhatsAppFloatingButton from "../../../components/public/whatsapp-floating-button";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getPublicRestaurant(slug);

  if (!restaurant) {
    return { title: "Carta no encontrada" };
  }

  const description = restaurant.description || `Carta digital de ${restaurant.name}`;
  const image = restaurant.cover_url || restaurant.logo_url;

  return {
    title: `${restaurant.name} - Carta Digital`,
    description,
    openGraph: {
      title: restaurant.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PublicMenuPage({ params }: Props) {
  const { slug } = await params;
  const restaurant = await getPublicRestaurant(slug);

  if (!restaurant) {
    notFound();
  }

  return (
    <>
      <RestaurantHeader restaurant={restaurant} />
      <MenuExperience restaurant={restaurant} />
      {restaurant.whatsapp && <WhatsAppFloatingButton whatsapp={restaurant.whatsapp} />}
    </>
  );
}
