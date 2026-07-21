const SkeletonProductPreview = () => {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="aspect-square w-full bg-neutral-100" />
      <div className="space-y-2 bg-neutral-100 px-3 py-3">
        <div className="flex justify-between gap-2">
          <div className="h-8 w-3/5 rounded bg-neutral-200" />
          <div className="h-12 w-16 rounded bg-neutral-200" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-4 w-10 rounded bg-neutral-200" />
          <div className="h-4 w-16 rounded bg-neutral-200" />
        </div>
        <div className="h-9 w-full rounded bg-neutral-200" />
      </div>
    </div>
  )
}

export default SkeletonProductPreview
