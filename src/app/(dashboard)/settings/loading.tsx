export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-gray-200" />

      <div className="space-y-4 rounded-lg border bg-white p-6">
        <div className="h-6 w-36 rounded bg-gray-200" />
        <div className="h-4 w-64 rounded bg-gray-100" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-white p-6">
        <div className="h-6 w-24 rounded bg-gray-200" />
        <div className="h-4 w-48 rounded bg-gray-100" />
        <div className="h-8 w-32 rounded bg-gray-200" />
      </div>
    </div>
  );
}
