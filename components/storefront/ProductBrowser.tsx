"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/storefront/ProductCard";
import type { StorefrontCategory, StorefrontProduct } from "@/lib/products";

type ProductBrowserProps = Readonly<{
  products: Array<StorefrontProduct>;
  categories?: Array<StorefrontCategory>;
  productsPerPage?: number;
}>;

type ProductCategoryOption = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

const DEFAULT_PRODUCTS_PER_PAGE = 20;

export function ProductBrowser({
  products,
  categories = [],
  productsPerPage = DEFAULT_PRODUCTS_PER_PAGE
}: ProductBrowserProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const categoryOptions = useMemo(
    () => (categories.length > 0 ? categories : getProductCategoryOptions(products)),
    [categories, products]
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        selectedCategoryId === "all" || product.categoryId === selectedCategoryId;

      if (!matchesCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        product.name,
        product.slug,
        product.category?.name ?? "",
        product.category?.slug ?? ""
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [products, searchQuery, selectedCategoryId]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / productsPerPage));
  const visibleProducts = useMemo(() => {
    const start = (currentPage - 1) * productsPerPage;
    return filteredProducts.slice(start, start + productsPerPage);
  }, [currentPage, filteredProducts, productsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategoryId, products]);

  return (
    <div className="space-y-8">
      <div className="grid gap-3 border-y border-stone-200 py-4 md:grid-cols-[minmax(0,1fr)_280px_auto] md:items-center">
        <label className="relative block">
          <span className="sr-only">Search products or categories</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search products or categories"
            className="h-12 w-full border border-stone-200 bg-white pl-11 pr-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand"
          />
        </label>

        <label className="block">
          <span className="sr-only">Filter by category</span>
          <select
            value={selectedCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            className="h-12 w-full border border-stone-200 bg-white px-4 text-sm font-medium text-stone-900 outline-none transition focus:border-brand"
          >
            <option value="all">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 md:text-right">
          {filteredProducts.length} {filteredProducts.length === 1 ? "Product" : "Products"}
        </p>
      </div>

      {visibleProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="border border-stone-200 bg-stone-50 p-8">
          <h2 className="font-serif text-3xl font-bold text-stone-900">
            No <span className="font-normal italic">matches</span> found
          </h2>
          <p className="mt-3 max-w-[48ch] text-sm leading-6 text-stone-600">
            Try another product name or choose a different category.
          </p>
        </div>
      )}

      {totalPages > 1 ? (
        <nav
          className="flex flex-wrap items-center justify-center gap-2 border-t border-stone-200 pt-6"
          aria-label="Product pagination"
        >
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="h-10 border border-stone-300 px-4 text-xs font-bold uppercase tracking-widest text-stone-700 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              aria-current={currentPage === page ? "page" : undefined}
              className={`h-10 min-w-10 border px-3 text-xs font-bold uppercase tracking-widest transition ${
                currentPage === page
                  ? "border-brand bg-brand text-white"
                  : "border-stone-300 text-stone-700 hover:border-brand hover:text-brand"
              }`}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            className="h-10 border border-stone-300 px-4 text-xs font-bold uppercase tracking-widest text-stone-700 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}

function getProductCategoryOptions(products: Array<StorefrontProduct>): Array<ProductCategoryOption> {
  const categories = new Map<string, ProductCategoryOption>();

  products.forEach((product) => {
    if (!product.category) {
      return;
    }

    const current = categories.get(product.category.id);

    categories.set(product.category.id, {
      ...product.category,
      count: (current?.count ?? 0) + 1
    });
  });

  return Array.from(categories.values()).sort((a, b) => a.name.localeCompare(b.name));
}
