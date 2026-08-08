export interface UserLogin {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  is_superadmin: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  logo_cloudinary_id?: string;
  cover_url?: string;
  cover_cloudinary_id?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  is_published: boolean;
  qr_url?: string;
  qr_cloudinary_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface RestaurantCreate {
  name: string;
  slug: string;
  description?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
  is_published?: boolean;
}

export interface RestaurantUpdate extends Partial<RestaurantCreate> {}

export interface OperatingHour {
  id: string;
  restaurant_id: string;
  day_of_week: number; // 0=Lunes ... 6=Domingo
  open_time?: string | null; // "HH:MM"
  close_time?: string | null; // "HH:MM"
  is_closed: boolean;
}

export interface OperatingHourInput {
  day_of_week: number;
  open_time?: string | null;
  close_time?: string | null;
  is_closed: boolean;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  image_url?: string;
  display_order: number;
  is_active: boolean;
  product_count: number;
}

export interface CategoryCreate {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface CategoryUpdate extends Partial<CategoryCreate> {}

export type ProductStatus = "available" | "unavailable" | "hidden";

export interface Product {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: string;
  original_price?: string;
  image_url?: string;
  status: ProductStatus;
  tags: string[];
  allergens: string[];
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductCreate {
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  category_id: string;
  status?: ProductStatus;
  tags?: string[];
  allergens?: string[];
  is_featured?: boolean;
}

export interface ProductUpdate extends Partial<ProductCreate> {}

export type SocialPlatform =
  | "instagram"
  | "facebook"
  | "twitter"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "tripadvisor"
  | "google_maps";

export interface RestaurantSocial {
  id: string;
  restaurant_id: string;
  platform: SocialPlatform;
  url: string;
  display_order: number;
}

export interface RestaurantSocialCreate {
  platform: SocialPlatform;
  url: string;
}

export interface RestaurantSocialUpdate {
  url?: string;
}

export type QRFormat = "png" | "svg";

export interface QRGenerateOptions {
  format?: QRFormat;
  with_logo?: boolean;
  foreground_color?: string;
  background_color?: string;
  size_px?: number;
}

export interface AdminStats {
  total_restaurants: number;
  published_restaurants: number;
  qr_generated_count: number;
}

export interface PublicSchedule {
  day_of_week: number; // 0=Lunes ... 6=Domingo
  open_time?: string | null;
  close_time?: string | null;
  is_closed: boolean;
}

export interface PublicSocial {
  platform: SocialPlatform;
  url: string;
}

export interface PublicProduct {
  id: string;
  name: string;
  description?: string;
  price: string;
  original_price?: string;
  image_url?: string;
  status: ProductStatus;
  is_featured: boolean;
  tags: string[];
  allergens: string[];
}

export interface PublicCategory {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  display_order: number;
  products: PublicProduct[];
}

export interface PublicRestaurant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  cover_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  country: string;
  is_open_now: boolean;
  schedules: PublicSchedule[];
  socials: PublicSocial[];
  categories: PublicCategory[];
}
