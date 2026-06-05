export default function FriendsLoading() {
  return (
    <div className="bg-[#09090f] min-h-screen pb-20 sm:pb-8">
      <div className="sticky top-0 z-40 h-14 bg-[#09090f]/90 border-b border-violet-900/20" />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        {/* Search bar skeleton */}
        <div className="h-11 bg-violet-900/20 animate-pulse rounded-xl" />
        {/* Friend cards skeleton */}
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-violet-900/40 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-violet-900/40 animate-pulse rounded-full w-28" />
              <div className="h-2.5 bg-violet-900/25 animate-pulse rounded-full w-20" />
            </div>
            <div className="w-16 h-7 bg-violet-900/30 animate-pulse rounded-full" />
          </div>
        ))}
      </main>
    </div>
  );
}
