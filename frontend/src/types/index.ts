export interface UserLogin {
  username: string;
  password: string;
}

export type UserRole = "platform_admin" | "restaurant_owner";

export interface RestaurantSummary {
  id: string;
  name: string;
  slug: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  is_superadmin: boolean;
  role: UserRole;
  must_change_password: boolean;
  // Solo viene en /auth/me. Para el admin es [] (ve todo).
  restaurants?: RestaurantSummary[] | null;
  last_login_at?: string;
  created_at: string;
}

// Usuario tal como lo devuelve la API de gestión (/admin/users)
export interface ManagedUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at?: string | null;
  created_at: string;
  restaurants: RestaurantSummary[];
}

// Respuesta de alta y reseteo: la contraseña temporal se muestra UNA sola vez
export interface ManagedUserWithTempPassword extends ManagedUser {
  temp_password: string;
}

export interface UserCreateInput {
  email: string;
  username: string;
  role: UserRole;
  restaurant_ids: string[];
}

export interface UserUpdateInput {
  is_active?: boolean;
  role?: UserRole;
  email?: string;
  username?: string;
}

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
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

export type RestaurantUpdate = Partial<RestaurantCreate>;

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

export type CategoryUpdate = Partial<CategoryCreate>;

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

export type ProductUpdate = Partial<ProductCreate>;

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
  customers_total: number;
  loyalty_visits_month: number;
  loyalty_redemptions_month: number;
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
  // Solo viene si el programa de fidelización está activo. Nunca incluye datos de comensales.
  loyalty?: PublicLoyalty | null;
}

export interface PublicLoyalty {
  visits_required: number;
  reward_description: string;
}

// ---------------------------------------------------------------- fidelización
export interface LoyaltyProgram {
  id: string;
  restaurant_id: string;
  is_active: boolean;
  visits_required: number;
  reward_description: string;
  reward_product_id?: string | null;
  min_hours_between_visits: number;
  visits_expire_after_days?: number | null;
  consent_text: string;
  consent_version: number;
  updated_at: string;
}

export interface LoyaltyProgramInput {
  is_active: boolean;
  visits_required: number;
  reward_description: string;
  reward_product_id?: string | null;
  min_hours_between_visits: number;
  visits_expire_after_days?: number | null;
  consent_text?: string | null;
}

export interface Customer {
  id: string;
  restaurant_id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  consent_given_at: string;
  consent_version: number;
  created_at: string;
  visits_balance: number;
  last_visit_at?: string | null;
  visits_required?: number | null;
  reward_available: boolean;
}

export interface CustomerUpdateInput {
  full_name?: string;
  phone?: string;
  email?: string | null;
  notes?: string | null;
}

export type VisitStatus = "valid" | "redeemed" | "voided" | "expired";

export interface LoyaltyVisit {
  id: string;
  customer_id: string;
  visited_at: string;
  registered_by_user_id?: string | null;
  registered_by_username?: string | null;
  redemption_id?: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
  status: VisitStatus;
}

export interface LoyaltyRedemption {
  id: string;
  customer_id: string;
  redeemed_at: string;
  redeemed_by_user_id?: string | null;
  visits_consumed: number;
  reward_description_snapshot: string;
  reward_product_id_snapshot?: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
}

export interface CheckInInput {
  phone: string;
  full_name?: string;
  consent?: boolean;
}

export interface CheckInResult {
  customer: Customer;
  visit: LoyaltyVisit;
  balance: number;
  visits_required: number;
  reward_available: boolean;
  customer_created: boolean;
}
