import { BehaviorSubject, type Observable } from "rxjs"
import type { ImportLogStatus } from "@/entities/import-log"

// ── Status type for in-memory context ───────────────────

/** Superset of ImportLogStatus for in-memory tracking. Matches the log enum. */
export type ContextStatus = ImportLogStatus

// ── Prompt types ────────────────────────────────────────

/** Prompt the service raises when user input is needed. */
export type PasswordPrompt = { readonly kind: "password" }
export type AdapterSelectionPrompt = { readonly kind: "adapter-selection"; readonly adapterIds: ReadonlyArray<string> }
export type AccountSelectionPrompt = { readonly kind: "account-selection"; readonly accountIds: ReadonlyArray<string> }
export type ConfirmPrompt = { readonly kind: "confirm"; readonly parsed: number; readonly newCount: number; readonly duplicate: number }

export type ContextPrompt =
  | PasswordPrompt
  | AdapterSelectionPrompt
  | AccountSelectionPrompt
  | ConfirmPrompt

/** User's answer to a prompt. */
export type PasswordAnswer = { readonly kind: "password"; readonly password: string }
export type AdapterAnswer = { readonly kind: "adapter-selection"; readonly adapterId: string }
export type AccountAnswer = { readonly kind: "account-selection"; readonly accountId: string }
export type ConfirmAnswer = { readonly kind: "confirm"; readonly confirmed: boolean }

export type PromptAnswer =
  | PasswordAnswer
  | AdapterAnswer
  | AccountAnswer
  | ConfirmAnswer

// ── Base context ────────────────────────────────────────

/**
 * In-memory state for a running import. Holds status, current prompt,
 * and an observable for UI binding. NOT persisted — the ImportLog entity
 * is the durable counterpart.
 */
export class ImportContext {
  private readonly statusSubject: BehaviorSubject<ContextStatus>
  private promptResolve: ((answer: PromptAnswer) => void) | null = null
  private cancelled = false

  error: Error | null = null
  prompt: ContextPrompt | null = null

  constructor() {
    this.statusSubject = new BehaviorSubject<ContextStatus>("pending")
  }

  get status(): ContextStatus { return this.statusSubject.getValue() }
  set status(s: ContextStatus) { this.statusSubject.next(s) }

  observeStatus(): Observable<ContextStatus> {
    return this.statusSubject.asObservable()
  }

  cancel(): void {
    this.cancelled = true
    this.status = "cancelled"
    // Unblock any pending prompt
    if (this.promptResolve) {
      this.promptResolve({ kind: "confirm", confirmed: false })
      this.promptResolve = null
    }
  }

  isCancelled(): boolean { return this.cancelled }

  /** Suspend execution until the user answers. */
  waitForAnswer(prompt: ContextPrompt): Promise<PromptAnswer> {
    this.prompt = prompt
    this.status = "needs_input"
    return new Promise<PromptAnswer>((resolve) => {
      this.promptResolve = resolve
    })
  }

  /** Resume from a prompt with a user-supplied answer. */
  answer(answer: PromptAnswer): void {
    this.prompt = null
    if (this.promptResolve) {
      const resolve = this.promptResolve
      this.promptResolve = null
      resolve(answer)
    }
  }

  dispose(): void {
    this.statusSubject.complete()
  }
}
