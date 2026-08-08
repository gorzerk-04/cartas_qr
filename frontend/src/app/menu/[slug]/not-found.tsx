import Link from "next/link";

export default function MenuNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-5xl">🍽️</p>
      <h1 className="text-2xl font-bold text-gray-900">Carta no encontrada</h1>
      <p className="max-w-sm text-sm text-gray-500">
        Este restaurante no existe o todavía no publicó su carta digital.
      </p>
      <Link href="/" className="mt-2 text-sm font-medium text-[#6366F1] hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
