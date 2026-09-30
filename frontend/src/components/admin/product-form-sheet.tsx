"use client";

import React, { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import Sheet from "./sheet";
import ImageUploader from "./image-uploader";
import { useCategories } from "../../hooks/use-categories";
import {
  useCreateProduct,
  useUpdateProduct,
  useUploadProductImage,
} from "../../hooks/use-products";
import { Product, ProductCreate, ProductStatus } from "../../types";
import { getErrorMessage } from "../../lib/api-error";

interface ProductFormSheetProps {
  restaurantId: string;
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  defaultCategoryId?: string;
}

interface FormState {
  name: string;
  description: string;
  price: string;
  original_price: string;
  category_id: string;
  status: ProductStatus;
  tags: string[];
  allergens: string[];
  is_featured: boolean;
}

function emptyForm(defaultCategoryId?: string): FormState {
  return {
    name: "",
    description: "",
    price: "",
    original_price: "",
    category_id: defaultCategoryId || "",
    status: "available",
    tags: [],
    allergens: [],
    is_featured: false,
  };
}

function formFromProduct(product: Product): FormState {
  return {
    name: product.name,
    description: product.description || "",
    price: product.price,
    original_price: product.original_price || "",
    category_id: product.category_id,
    status: product.status,
    tags: product.tags,
    allergens: product.allergens,
    is_featured: product.is_featured,
  };
}

function ChipInput({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const addChip = () => {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setDraft("");
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      <div className="mt-1 flex flex-wrap gap-1.5 rounded-lg border border-[#2D3147] bg-[#0F1117] p-2">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-full bg-[#6366F1]/10 px-2 py-0.5 text-xs text-[#818CF8]"
          >
            {value}
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== value))}
              aria-label={`Quitar ${value}`}
              className="hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addChip();
            }
          }}
          onBlur={addChip}
          placeholder="Enter para añadir"
          className="min-w-[100px] flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
        />
      </div>
    </div>
  );
}

export default function ProductFormSheet({
  restaurantId,
  isOpen,
  onClose,
  product,
  defaultCategoryId,
}: ProductFormSheetProps) {
  const { data: categories } = useCategories(restaurantId);
  const [form, setForm] = useState<FormState>(emptyForm(defaultCategoryId));
  const [initialForm, setInitialForm] = useState<FormState>(emptyForm(defaultCategoryId));
  const [error, setError] = useState<string | null>(null);
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);

  const createMutation = useCreateProduct(restaurantId);
  const updateMutation = useUpdateProduct(restaurantId);
  const uploadImageMutation = useUploadProductImage(restaurantId);

  const isEditing = !!product;
  const activeProduct = createdProduct ?? product ?? null;

  useEffect(() => {
    if (isOpen) {
      const initial = product ? formFromProduct(product) : emptyForm(defaultCategoryId);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el formulario con las props/datos cargados
      setForm(initial);
      setInitialForm(initial);
      setCreatedProduct(null);
      setError(null);
    }
  }, [isOpen, product, defaultCategoryId]);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const discountPercent =
    form.original_price && form.price && parseFloat(form.original_price) > parseFloat(form.price)
      ? Math.round((1 - parseFloat(form.price) / parseFloat(form.original_price)) * 100)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: ProductCreate = {
      name: form.name,
      description: form.description || undefined,
      price: parseFloat(form.price),
      original_price: form.original_price ? parseFloat(form.original_price) : undefined,
      category_id: form.category_id,
      status: form.status,
      tags: form.tags,
      allergens: form.allergens,
      is_featured: form.is_featured,
    };

    try {
      if (isEditing && product) {
        await updateMutation.mutateAsync({ id: product.id, data: payload });
        onClose();
      } else {
        const created = await createMutation.mutateAsync(payload);
        setCreatedProduct(created);
        setInitialForm(form);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Error al guardar el producto"));
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSubmit = form.name && form.price && form.category_id && (isDirty || !isEditing);

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Producto" : "Nuevo Producto"}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#2D3147] px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#1F2234] transition"
          >
            {createdProduct ? "Cerrar" : "Cancelar"}
          </button>
          {!createdProduct && (
            <button
              type="submit"
              form="product-form"
              disabled={isPending || !canSubmit}
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

      <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">Nombre *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Categoría *</label>
          <select
            required
            value={form.category_id}
            onChange={(e) => updateField("category_id", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
          >
            <option value="">Selecciona una categoría</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300">Precio *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={form.price}
              onChange={(e) => updateField("price", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Oferta {discountPercent !== null && <span className="text-emerald-400">(-{discountPercent}%)</span>}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.original_price}
              onChange={(e) => updateField("original_price", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Descripción</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none resize-none"
          />
        </div>

        <ChipInput label="Tags" values={form.tags} onChange={(v) => updateField("tags", v)} />
        <ChipInput label="Alérgenos" values={form.allergens} onChange={(v) => updateField("allergens", v)} />

        <div>
          <label className="block text-sm font-medium text-gray-300">Estado</label>
          <select
            value={form.status}
            onChange={(e) => updateField("status", e.target.value as ProductStatus)}
            className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
          >
            <option value="available">Disponible</option>
            <option value="unavailable">Sin stock</option>
            <option value="hidden">Oculto</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) => updateField("is_featured", e.target.checked)}
            className="h-4 w-4 rounded border-[#2D3147] bg-[#0F1117] text-[#6366F1] focus:ring-[#6366F1]"
          />
          Destacado en la carta
        </label>
      </form>

      {activeProduct && (
        <div className="mt-6 border-t border-[#2D3147] pt-6">
          <ImageUploader
            label="Imagen del plato"
            currentImageUrl={activeProduct.image_url}
            aspectRatio="square"
            onUpload={async (file) => {
              await uploadImageMutation.mutateAsync({ id: activeProduct.id, file });
            }}
            isUploading={uploadImageMutation.isPending}
          />
        </div>
      )}
    </Sheet>
  );
}
