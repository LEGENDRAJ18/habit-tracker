export default function CalendarLoading() {
  return (
    <div className="bg-[#09090f] min-h-screen pb-20 sm:pb-8">
      <div className="sticky top-0 z-40 h-14 bg-[#09090f]/90 border-b border-violet-900/20" />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        {/* Month header skeleton */}
        <div className="flex items-center justify-between mb-2">
          <div className="h-5 bg-violet-900/40 animate-pulse rounded-full w-32" />
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-violet-900/30 animate-pulse rounded-lg" />
            <div className="w-8 h-8 bg-violet-900/30 animate-pulse rounded-lg" />
          </div>
        </div>
        {/* Calendar grid skeleton */}
        <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-4">
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-violet-900/20 animate-pulse" />
            ))}
          </div>
        </div>
        {/* Detail skeleton */}
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-[#0f0f1a] border border-violet-900/20 rounded-xl p-4">
              <div className="h-3 bg-violet-900/40 animate-pulse rounded-full w-2/3" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
