"use client";

import { PublicCategory } from "../../types";

export default function CategoryTabs({
  categories,
  activeId,
  onSelect,
}: {
  categories: PublicCategory[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-3">
        {categories.map((category) => {
          const isActive = activeId === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={isActive ? { backgroundColor: "var(--color-primary)" } : undefined}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
