"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon, Loader2, RefreshCw } from "lucide-react";
import { getErrorMessage } from "../../lib/api-error";

interface ImageUploaderProps {
  label: string;
  currentImageUrl?: string | null;
  aspectRatio?: "square" | "cover";
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  helpText?: string;
}

export default function ImageUploader({
  label,
  currentImageUrl,
  aspectRatio = "square",
  onUpload,
  isUploading,
  helpText = "PNG, JPG, WEBP hasta 5MB",
}: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    // Client-side validation
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen (PNG, JPG, WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("El tamaño de la imagen no puede exceder 5 MB.");
      return;
    }

    try {
      await onUpload(file);
    } catch (err: any) {
      setError(getErrorMessage(err, "Error al subir la imagen. Intenta de nuevo."));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        {label}
      </label>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-400">
          {error}
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        aria-label={`${label}: haz clic o arrastra una imagen para subirla`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all ${
          aspectRatio === "square" ? "h-32 w-32" : "h-40 w-full"
        } ${
          dragActive
            ? "border-[#6366F1] bg-[#6366F1]/10"
            : "border-[#2D3147] bg-[#0F1117] hover:border-[#3D4167] hover:bg-[#1A1D27]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#6366F1]" />
            <span className="text-xs text-gray-400">Subiendo...</span>
          </div>
        ) : currentImageUrl ? (
          <>
            <img
              src={currentImageUrl}
              alt={label}
              className="h-full w-full object-cover"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
              <RefreshCw className="h-5 w-5 text-white" />
              <span className="mt-1 text-xs font-medium text-white">
                Cambiar
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A1D27] text-gray-400 group-hover:text-[#6366F1]">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-gray-300">
                Haz clic o arrastra la imagen
              </p>
              <p className="text-[10px] text-gray-500">{helpText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
