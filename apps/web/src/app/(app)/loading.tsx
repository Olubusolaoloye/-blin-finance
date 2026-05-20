export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse pt-2">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-40 bg-border-light rounded-full" />
          <div className="h-3 w-24 bg-border-light rounded-full" />
        </div>
        <div className="w-10 h-10 rounded-full bg-border-light" />
      </div>

      {/* Balance card skeleton */}
      <div className="rounded-[20px] bg-border-light h-[220px]" />

      {/* Row of action pills */}
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 h-16 rounded-2xl bg-border-light" />
        ))}
      </div>

      {/* List rows */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-border-light">
          <div className="w-11 h-11 rounded-full bg-border-light shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-3.5 w-32 bg-border-light rounded-full" />
            <div className="h-3 w-20 bg-border-light rounded-full" />
          </div>
          <div className="h-4 w-16 bg-border-light rounded-full" />
        </div>
      ))}
    </div>
  );
}
