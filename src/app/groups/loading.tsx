export default function GroupsLoading() {
  return (
    <div className="bg-[#09090f] min-h-screen pb-nav">
      <div className="sticky top-0 z-40 h-14 bg-[#09090f]/90 border-b border-violet-900/20" />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="bg-[#0f0f1a] border border-orange-700/20 rounded-2xl p-5 space-y-3">
          <div className="h-5 bg-violet-900/40 animate-pulse rounded-full w-40" />
          <div className="h-3 bg-violet-900/25 animate-pulse rounded-full w-full" />
          <div className="h-3 bg-violet-900/25 animate-pulse rounded-full w-3/4" />
        </div>
        <div className="flex gap-3">
          <div className="flex-1 h-11 bg-violet-700/30 animate-pulse rounded-xl" />
          <div className="flex-1 h-11 bg-violet-900/20 animate-pulse rounded-xl" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-5 space-y-3">
            <div className="h-4 bg-violet-900/40 animate-pulse rounded-full w-32" />
            <div className="h-10 bg-violet-900/20 animate-pulse rounded-xl" />
          </div>
        ))}
      </main>
    </div>
  );
}
