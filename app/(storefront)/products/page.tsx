import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/storefront/ProductCard";
import { RevealOnScroll } from "@/components/storefront/RevealOnScroll";
import {
  getFilteredStorefrontProducts,
  getStorefrontCategories
} from "@/lib/products";
import { siteConfig } from "@/config/site";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Products",
  description: "Browse custom photo magazine formats from Hearts & Beans.",
  alternates: {
    canonical: `${siteConfig.url}/products`
  }
};

interface ProductsPageProps {
  searchParams: Promise<{
    query?: string;
    category?: string;
  }>;
}

function buildProductsHref({
  query,
  category
}: {
  query?: string;
  category?: string;
}): Route {
  const params = new URLSearchParams();

  if (query?.trim()) {
    params.set("query", query.trim());
  }

  if (category?.trim()) {
    params.set("category", category.trim());
  }

  const queryString = params.toString();

  return (queryString ? `/products?${queryString}` : "/products") as Route;
}

export default async function ProductsIndexPage({
  searchParams
}: ProductsPageProps): Promise<React.JSX.Element> {
  const { query = "", category = "" } = await searchParams;
  const normalizedQuery = query.trim();
  const normalizedCategory = category.trim();
  const [categories, products] = await Promise.all([
    getStorefrontCategories(),
    getFilteredStorefrontProducts({
      query: normalizedQuery,
      category: normalizedCategory
    })
  ]);
  const selectedCategory = categories.find((item) => item.slug === normalizedCategory);
  const unassignedProducts = products.filter((product) => !product.categoryId);
  const productSections = [
    ...categories
      .filter((item) => !normalizedCategory || item.slug === normalizedCategory)
      .map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        products: products.filter((product) => product.categoryId === item.id)
      }))
      .filter((item) => item.products.length > 0),
    ...(!normalizedCategory && unassignedProducts.length > 0
      ? [
          {
            id: "unassigned",
            name: "Unassigned Formats",
            slug: "unassigned",
            description: null,
            products: unassignedProducts
          }
        ]
      : [])
  ];
  const resultLabel = `${products.length} ${
    products.length === 1 ? "format" : "formats"
  }`;

  return (
    <main className="bg-[#FAFAF8]">
      <section className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.4fr] lg:px-12 lg:py-16">
        <RevealOnScroll className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-brand">
              <span className="h-px w-8 bg-brand" />
              <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em]">
                Our Collection
              </p>
            </div>
            <h1 className="max-w-[8ch] font-serif text-5xl font-black leading-[0.95] tracking-tight text-stone-900 sm:text-6xl lg:text-7xl">
              Magazine <span className="font-normal italic">Formats</span>
            </h1>
            <p className="max-w-[42ch] text-sm font-light leading-7 text-stone-600">
              Search the edited collection by name or browse by cover format,
              photo count, and story style.
            </p>
          </div>

          <form
            action="/products"
            method="GET"
            className="border-y border-stone-200 py-5"
          >
            {normalizedCategory ? (
              <input type="hidden" name="category" value={normalizedCategory} />
            ) : null}
            <label className="block text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-stone-400">
              Keyword Search
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  type="search"
                  name="query"
                  defaultValue={normalizedQuery}
                  placeholder="Search products or categories"
                  className="h-12 w-full rounded-none border border-stone-200 bg-white pl-11 pr-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand"
                />
              </div>
            </label>
            <button
              type="submit"
              className="mt-3 inline-flex h-11 items-center justify-center bg-stone-900 px-7 text-xs font-medium uppercase tracking-[0.08em] text-white transition hover:bg-brand"
            >
              Search
            </button>
          </form>

          <div className="flex items-center justify-between gap-4 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-stone-400">
            <span>{resultLabel}</span>
            <span>{selectedCategory?.name ?? "All formats"}</span>
          </div>
        </RevealOnScroll>

        <div className="min-w-0 space-y-8">
          <RevealOnScroll>
            <nav
              aria-label="Filter products by category"
              className="flex snap-x gap-2 overflow-x-auto border-y border-stone-200 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <Link
                href={buildProductsHref({ query: normalizedQuery })}
                aria-current={!normalizedCategory ? "page" : undefined}
                className={`shrink-0 snap-start border px-5 py-3 text-[0.6875rem] font-medium uppercase tracking-[0.08em] transition ${
                  !normalizedCategory
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:border-brand hover:text-brand"
                }`}
              >
                All Formats
              </Link>
              {categories.map((item) => {
                const isSelected = normalizedCategory === item.slug;

                return (
                  <Link
                    key={item.id}
                    href={buildProductsHref({
                      query: normalizedQuery,
                      category: item.slug
                    })}
                    aria-current={isSelected ? "page" : undefined}
                    className={`shrink-0 snap-start border px-5 py-3 text-[0.6875rem] font-medium uppercase tracking-[0.08em] transition ${
                      isSelected
                        ? "border-brand bg-brand text-white"
                        : "border-stone-200 bg-white text-stone-600 hover:border-brand hover:text-brand"
                    }`}
                  >
                    {item.name}
                    <span className="ml-3 font-mono text-[0.625rem]">
                      {item.productCount}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </RevealOnScroll>

          {productSections.length > 0 ? (
            <div className="space-y-16">
              {productSections.map((section) => (
                <section key={section.id} className="space-y-8">
                  <RevealOnScroll>
                    <div className="border-b border-stone-200 pb-5">
                      <div className="flex items-center gap-3 text-brand">
                        <span className="h-px w-8 bg-brand" />
                        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em]">
                          {section.products.length}{" "}
                          {section.products.length === 1 ? "Format" : "Formats"}
                        </p>
                      </div>
                      <h2 className="mt-4 font-serif text-4xl font-black leading-none text-stone-900">
                        {section.name.split(" ")[0]}{" "}
                        <span className="font-normal italic">
                          {section.name.split(" ").slice(1).join(" ") || "Collection"}
                        </span>
                      </h2>
                      {section.description ? (
                        <p className="mt-4 max-w-[52ch] text-sm font-light leading-7 text-stone-600">
                          {section.description}
                        </p>
                      ) : null}
                    </div>
                  </RevealOnScroll>

                  <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
                    {section.products.map((product, index) => (
                      <RevealOnScroll
                        key={product.id}
                        className={index % 3 === 1 ? "xl:pt-12" : ""}
                      >
                        <ProductCard product={product} />
                      </RevealOnScroll>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <RevealOnScroll>
              <div className="border border-stone-200 bg-white p-8 sm:p-12">
                <div className="flex items-center gap-3 text-brand">
                  <span className="h-px w-8 bg-brand" />
                  <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em]">
                    Empty Edit
                  </p>
                </div>
                <h2 className="mt-5 font-serif text-4xl font-black leading-none text-stone-900">
                  No formats <span className="font-normal italic">matched</span>
                </h2>
                <p className="mt-4 max-w-[42ch] text-sm leading-7 text-stone-600">
                  No formats matched your search. Try a different keyword or
                  return to the full collection.
                </p>
                <Link
                  href="/products"
                  className="mt-6 inline-flex h-11 items-center justify-center border border-stone-900 bg-white px-6 text-xs font-medium uppercase tracking-[0.08em] text-stone-900 transition hover:bg-stone-900 hover:text-white"
                >
                  Reset Filters
                </Link>
              </div>
            </RevealOnScroll>
          )}
        </div>
      </section>
    </main>
  );
}
