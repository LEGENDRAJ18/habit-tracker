// Shown by Next.js App Router while the dashboard JS chunk is loading.
// Matches the dashboard's own skeleton so there's zero visual jump.
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-violet-900/20 bg-[#0f0f1a] overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-3.5">
        <div className="w-6 h-6 rounded-full bg-violet-900/40 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-violet-900/40 animate-pulse rounded-full w-3/4" />
          <div className="h-2.5 bg-violet-900/30 animate-pulse rounded-full w-1/2" />
        </div>
        <div className="w-10 h-4 bg-violet-900/30 animate-pulse rounded-full" />
      </div>
      <div className="px-4 pb-3.5">
        <div className="h-1 bg-violet-900/25 animate-pulse rounded-full" />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="bg-[#09090f] min-h-screen pb-20 sm:pb-8">
      <main className="max-w-[1340px] mx-auto px-4 sm:px-6 py-8">

        {/* Header skeleton */}
        <div className="mb-6 pt-6 pb-4">
          <div className="h-3 bg-violet-900/30 animate-pulse rounded-full w-24 mb-2" />
          <div className="h-7 bg-violet-900/40 animate-pulse rounded-full w-48 mb-3" />
          <div className="h-2 bg-violet-900/25 animate-pulse rounded-full w-64" />
        </div>

        {/* Stats row skeleton */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-[#0c0c18] border border-violet-900/20 rounded-xl px-3 py-2.5 text-center">
              <div className="h-5 bg-violet-900/40 animate-pulse rounded-full w-10 mx-auto mb-1.5" />
              <div className="h-2 bg-violet-900/25 animate-pulse rounded-full w-14 mx-auto" />
            </div>
          ))}
        </div>

        {/* Progress bar skeleton */}
        <div className="mb-6 bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="h-3 bg-violet-900/40 animate-pulse rounded-full w-28" />
            <div className="h-3 bg-violet-900/30 animate-pulse rounded-full w-16" />
          </div>
          <div className="h-2 bg-violet-900/40 animate-pulse rounded-full w-full" />
        </div>

        {/* Habit cards skeleton */}
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      </main>
    </div>
  );
}
