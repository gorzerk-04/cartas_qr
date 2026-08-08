"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Search,
  GripVertical,
  MoreVertical,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Loader2,
  UtensilsCrossed,
} from "lucide-react";
import { useCategories } from "../../../../../hooks/use-categories";
import {
  useProducts,
  useDeleteProduct,
  useReorderProducts,
  useUpdateProductStatus,
} from "../../../../../hooks/use-products";
import { Product, ProductStatus } from "../../../../../types";
import ProductFormSheet from "../../../../../components/admin/product-form-sheet";
import ConfirmDialog from "../../../../../components/admin/confirm-dialog";
import { useEscapeKey } from "../../../../../hooks/use-escape-key";

const STATUS_LABELS: Record<ProductStatus, string> = {
  available: "Disponible",
  unavailable: "Sin stock",
  hidden: "Oculto",
};

const STATUS_STYLES: Record<ProductStatus, string> = {
  available: "bg-emerald-500/10 text-emerald-400",
  unavailable: "bg-amber-500/10 text-amber-400",
  hidden: "bg-gray-500/10 text-gray-400",
};

function SortableProductRow({
  product,
  categoryName,
  onEdit,
  onDelete,
  onChangeStatus,
  openMenu,
  setOpenMenu,
  draggable,
}: {
  product: Product;
  categoryName: string;
  onEdit: () => void;
  onDelete: () => void;
  onChangeStatus: (status: ProductStatus) => void;
  openMenu: string | null;
  setOpenMenu: (id: string | null) => void;
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.id,
    disabled: !draggable,
  });
  const isMenuOpen = openMenu === product.id;
  useEscapeKey(() => setOpenMenu(null), isMenuOpen);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-wrap items-center gap-3 border-b border-[#2D3147] bg-[#1A1D27] px-4 py-3 last:border-b-0"
    >
      <button
        {...attributes}
        {...listeners}
        disabled={!draggable}
        aria-label={`Arrastrar para reordenar ${product.name}`}
        className="cursor-grab text-gray-500 hover:text-gray-300 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0F1117]">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-4 w-4 text-gray-600" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-white">{product.name}</p>
        <span className="inline-block rounded bg-[#0F1117] px-1.5 py-0.5 text-xs text-gray-400">
          {categoryName}
        </span>
      </div>

      {/* Precio/estado/acciones: en mobile bajan a su propia línea (evita comprimir el
          nombre del producto a solo unas letras); desde sm comparten fila con lo de arriba */}
      <div className="flex w-full items-center justify-between gap-3 pl-[52px] sm:w-auto sm:justify-end sm:pl-0">
      <div className="text-right">
        {product.original_price && (
          <p className="text-xs text-gray-500 line-through">S/ {product.original_price}</p>
        )}
        <p className="font-medium text-white">S/ {product.price}</p>
      </div>

      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[product.status]}`}
      >
        {STATUS_LABELS[product.status]}
      </span>

      <div className="relative">
        <button
          onClick={() => setOpenMenu(isMenuOpen ? null : product.id)}
          aria-label={`Acciones para ${product.name}`}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          className="rounded-md p-1 text-gray-400 hover:bg-[#2D3147] hover:text-white transition"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpenMenu(null)} />
            <div role="menu" className="absolute right-0 z-30 mt-1 w-52 rounded-lg border border-[#2D3147] bg-[#1A1D27] py-1 shadow-xl">
              <button
                role="menuitem"
                onClick={() => {
                  onEdit();
                  setOpenMenu(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#1F2234] hover:text-white"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
              <div className="px-3 py-1 text-xs uppercase tracking-wider text-gray-500">Cambiar estado</div>
              {(Object.keys(STATUS_LABELS) as ProductStatus[]).map((status) => (
                <button
                  key={status}
                  role="menuitem"
                  onClick={() => {
                    onChangeStatus(status);
                    setOpenMenu(null);
                  }}
                  disabled={status === product.status}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#1F2234] hover:text-white disabled:opacity-40"
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
              <button
                role="menuitem"
                onClick={() => {
                  onDelete();
                  setOpenMenu(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const params = useParams();
  const restaurantId = params.id as string;

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "">("");
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data: categories } = useCategories(restaurantId);
  const { data, isLoading, error } = useProducts(restaurantId, {
    page,
    limit: 20,
    search: search || undefined,
    category_id: categoryFilter || undefined,
    status: statusFilter || undefined,
  });
  const deleteMutation = useDeleteProduct(restaurantId);
  const reorderMutation = useReorderProducts(restaurantId);
  const statusMutation = useUpdateProductStatus(restaurantId);

  const products = data?.data || [];
  const meta = data?.meta;

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories?.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const filtersActive = !!search || !!categoryFilter || !!statusFilter || page !== 1;
  const canReorder = !filtersActive;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(products, oldIndex, newIndex);

    reorderMutation.mutate(reordered.map((p, index) => ({ id: p.id, display_order: index })));
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Productos</h2>
          <p className="mt-1 text-sm text-gray-400">Gestiona los platos y bebidas de la carta</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setSheetOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4F46E5] transition"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-[#2D3147] bg-[#1A1D27] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-[#2D3147] bg-[#1A1D27] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
        >
          <option value="">Todas las categorías</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as ProductStatus | "");
            setPage(1);
          }}
          className="rounded-lg border border-[#2D3147] bg-[#1A1D27] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="available">Disponible</option>
          <option value="unavailable">Sin stock</option>
          <option value="hidden">Oculto</option>
        </select>
      </div>
      {!canReorder && (
        <p className="text-xs text-gray-500">Quita los filtros y vuelve a la página 1 para poder reordenar.</p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-400">
          Error al cargar los productos. Intenta de nuevo.
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#2D3147] bg-[#1A1D27] py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6366F1]/10">
            <UtensilsCrossed className="h-8 w-8 text-[#6366F1]" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            {filtersActive ? "Sin resultados" : "No hay productos todavía"}
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            {filtersActive ? "Ajusta los filtros de búsqueda" : "Comienza creando tu primer producto"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-[#2D3147] [&>*:first-child]:rounded-t-xl [&>*:last-child]:rounded-b-xl">
            {canReorder ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={products.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                  {products.map((product) => (
                    <SortableProductRow
                      key={product.id}
                      product={product}
                      categoryName={categoryNameById.get(product.category_id) || "—"}
                      draggable
                      onEdit={() => {
                        setEditingProduct(product);
                        setSheetOpen(true);
                      }}
                      onDelete={() => setDeleteConfirm(product)}
                      onChangeStatus={(status) => statusMutation.mutate({ id: product.id, status })}
                      openMenu={openMenu}
                      setOpenMenu={setOpenMenu}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              products.map((product) => (
                <SortableProductRow
                  key={product.id}
                  product={product}
                  categoryName={categoryNameById.get(product.category_id) || "—"}
                  draggable={false}
                  onEdit={() => {
                    setEditingProduct(product);
                    setSheetOpen(true);
                  }}
                  onDelete={() => setDeleteConfirm(product)}
                  onChangeStatus={(status) => statusMutation.mutate({ id: product.id, status })}
                  openMenu={openMenu}
                  setOpenMenu={setOpenMenu}
                />
              ))
            )}
          </div>

          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Mostrando {products.length} de {meta.total} productos
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!meta.has_prev}
                  className="rounded-lg border border-[#2D3147] px-3 py-1.5 text-sm text-gray-400 hover:bg-[#1F2234] disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Anterior
                </button>
                <span className="flex items-center px-3 text-sm text-gray-400">
                  {page} / {meta.total_pages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!meta.has_next}
                  className="rounded-lg border border-[#2D3147] px-3 py-1.5 text-sm text-gray-400 hover:bg-[#1F2234] disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ProductFormSheet
        restaurantId={restaurantId}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        product={editingProduct}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="¿Eliminar producto?"
        description={`Esta acción no se puede deshacer. El producto "${deleteConfirm?.name}" dejará de estar disponible.`}
        isConfirming={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
