import { describe, it, expect, vi, beforeEach } from "vitest"
import { toast } from "sonner"
import { notifyTagSimilar } from "@/pages/transactions/notify-tag-similar"
import type { SimilarFact } from "@/services/tagging/types"
import type { TransactionsService } from "@/services/transactions-service"

vi.mock("sonner", () => ({ toast: vi.fn() }))

const toastMock = vi.mocked(toast)

/** The toast action shape `notifyTagSimilar` builds (label + onClick). */
type ToastAction = { readonly label: string; readonly onClick: () => void }

/** Read the action off the first toast call (narrowed for assertions). */
function firstAction(): ToastAction {
  const opts = toastMock.mock.calls[0][1]
  return opts?.action as unknown as ToastAction
}

describe("notifyTagSimilar", () => {
  const tagMany = vi.fn(() => ({}))
  // `TransactionsService` is a class with private fields, so a structural stub
  // is cast through `unknown`; the helper only ever calls `tagMany`.
  const svc = { tagMany } as unknown as TransactionsService

  beforeEach(() => {
    toastMock.mockClear()
    tagMany.mockClear()
  })

  it("does nothing when there is no similar fact", () => {
    notifyTagSimilar(undefined, "Food", svc)
    expect(toastMock).not.toHaveBeenCalled()
  })

  it("does nothing when the similar fact has no transactions", () => {
    const similar: SimilarFact = { tagId: "tag-food", transactionIds: [] }
    notifyTagSimilar(similar, "Food", svc)
    expect(toastMock).not.toHaveBeenCalled()
  })

  it("offers a bulk-tag toast whose action tags all look-alikes", () => {
    const similar: SimilarFact = { tagId: "tag-food", transactionIds: ["t1", "t2", "t3"] }

    notifyTagSimilar(similar, "Food", svc)

    expect(toastMock).toHaveBeenCalledOnce()
    expect(toastMock).toHaveBeenCalledWith(
      expect.stringContaining("3 similar transactions"),
      expect.anything(),
    )
    expect(toastMock).toHaveBeenCalledWith(expect.stringContaining("Food"), expect.anything())

    const action = firstAction()
    expect(action.label).toBe("Tag all 3")
    action.onClick()
    expect(tagMany).toHaveBeenCalledExactlyOnceWith(["t1", "t2", "t3"], "tag-food")
  })

  it("uses the singular noun for a single look-alike", () => {
    const similar: SimilarFact = { tagId: "tag-food", transactionIds: ["t1"] }

    notifyTagSimilar(similar, "Food", svc)

    expect(toastMock).toHaveBeenCalledWith(
      expect.stringContaining("1 similar transaction "),
      expect.anything(),
    )
    expect(firstAction().label).toBe("Tag all 1")
  })
})
