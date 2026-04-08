'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-[#999999] mb-4">Something went wrong.</p>
        <button
          onClick={reset}
          className="text-sm text-[#E8732A] hover:text-[#d4621f]"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
