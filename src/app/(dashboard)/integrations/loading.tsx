export default function IntegrationsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded bg-gray-200" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border bg-white p-6">
            <div className="h-10 w-10 rounded bg-gray-200" />
            <div className="h-5 w-24 rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-8 w-20 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
