export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-lg bg-gray-200" />
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="h-80 rounded-lg bg-gray-200" />

      {/* Table skeleton */}
      <div className="space-y-2">
        <div className="h-10 rounded bg-gray-200" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
