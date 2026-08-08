"use client";

import React, { useMemo, useState } from "react";
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
  FolderOpen,
} from "lucide-react";
import { useCategories, useDeleteCategory, useReorderCategories } from "../../../../../hooks/use-categories";
import { Category } from "../../../../../types";
import CategoryFormSheet from "../../../../../components/admin/category-form-sheet";
import ConfirmDialog from "../../../../../components/admin/confirm-dialog";
import { useEscapeKey } from "../../../../../hooks/use-escape-key";

function SortableCategoryRow({
  category,
  onEdit,
  onDelete,
  openMenu,
  setOpenMenu,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
  openMenu: string | null;
  setOpenMenu: (id: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  const isMenuOpen = openMenu === category.id;
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
      className="flex items-center gap-3 border-b border-[#2D3147] bg-[#1A1D27] px-4 py-3 last:border-b-0"
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Arrastrar para reordenar ${category.name}`}
        className="cursor-grab text-gray-500 hover:text-gray-300 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0F1117]">
        {category.image_url ? (
          <img src={category.image_url} alt={category.name} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-4 w-4 text-gray-600" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-white">{category.name}</p>
        <p className="text-xs text-gray-500">
          {category.product_count} {category.product_count === 1 ? "producto" : "productos"}
        </p>
      </div>

      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
          category.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${category.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
        {category.is_active ? "Activa" : "Inactiva"}
      </span>

      <div className="relative">
        <button
          onClick={() => setOpenMenu(isMenuOpen ? null : category.id)}
          aria-label={`Acciones para ${category.name}`}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          className="rounded-md p-1 text-gray-400 hover:bg-[#2D3147] hover:text-white transition"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpenMenu(null)} />
            <div role="menu" className="absolute right-0 z-30 mt-1 w-48 rounded-lg border border-[#2D3147] bg-[#1A1D27] py-1 shadow-xl">
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
              <button
                role="menuitem"
                onClick={() => {
                  if (category.product_count > 0) return;
                  onDelete();
                  setOpenMenu(null);
                }}
                disabled={category.product_count > 0}
                title={
                  category.product_count > 0
                    ? "No se puede eliminar: tiene productos asociados"
                    : undefined
                }
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const params = useParams();
  const restaurantId = params.id as string;

  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { data: categories, isLoading, error } = useCategories(restaurantId);
  const deleteMutation = useDeleteCategory(restaurantId);
  const reorderMutation = useReorderCategories(restaurantId);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtered = useMemo(() => {
    if (!categories) return [];
    if (!search) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [categories, search]);

  const canReorder = !search;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !categories) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);

    reorderMutation.mutate(
      reordered.map((c, index) => ({ id: c.id, display_order: index }))
    );
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (err) {
      // Error surfaced via mutation state; keep the modal open would need more state,
      // for now just close it since the block case is prevented in the UI already.
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Categorías</h2>
          <p className="mt-1 text-sm text-gray-400">Organiza el menú en categorías y arrastra para ordenarlas</p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setSheetOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4F46E5] transition"
        >
          <Plus className="h-4 w-4" />
          Nueva Categoría
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar categoría..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-[#2D3147] bg-[#1A1D27] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
        />
      </div>
      {!canReorder && (
        <p className="text-xs text-gray-500">Limpia la búsqueda para poder reordenar arrastrando.</p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-400">
          Error al cargar las categorías. Intenta de nuevo.
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#2D3147] bg-[#1A1D27] py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6366F1]/10">
            <FolderOpen className="h-8 w-8 text-[#6366F1]" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            {search ? "Sin resultados" : "No hay categorías todavía"}
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            {search ? `No se encontraron categorías para "${search}"` : "Comienza creando tu primera categoría"}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#2D3147] [&>*:first-child]:rounded-t-xl [&>*:last-child]:rounded-b-xl">
          {canReorder ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filtered.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                {filtered.map((category) => (
                  <SortableCategoryRow
                    key={category.id}
                    category={category}
                    onEdit={() => {
                      setEditingCategory(category);
                      setSheetOpen(true);
                    }}
                    onDelete={() => setDeleteConfirm(category)}
                    openMenu={openMenu}
                    setOpenMenu={setOpenMenu}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            filtered.map((category) => (
              <SortableCategoryRow
                key={category.id}
                category={category}
                onEdit={() => {
                  setEditingCategory(category);
                  setSheetOpen(true);
                }}
                onDelete={() => setDeleteConfirm(category)}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
              />
            ))
          )}
        </div>
      )}

      <CategoryFormSheet
        restaurantId={restaurantId}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        category={editingCategory}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="¿Eliminar categoría?"
        description={`Esta acción no se puede deshacer. La categoría "${deleteConfirm?.name}" dejará de estar disponible.`}
        isConfirming={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
