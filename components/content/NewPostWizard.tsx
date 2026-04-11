'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type Client, type Post, type PostFormat, type PostPlacement, type ContentType, type Platform } from '@/types'
import { updatePostAction, updatePostStatusAction } from '@/lib/actions/posts'
import { StepClient } from './wizard/StepClient'
import { StepCalendar } from './wizard/StepCalendar'
import { StepContentType } from './wizard/StepContentType'
import { StepAngle } from './wizard/StepAngle'
import { StepFormat } from './wizard/StepFormat'
import { StepUpload } from './wizard/StepUpload'
import { StepCaption } from './wizard/StepCaption'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WizardData {
  clientId: string
  clientName: string
  scheduledDate: string
  angle: string
  format: PostFormat | ''
  placement: PostPlacement | ''
  contentType: ContentType | ''
  platform: Platform
  postId: string
  creativeUrl: string
  caption: string
}

interface NewPostWizardProps {
  open: boolean
  onClose: () => void
  clients: Client[]
  posts: Post[]
  initialClientId?: string
  initialDate?: string
}

// ---------------------------------------------------------------------------
// Step metadata
// ---------------------------------------------------------------------------

const STEPS = [
  { number: 1, name: 'Client' },
  { number: 2, name: 'Date' },
  { number: 3, name: 'Type' },
  { number: 4, name: 'Angle' },
  { number: 5, name: 'Format' },
  { number: 6, name: 'Creative' },
  { number: 7, name: 'Caption' },
] as const

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((step) => {
        const isCompleted = step.number < current
        const isActive = step.number === current
        const isFuture = step.number > current

        return (
          <div key={step.number} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-[#E8732A] text-white'
                    : isActive
                    ? 'bg-[#E8732A] text-white ring-2 ring-[#E8732A]/30'
                    : 'bg-transparent border border-[#2a2a2a] text-[#555555]'
                }`}
              >
                {isCompleted ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isActive ? 'text-[#E8732A]' : isCompleted ? 'text-[#999999]' : 'text-[#555555]'
                }`}
              >
                {step.name}
              </span>
            </div>

            {/* Connector line between steps */}
            {step.number < total && (
              <div
                className={`w-8 h-px mb-4 ${
                  step.number < current ? 'bg-[#E8732A]/40' : 'bg-[#2a2a2a]'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Placeholder step components
// ---------------------------------------------------------------------------

function StepPlaceholder({ stepNumber, stepName }: { stepNumber: number; stepName: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-lg font-bold text-[#E8732A]">
        {stepNumber}
      </div>
      <p className="text-[#555555] text-sm">Step {stepNumber} — {stepName}</p>
      <p className="text-[#333333] text-xs">(Coming in next build step)</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

export function NewPostWizard({
  open,
  onClose,
  clients,
  posts,
  initialClientId,
  initialDate,
}: NewPostWizardProps) {
  const router = useRouter()

  // If a client is pre-selected, skip step 1
  const startStep = initialClientId ? 2 : 1

  const [currentStep, setCurrentStep] = useState(startStep)
  const [wizardData, setWizardData] = useState<WizardData>({
    clientId: initialClientId ?? '',
    clientName: initialClientId
      ? (clients.find((c) => c.id === initialClientId)?.name ?? '')
      : '',
    scheduledDate: initialDate ?? '',
    angle: '',
    format: '',
    placement: '',
    contentType: '',
    platform: 'instagram',
    postId: '',
    creativeUrl: '',
    caption: '',
  })

  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [finishing, setFinishing] = useState(false)

  // NOTE: All hooks must be called before any conditional return (Rules of Hooks)
  const handlePostCreated = useCallback((id: string) => {
    setWizardData((prev) => ({ ...prev, postId: id }))
  }, [])

  const handleCreativeUploaded = useCallback((mediaUrl: string) => {
    setWizardData((prev) => ({ ...prev, creativeUrl: mediaUrl }))
  }, [])

  const handleCaptionReady = useCallback((caption: string) => {
    setWizardData((prev) => ({ ...prev, caption }))
  }, [])

  if (!open) return null

  const totalSteps = STEPS.length // 7
  const isFirstStep = currentStep === startStep
  const isLastStep = currentStep === 7

  // Existing angles for the same client + same month (for AI dedup)
  const existingAngles = posts
    .filter((p) => {
      if (p.client_id !== wizardData.clientId) return false
      if (!p.angle || !p.scheduled_date || !wizardData.scheduledDate) return false
      return p.scheduled_date.substring(0, 7) === wizardData.scheduledDate.substring(0, 7)
    })
    .map((p) => p.angle as string)

  // Per-step advance gate
  const canAdvance =
    currentStep === 1 ? !!wizardData.clientId :
    currentStep === 2 ? !!wizardData.scheduledDate :
    currentStep === 3 ? !!wizardData.contentType :
    currentStep === 4 ? wizardData.angle.trim().length > 3 :
    currentStep === 5 ? !!wizardData.format :
    currentStep === 6 ? !!wizardData.creativeUrl :
    currentStep === 7 ? wizardData.caption.trim().length > 0 :
    true

  function handleBack() {
    if (currentStep > startStep) {
      setCurrentStep((s) => s - 1)
    }
  }

  async function handleNext() {
    if (currentStep < totalSteps) {
      setCurrentStep((s) => s + 1)
    } else {
      // Last step: save caption + transition to ready + close
      if (!wizardData.postId) {
        onClose()
        return
      }
      setFinishing(true)
      try {
        await updatePostAction(wizardData.postId, { caption: wizardData.caption })
        await updatePostStatusAction(wizardData.postId, 'ready')
        router.refresh()
        onClose()
      } catch (err) {
        console.error('[NewPostWizard] Finish failed:', err)
        setFinishing(false)
      }
    }
  }

  function resetWizard() {
    setCurrentStep(startStep)
    setShowCloseConfirm(false)
    setFinishing(false)
    setWizardData({
      clientId: initialClientId ?? '',
      clientName: initialClientId
        ? (clients.find((c) => c.id === initialClientId)?.name ?? '')
        : '',
      scheduledDate: initialDate ?? '',
      angle: '',
      format: '',
      placement: '',
      contentType: '',
      platform: 'instagram',
      postId: '',
      creativeUrl: '',
      caption: '',
    })
  }

  function handleClose() {
    if (wizardData.postId) {
      // Post partially created — confirm before closing
      setShowCloseConfirm(true)
    } else {
      resetWizard()
      onClose()
    }
  }

  function handleConfirmClose() {
    resetWizard()
    onClose()
  }

  function handleClientSelect(clientId: string, clientName: string) {
    setWizardData((prev) => ({ ...prev, clientId, clientName }))
    setCurrentStep(2)
  }

  function handleDateSelect(date: string) {
    setWizardData((prev) => ({ ...prev, scheduledDate: date }))
    setCurrentStep(3)
  }

  function handleContentTypeSelect(contentType: ContentType) {
    setWizardData((prev) => ({ ...prev, contentType }))
    setCurrentStep(4)
  }

  const currentStepMeta = STEPS.find((s) => s.number === currentStep)!

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
      {/* Top bar */}
      <div className="flex-none px-8 pt-6 pb-4 border-b border-[#2a2a2a]">
        <div className="flex items-start justify-between">
          {/* Step indicator centered */}
          <div className="flex-1 flex justify-center">
            <StepIndicator current={currentStep} total={totalSteps} />
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="flex-none w-8 h-8 flex items-center justify-center text-[#555555] hover:text-white bg-[#1a1a1a] border border-[#2a2a2a] rounded-md transition-colors ml-4"
            aria-label="Close wizard"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        <div className="w-full max-w-2xl px-8">
          {currentStep === 1 && (
            <StepClient clients={clients} onSelect={handleClientSelect} />
          )}
          {currentStep === 2 && (
            <StepCalendar
              clientId={wizardData.clientId}
              clientName={wizardData.clientName}
              posts={posts}
              selectedDate={wizardData.scheduledDate}
              onSelect={handleDateSelect}
            />
          )}
          {currentStep === 3 && (
            <StepContentType
              onSelect={handleContentTypeSelect}
              selected={wizardData.contentType}
            />
          )}
          {currentStep === 4 && (
            <StepAngle
              clientId={wizardData.clientId}
              clientName={wizardData.clientName}
              scheduledDate={wizardData.scheduledDate}
              contentType={wizardData.contentType}
              existingAngles={existingAngles}
              value={wizardData.angle}
              onChange={(angle) => setWizardData((prev) => ({ ...prev, angle }))}
            />
          )}
          {currentStep === 5 && (
            <StepFormat
              clientId={wizardData.clientId}
              angle={wizardData.angle}
              value={{
                format: (wizardData.format as PostFormat) || 'static',
                placement: (wizardData.placement as PostPlacement) || 'feed',
                platform: wizardData.platform,
              }}
              onChange={({ format, placement, platform }) =>
                setWizardData((prev) => ({ ...prev, format, placement, platform }))
              }
            />
          )}
          {currentStep === 6 && (
            <StepUpload
              wizardData={wizardData}
              clients={clients}
              onPostCreated={handlePostCreated}
              onCreativeUploaded={handleCreativeUploaded}
            />
          )}
          {currentStep === 7 && wizardData.postId && (
            <StepCaption
              postId={wizardData.postId}
              clientId={wizardData.clientId}
              platform={wizardData.platform}
              contentType={(wizardData.contentType as ContentType) || 'education'}
              angle={wizardData.angle}
              format={(wizardData.format as PostFormat) || 'static'}
              placement={(wizardData.placement as PostPlacement) || 'feed'}
              onCaptionReady={handleCaptionReady}
            />
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex-none px-8 py-6 border-t border-[#2a2a2a]">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {/* Back */}
          {!isFirstStep ? (
            <Button
              variant="ghost"
              onClick={handleBack}
              className="text-[#999999] hover:text-white hover:bg-[#1a1a1a] border border-[#2a2a2a] h-9 px-4 text-sm"
            >
              Back
            </Button>
          ) : (
            <div /> /* spacer so Next stays right-aligned */
          )}

          {/* Step label */}
          <span className="text-xs text-[#555555]">
            Step {currentStep} of {totalSteps} — {currentStepMeta.name}
          </span>

          {/* Next / Finish */}
          <Button
            onClick={() => void handleNext()}
            disabled={!canAdvance || finishing}
            className="bg-[#E8732A] hover:bg-[#d4621f] text-white border-0 h-9 px-5 text-sm disabled:opacity-40"
          >
            {finishing ? 'Saving...' : isLastStep ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>

      {/* Close confirmation dialog */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60">
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <h3 className="text-white text-sm font-semibold">Leave without finishing?</h3>
              <p className="text-[#999999] text-sm leading-relaxed">
                You have an unfinished post. It&apos;ll be saved as a draft — you can finish it from the content page.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setShowCloseConfirm(false)}
                className="text-[#999999] hover:text-white hover:bg-[#1a1a1a] border border-[#2a2a2a] h-8 px-4 text-sm"
              >
                Keep editing
              </Button>
              <Button
                onClick={handleConfirmClose}
                className="bg-[#1a1a1a] hover:bg-[#222222] text-white border border-[#2a2a2a] h-8 px-4 text-sm"
              >
                Leave anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
