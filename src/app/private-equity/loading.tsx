export default function PrivateEquityLoading() {
  return (
    <div className="container-site py-8 sm:py-12 animate-pulse">
      <div className="mb-10 border-b border-light-border/70 pb-10 dark:border-dark-border/70">
        <div className="skeleton-line w-72 h-4 mb-3" />
        <div className="skeleton-line w-48 h-8 mb-3" />
        <div className="skeleton-line w-full max-w-2xl h-5 mb-2" />
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-light-border/60 dark:border-dark-border/60 p-4">
              <div className="skeleton-line w-16 h-3 mb-2" />
              <div className="skeleton-line w-12 h-7" />
            </div>
          ))}
        </div>
        <div className="skeleton-line w-72 h-4 mt-5" />
      </div>
      <div className="mb-8 space-y-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-line w-20 h-9 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-card-lg border border-light-border/60 dark:border-dark-border/60 p-5">
            <div className="skeleton-line w-12 h-4 mb-3 rounded" />
            <div className="skeleton-line w-28 h-3 mb-3" />
            <div className="skeleton-line w-full h-5 mb-2" />
            <div className="skeleton-line w-4/5 h-5 mb-3" />
            <div className="skeleton-line w-full h-4 mb-1" />
            <div className="skeleton-line w-3/4 h-4" />
          </div>
        ))}
      </div>
    </div>
  );
}