"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Sheet from "./sheet";
import ImageUploader from "./image-uploader";
import {
  useCreateCategory,
  useUpdateCategory,
  useUploadCategoryImage,
} from "../../hooks/use-categories";
import { Category, CategoryCreate } from "../../types";
import { getErrorMessage } from "../../lib/api-error";

interface CategoryFormSheetProps {
  restaurantId: string;
  isOpen: boolean;
  onClose: () => void;
  category?: Category | null;
}

const emptyForm: CategoryCreate = {
  name: "",
  description: "",
  is_active: true,
};

export default function CategoryFormSheet({
  restaurantId,
  isOpen,
  onClose,
  category,
}: CategoryFormSheetProps) {
  const [form, setForm] = useState<CategoryCreate>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [createdCategory, setCreatedCategory] = useState<Category | null>(null);

  const createMutation = useCreateCategory(restaurantId);
  const updateMutation = useUpdateCategory(restaurantId);
  const uploadImageMutation = useUploadCategoryImage(restaurantId);

  const isEditing = !!category;
  const activeCategory = createdCategory ?? category ?? null;

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el formulario con las props/datos cargados
      setForm(
        category
          ? { name: category.name, description: category.description || "", is_active: category.is_active }
          : emptyForm
      );
      setCreatedCategory(null);
      setError(null);
    }
  }, [isOpen, category]);

  const updateField = (field: keyof CategoryCreate, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isEditing && category) {
        await updateMutation.mutateAsync({ id: category.id, data: form });
        onClose();
      } else {
        const created = await createMutation.mutateAsync(form);
        setCreatedCategory(created);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Error al guardar la categoría"));
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Categoría" : "Nueva Categoría"}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#2D3147] px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#1F2234] transition"
          >
            {createdCategory ? "Cerrar" : "Cancelar"}
          </button>
          {!createdCategory && (
            <button
              type="submit"
              form="category-form"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F46E5] disabled:opacity-50 transition"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </button>
          )}
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">Nombre</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Descripción</label>
          <textarea
            rows={3}
            value={form.description || ""}
            onChange={(e) => updateField("description", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none resize-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => updateField("is_active", e.target.checked)}
            className="h-4 w-4 rounded border-[#2D3147] bg-[#0F1117] text-[#6366F1] focus:ring-[#6366F1]"
          />
          Categoría activa
        </label>
      </form>

      {activeCategory && (
        <div className="mt-6 border-t border-[#2D3147] pt-6">
          <ImageUploader
            label="Imagen de la categoría"
            currentImageUrl={activeCategory.image_url}
            aspectRatio="square"
            onUpload={async (file) => {
              await uploadImageMutation.mutateAsync({ id: activeCategory.id, file });
            }}
            isUploading={uploadImageMutation.isPending}
          />
        </div>
      )}
    </Sheet>
  );
}
