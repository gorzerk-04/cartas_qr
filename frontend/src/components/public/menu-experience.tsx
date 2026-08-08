"use client";

import { useMemo, useState } from "react";
import { PublicRestaurant, PublicProduct } from "../../types";
import CategoryTabs from "./category-tabs";
import ProductGrid from "./product-grid";
import ProductGridSkeleton from "./product-grid-skeleton";
import ProductDetailModal from "./product-detail-modal";

const CATEGORY_SWITCH_DELAY_MS = 200;

export default function MenuExperience({ restaurant }: { restaurant: PublicRestaurant }) {
  const categoriesWithProducts = useMemo(
    () => restaurant.categories.filter((c) => c.products.length > 0),
    [restaurant.categories]
  );

  const [activeId, setActiveId] = useState(categoriesWithProducts[0]?.id ?? "");
  const [isSwitching, setIsSwitching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null);

  const activeCategory = categoriesWithProducts.find((c) => c.id === activeId);

  const handleSelectCategory = (id: string) => {
    if (id === activeId) return;
    setIsSwitching(true);
    setActiveId(id);
    window.setTimeout(() => setIsSwitching(false), CATEGORY_SWITCH_DELAY_MS);
  };

  if (categoriesWithProducts.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-gray-400">
        Todavía no hay productos publicados en esta carta.
      </div>
    );
  }

  return (
    <div>
      <CategoryTabs
        categories={categoriesWithProducts}
        activeId={activeId}
        onSelect={handleSelectCategory}
      />
      <div className="mx-auto max-w-3xl px-4 py-5">
        {isSwitching || !activeCategory ? (
          <ProductGridSkeleton />
        ) : (
          <ProductGrid products={activeCategory.products} onSelectProduct={setSelectedProduct} />
        )}
      </div>
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          whatsapp={restaurant.whatsapp}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
