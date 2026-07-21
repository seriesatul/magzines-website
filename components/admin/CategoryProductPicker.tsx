"use client";

import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";

export type CategoryPickerProduct = {
  id: string;
  name: string;
  slug: string;
  categoryName: string | null;
};

type CategoryProductPickerProps = Readonly<{
  products: Array<CategoryPickerProduct>;
  defaultSelectedProductIds?: Array<string>;
  title: string;
}>;

export function CategoryProductPicker({
  products,
  defaultSelectedProductIds = [],
  title
}: CategoryProductPickerProps): React.ReactElement | null {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    () => new Set(defaultSelectedProductIds)
  );
  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) =>
      [product.name, product.slug, product.categoryName ?? ""].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [products, searchQuery]);

  if (products.length === 0) {
    return null;
  }

  function toggleProduct(productId: string, checked: boolean): void {
    setSelectedProductIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(productId);
      } else {
        next.delete(productId);
      }

      return next;
    });
  }

  return (
    <details className="border border-stone-200 bg-[#FAFAF8]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-[10px] font-bold uppercase tracking-widest text-stone-500 [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="text-stone-400">
          {selectedProductIds.size}/{products.length}
        </span>
      </summary>
      <div className="space-y-3 border-t border-stone-200 p-3">
        {Array.from(selectedProductIds).map((productId) => (
          <input key={productId} type="hidden" name="productId" value={productId} />
        ))}

        <label className="relative block">
          <span className="sr-only">Search products to add</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search listed products"
            className="h-10 w-full border border-stone-200 bg-white pl-9 pr-3 text-xs text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand"
          />
        </label>

        <div className="grid max-h-[280px] gap-2 overflow-y-auto sm:grid-cols-2">
          {filteredProducts.map((product) => (
            <label
              key={product.id}
              className="flex min-h-12 cursor-pointer items-start gap-3 border border-stone-200 bg-white p-3 text-xs text-stone-700 transition hover:border-brand"
            >
              <input
                type="checkbox"
                checked={selectedProductIds.has(product.id)}
                onChange={(event) => toggleProduct(product.id, event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand"
              />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-stone-900">
                  {product.name}
                </span>
                <span className="block truncate pt-1 font-mono text-[10px] text-stone-400">
                  {product.categoryName ?? "Unassigned"}
                </span>
              </span>
            </label>
          ))}
        </div>

        {filteredProducts.length === 0 ? (
          <p className="border border-dashed border-stone-300 bg-white p-4 text-xs text-stone-500">
            No products match that search.
          </p>
        ) : null}
      </div>
    </details>
  );
}
