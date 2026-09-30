"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { QrCode, Download, Copy, Check, Loader2, Settings2 } from "lucide-react";
import { useRestaurant } from "../../../../../hooks/use-restaurants";
import { useGenerateQR } from "../../../../../hooks/use-qr";
import { QRFormat } from "../../../../../types";
import { getErrorMessage } from "../../../../../lib/api-error";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export default function QRCodePage() {
  const params = useParams();
  const restaurantId = params.id as string;

  const { data: restaurant, isLoading } = useRestaurant(restaurantId);
  const generateMutation = useGenerateQR(restaurantId);

  const [withLogo, setWithLogo] = useState(true);
  const [foregroundColor, setForegroundColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [sizePx, setSizePx] = useState(1024);
  const [format, setFormat] = useState<QRFormat>("png");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !restaurant) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
      </div>
    );
  }

  const targetUrl = `${BASE_URL}/menu/${restaurant.slug}`;
  const currentFormat: QRFormat = restaurant.qr_url?.toLowerCase().endsWith(".svg") ? "svg" : "png";

  const handleGenerate = async () => {
    setError(null);
    try {
      await generateMutation.mutateAsync({
        format,
        with_logo: withLogo,
        foreground_color: foregroundColor,
        background_color: backgroundColor,
        size_px: sizePx,
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Error al generar el código QR"));
    }
  };

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Código QR</h2>
        <p className="mt-1 text-sm text-gray-400">
          Genera el código QR que lleva a la carta pública del restaurante
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* QR preview + actions */}
        <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
          <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-[#2D3147] bg-white">
            {restaurant.qr_url ? (
              <img
                src={restaurant.qr_url}
                alt={`QR de ${restaurant.name}`}
                className="h-full w-full object-contain p-4"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <QrCode className="h-12 w-12 text-gray-300" />
                <p className="text-sm text-gray-400">
                  Todavía no se ha generado un código QR
                </p>
              </div>
            )}
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium text-gray-400">URL codificada</p>
            <p className="mt-0.5 truncate rounded bg-[#0F1117] px-2 py-1.5 font-mono text-xs text-[#6366F1]">
              {targetUrl}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={restaurant.qr_url || undefined}
              download={`qr-${restaurant.slug}.${currentFormat}`}
              className={`inline-flex items-center gap-2 rounded-lg border border-[#2D3147] px-3 py-2 text-xs font-medium text-gray-300 transition ${
                restaurant.qr_url
                  ? "hover:bg-[#1F2234] hover:text-white"
                  : "pointer-events-none opacity-40"
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              Descargar {currentFormat.toUpperCase()}
            </a>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-2 rounded-lg border border-[#2D3147] px-3 py-2 text-xs font-medium text-gray-300 hover:bg-[#1F2234] hover:text-white transition"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "¡Copiado!" : "Copiar URL"}
            </button>
          </div>
        </div>

        {/* Customization panel */}
        <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-300">
            <Settings2 className="h-4 w-4 text-[#6366F1]" />
            Personalizar QR
          </div>

          <div className="space-y-4">
            <label
              className={`flex items-center gap-2 text-sm text-gray-300 ${
                restaurant.logo_url ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              }`}
            >
              <input
                type="checkbox"
                checked={withLogo && !!restaurant.logo_url}
                disabled={!restaurant.logo_url}
                onChange={(e) => setWithLogo(e.target.checked)}
                className="h-4 w-4 rounded border-[#2D3147] bg-[#0F1117] text-[#6366F1] focus:ring-[#6366F1]"
              />
              Incluir logo del restaurante
            </label>
            {!restaurant.logo_url && (
              <p className="-mt-2 text-xs text-gray-500">
                Sube un logo en la pestaña &quot;Info General&quot; para poder incluirlo en el QR
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400">Color QR</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-[#2D3147] bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                    maxLength={7}
                    className="block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-2 py-1.5 text-xs text-white font-mono focus:border-[#6366F1] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400">Fondo</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-[#2D3147] bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    maxLength={7}
                    className="block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-2 py-1.5 text-xs text-white font-mono focus:border-[#6366F1] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Tamaño</label>
                <select
                  value={sizePx}
                  onChange={(e) => setSizePx(Number(e.target.value))}
                  className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
                >
                  <option value={512}>512×512px</option>
                  <option value={1024}>1024×1024px</option>
                  <option value={2048}>2048×2048px</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Formato</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as QRFormat)}
                  className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
                >
                  <option value="png">PNG</option>
                  <option value="svg">SVG</option>
                </select>
              </div>
            </div>
            {format === "svg" && (
              <p className="text-xs text-gray-500">
                El formato SVG no incluye el logo (ideal para impresión en alta resolución)
              </p>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4F46E5] disabled:opacity-50 transition"
            >
              {generateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {restaurant.qr_url ? "Regenerar QR" : "Generar QR"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
