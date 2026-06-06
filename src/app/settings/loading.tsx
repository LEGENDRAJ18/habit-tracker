function SkeletonBlock({ w = "full", h = "3" }: { w?: string; h?: string }) {
  return <div className={`h-${h} w-${w} bg-violet-900/30 animate-pulse rounded-full`} />;
}

export default function SettingsLoading() {
  return (
    <div className="bg-[#09090f] min-h-screen pb-nav">
      <div className="sticky top-0 z-40 h-14 bg-[#09090f]/90 border-b border-violet-900/20" />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#0f0f1a] border border-violet-900/20 rounded-2xl p-5 space-y-3">
            <SkeletonBlock w="36" h="4" />
            <SkeletonBlock h="10" />
            <SkeletonBlock w="3/4" />
          </div>
        ))}
      </main>
    </div>
  );
}
