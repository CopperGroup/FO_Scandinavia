"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { continueImport, forgetFeed, reviewImport, startImport } from "@/lib/import/actions"
import { DEFAULT_OPTIONS, type FeedSummary, type FieldMapping, type ImportOptions, type JobProgress, type ReviewRow, type ReviewSummary } from "@/lib/import/types"
import SourceStep from "./SourceStep"
import MappingStep from "./MappingStep"
import ReviewStep from "./ReviewStep"
import ImportStep from "./ImportStep"

const STEPS = [
  { title: "Файл", text: "Від постачальника" },
  { title: "Поля", text: "Що куди записати" },
  { title: "Перевірка", text: "Що зміниться" },
  { title: "Імпорт", text: "Запис у магазин" },
] as const

export type Review = { summary: ReviewSummary; rows: ReviewRow[] }

function Stepper({ step, reachable, onGo }: { step: number; reachable: number; onGo: (step: number) => void }) {
  return (
    <nav aria-label="Кроки імпорту">
      <ol className="flex gap-2 sm:grid sm:grid-cols-4 sm:gap-3">
        {STEPS.map((entry, index) => {
          const number = index + 1
          const current = number === step
          const done = number < step
          const canGo = number < step && number <= reachable && step !== 4
          const body = (
            <>
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                  current && "border-black bg-black text-white",
                  done && "border-black bg-white text-black",
                  !current && !done && "border-neutral-300 bg-white text-neutral-400",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : number}
              </span>
              <span className={cn("min-w-0", !current && "max-sm:hidden")}>
                <span className={cn("block truncate text-sm font-medium", current || done ? "text-neutral-900" : "text-neutral-400")}>{entry.title}</span>
                <span className="hidden truncate text-xs text-neutral-500 md:block">{entry.text}</span>
              </span>
            </>
          )
          return (
            <li key={entry.title} className={cn("border-t-2 pt-3", current ? "max-sm:min-w-0 max-sm:flex-1" : "max-sm:w-9 max-sm:flex-none", current || done ? "border-black" : "border-neutral-200")}>
              {canGo ? (
                <button
                  type="button"
                  onClick={() => onGo(number)}
                  className="flex w-full items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  {body}
                  <span className="sr-only">(повернутися до кроку)</span>
                </button>
              ) : (
                <div className="flex items-center gap-2" aria-current={current ? "step" : undefined}>
                  {body}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default function ImportWizard({ unfinished, sample }: { unfinished: JobProgress | null; sample: { products: number; categories: number } }) {
  const router = useRouter()
  const [step, setStep] = useState(unfinished ? 4 : 1)
  const [feed, setFeed] = useState<FeedSummary | null>(null)
  const [mapping, setMapping] = useState<FieldMapping | null>(null)
  const [options, setOptions] = useState<ImportOptions>(DEFAULT_OPTIONS)
  const [review, setReview] = useState<Review | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [progress, setProgress] = useState<JobProgress | null>(unfinished)
  const [importError, setImportError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const cancelled = useRef(false)

  // The feed stays in server memory for an hour; drop it when the admin leaves the page.
  const tokenRef = useRef<string | null>(null)
  useEffect(() => {
    tokenRef.current = feed?.token ?? null
  }, [feed])
  useEffect(() => {
    cancelled.current = false
    return () => {
      cancelled.current = true
    }
  }, [])

  // Leaving while batches are being written stops the import half-way: ask first.
  useEffect(() => {
    if (!running) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [running])

  const onLoaded = (summary: FeedSummary) => {
    if (feed && feed.token !== summary.token) void forgetFeed(feed.token)
    setFeed(summary)
    setMapping(summary.mapping)
    setOptions(DEFAULT_OPTIONS)
    setReview(null)
    setExcluded(new Set())
    setStep(2)
  }

  const runReview = useCallback(
    async (nextOptions: ImportOptions = options) => {
      if (!feed || !mapping) return
      setReviewing(true)
      setReviewError(null)
      const result = await reviewImport({ token: feed.token, mapping, options: nextOptions, excludedLines: [] })
      setReviewing(false)
      if (!result.ok) {
        setReviewError(result.error)
        return
      }
      setReview({ summary: result.summary, rows: result.rows })
      setStep(3)
    },
    [feed, mapping, options],
  )

  const drive = useCallback(async (start: JobProgress) => {
    setRunning(true)
    setImportError(null)
    let current = start
    setProgress(current)
    // One step per call; a failed job is retried from the step that failed.
    do {
      const result = await continueImport(current.jobId)
      if (!result.ok) {
        setImportError(result.error)
        break
      }
      current = result.progress
      setProgress(current)
    } while (!cancelled.current && current.stage !== "done" && current.stage !== "failed")
    setRunning(false)
  }, [])

  const begin = async (confirmDeleteCount: number) => {
    if (!feed || !mapping) return
    setImportError(null)
    setRunning(true)
    setStep(4)
    const result = await startImport({ token: feed.token, mapping, options, excludedLines: Array.from(excluded), confirmDeleteCount })
    if (!result.ok) {
      setRunning(false)
      setImportError(result.error)
      return
    }
    await drive(result.progress)
  }

  const restart = () => {
    if (tokenRef.current) void forgetFeed(tokenRef.current)
    setFeed(null)
    setMapping(null)
    setReview(null)
    setExcluded(new Set())
    setProgress(null)
    setImportError(null)
    setStep(1)
    // The first step shows what is in the store now (products left by the sample file).
    router.refresh()
  }

  const reachable = review ? 3 : feed ? 2 : 1

  return (
    <div className="space-y-4">
      <Stepper step={step} reachable={reachable} onGo={(next) => setStep(next)} />

      {step === 1 && <SourceStep onLoaded={onLoaded} sample={sample} />}

      {step === 2 && feed && mapping && (
        <MappingStep
          feed={feed}
          mapping={mapping}
          options={options}
          onMappingChange={(next) => {
            setMapping(next)
            setReview(null)
          }}
          onOptionsChange={(next) => {
            setOptions(next)
            setReview(null)
          }}
          onBack={() => setStep(1)}
          onNext={() => runReview()}
          busy={reviewing}
          error={reviewError}
        />
      )}

      {step === 3 && feed && review && (
        <ReviewStep
          review={review}
          options={options}
          excluded={excluded}
          busy={reviewing}
          onToggle={(line) =>
            setExcluded((previous) => {
              const next = new Set(previous)
              if (next.has(line)) next.delete(line)
              else next.add(line)
              return next
            })
          }
          onExcludeMany={(lines, exclude) =>
            setExcluded((previous) => {
              const next = new Set(previous)
              for (const line of lines) {
                if (exclude) next.add(line)
                else next.delete(line)
              }
              return next
            })
          }
          onOptionsChange={(next) => {
            const recheck = next.categories !== options.categories
            setOptions(next)
            if (recheck) void runReview(next)
          }}
          onBack={() => setStep(2)}
          onImport={begin}
        />
      )}

      {step === 4 && (
        <ImportStep
          progress={progress}
          error={importError}
          running={running}
          onContinue={() => progress && drive(progress)}
          onRestart={restart}
        />
      )}
    </div>
  )
}
