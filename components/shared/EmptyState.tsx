interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-[#555555] mb-3">{icon}</div>}
      <p className="text-sm font-medium text-[#999999]">{title}</p>
      {description && (
        <p className="text-xs text-[#555555] mt-1 max-w-xs">{description}</p>
      )}
    </div>
  )
}
