'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { toggleOnboardingStep } from '@/lib/actions/onboarding'
import { type OnboardingStep } from '@/types'

interface OnboardingChecklistProps {
  steps: OnboardingStep[]
  clientId: string
  profiles: Record<string, string>
}

export function OnboardingChecklist({ steps, clientId, profiles }: OnboardingChecklistProps) {
  const [optimisticSteps, setOptimisticSteps] = useState(steps)
  const [isPending, startTransition] = useTransition()

  const completed = optimisticSteps.filter((s) => s.completed).length
  const total = optimisticSteps.length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  function handleToggle(step: OnboardingStep) {
    const newCompleted = !step.completed

    // Optimistic update
    setOptimisticSteps((prev) =>
      prev.map((s) =>
        s.id === step.id
          ? {
              ...s,
              completed: newCompleted,
              completed_at: newCompleted ? new Date().toISOString() : undefined,
            }
          : s
      )
    )

    startTransition(async () => {
      try {
        await toggleOnboardingStep(step.id, newCompleted, clientId)
      } catch {
        // Revert on error
        setOptimisticSteps((prev) =>
          prev.map((s) => (s.id === step.id ? { ...s, completed: step.completed } : s))
        )
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-[#1a1a1a] rounded-full h-1.5">
          <div
            className="bg-[#E8732A] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-[#555555] shrink-0">
          {completed}/{total} complete
        </span>
      </div>

      {/* Steps */}
      {optimisticSteps.length === 0 ? (
        <p className="text-sm text-[#555555] py-4">No onboarding steps generated yet.</p>
      ) : (
        <div className="space-y-1">
          {optimisticSteps
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((step) => (
              <div
                key={step.id}
                className={`flex items-start gap-3 px-4 py-3 rounded-md transition-colors ${
                  step.completed ? 'opacity-50' : ''
                }`}
              >
                <button
                  onClick={() => handleToggle(step)}
                  disabled={isPending}
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    step.completed
                      ? 'bg-[#E8732A] border-[#E8732A]'
                      : 'border-[#2a2a2a] hover:border-[#E8732A]'
                  }`}
                >
                  {step.completed && <Check size={10} className="text-white" strokeWidth={3} />}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${step.completed ? 'line-through text-[#555555]' : 'text-white'}`}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-[#555555] mt-0.5">{step.description}</p>
                  )}
                  {step.completed && step.completed_at && (
                    <p className="text-xs text-[#555555] mt-0.5">
                      Completed {new Date(step.completed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {step.assigned_to && profiles[step.assigned_to] && (
                  <span className="text-xs text-[#555555] shrink-0">
                    {profiles[step.assigned_to]}
                  </span>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
