export default function ProfileLoading() {
  return (
    <div className="bg-[#09090f] min-h-screen pb-nav">
      <div className="sticky top-0 z-40 h-14 bg-[#09090f]/90 border-b border-violet-900/20" />
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        {/* Avatar skeleton */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-20 h-20 rounded-full bg-violet-900/40 animate-pulse" />
          <div className="h-5 bg-violet-900/40 animate-pulse rounded-full w-32" />
          <div className="h-3 bg-violet-900/25 animate-pulse rounded-full w-24" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-3 text-center">
              <div className="h-6 bg-violet-900/40 animate-pulse rounded-full w-10 mx-auto mb-1.5" />
              <div className="h-2 bg-violet-900/25 animate-pulse rounded-full w-14 mx-auto" />
            </div>
          ))}
        </div>
        {/* Habit list skeleton */}
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-[#0f0f1a] border border-violet-900/20 rounded-xl p-4">
              <div className="h-3 bg-violet-900/40 animate-pulse rounded-full w-3/4" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
