import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="p-8 space-y-6">
      <Skeleton className="h-8 w-48 bg-[#1a1a1a]" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-24 bg-[#1a1a1a] rounded-md" />
        <Skeleton className="h-24 bg-[#1a1a1a] rounded-md" />
        <Skeleton className="h-24 bg-[#1a1a1a] rounded-md" />
      </div>
      <Skeleton className="h-64 bg-[#1a1a1a] rounded-md" />
    </div>
  )
}
