export default function BillingLoading() {
  return (
    <div className="bg-[#09090f] min-h-screen pb-nav">
      <div className="sticky top-0 z-40 h-14 bg-[#09090f]/90 border-b border-violet-900/20" />
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="h-6 bg-violet-900/40 animate-pulse rounded-full w-40 mb-6" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-5 space-y-3">
            <div className="h-4 bg-violet-900/40 animate-pulse rounded-full w-32" />
            <div className="h-10 bg-violet-900/20 animate-pulse rounded-xl" />
            <div className="h-2.5 bg-violet-900/25 animate-pulse rounded-full w-3/4" />
          </div>
        ))}
      </main>
    </div>
  );
}
