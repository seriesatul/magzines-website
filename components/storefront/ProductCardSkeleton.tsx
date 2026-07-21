export function ProductCardSkeleton(): React.ReactElement {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="aspect-[3/4] bg-stone-50" />
      <div className="h-4 w-4/5 bg-stone-200" />
      <div className="flex items-center gap-2">
        <div className="h-4 w-1/2 bg-stone-200" />
        <div className="h-3 w-1/4 bg-stone-200" />
      </div>
      <div className="h-8 w-full bg-stone-200" />
    </div>
  );
}
