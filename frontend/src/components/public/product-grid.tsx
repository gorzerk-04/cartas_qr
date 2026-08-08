import { PublicProduct } from "../../types";
import ProductCard from "./product-card";

export default function ProductGrid({
  products,
  onSelectProduct,
}: {
  products: PublicProduct[];
  onSelectProduct: (product: PublicProduct) => void;
}) {
  if (products.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-gray-400">
        No hay productos en esta categoría.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onSelect={() => onSelectProduct(product)} />
      ))}
    </div>
  );
}
