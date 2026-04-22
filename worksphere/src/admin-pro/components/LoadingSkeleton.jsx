export function SkeletonLine({ className = '' }) {
  return <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-800 ${className}`} />
}

export default function LoadingSkeletonTable() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, idx) => (
        <SkeletonLine key={idx} className="h-10 w-full" />
      ))}
    </div>
  )
}
