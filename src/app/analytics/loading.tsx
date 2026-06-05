export default function AnalyticsLoading() {
  return (
    <div className="bg-[#09090f] min-h-screen pb-20 sm:pb-8">
      <div className="sticky top-0 z-40 h-14 bg-[#09090f]/90 border-b border-violet-900/20" />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        {/* Chart skeleton */}
        <div className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-5">
          <div className="h-4 bg-violet-900/40 animate-pulse rounded-full w-32 mb-4" />
          <div className="h-40 bg-violet-900/20 animate-pulse rounded-xl" />
        </div>
        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-4">
              <div className="h-6 bg-violet-900/40 animate-pulse rounded-full w-12 mb-2" />
              <div className="h-2.5 bg-violet-900/25 animate-pulse rounded-full w-20" />
            </div>
          ))}
        </div>
        {/* List skeleton */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-violet-900/40 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-violet-900/40 animate-pulse rounded-full w-3/4" />
              <div className="h-2 bg-violet-900/25 animate-pulse rounded-full w-1/2" />
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
