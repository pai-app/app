import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { cn } from "@/lib/utils"

// ─── Styles ───────────────────────────────────────────────

const defaultItemClassName = cn(
  "relative flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm transition-colors",
  "after:pointer-events-none after:absolute after:-top-4 after:h-16",
  "after:w-[calc(100%+--spacing(3)+13px)] after:-left-[calc(var(--spacing)*1.5+6px)]",
  "after:bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_50%)]",
  "after:opacity-0 after:transition-opacity after:duration-500",
  "first:after:rounded-l-3xl last:after:rounded-r-3xl",
  "hover:after:opacity-25",
)

const defaultActiveItemClassName = "after:opacity-50 text-foreground"
const defaultInactiveItemClassName = "text-muted-foreground hover:text-foreground"

// ─── Types ────────────────────────────────────────────────

type OverflowBarItem = {
  readonly key: string
  readonly element: ReactNode
  readonly active?: boolean
}

type OverflowBarProps = {
  readonly items: readonly OverflowBarItem[]
  readonly className?: string
  readonly itemClassName?: string
  readonly activeItemClassName?: string
  readonly inactiveItemClassName?: string
  /**
   * When the item set is known to always fit (e.g. a small, fixed menu), size
   * the bar to its content and disable the scroll/edge-fade behaviour. Avoids
   * a phantom fade caused by the flex + scroll-container max-content quirk.
   */
  readonly fit?: boolean
}

// ─── Component ────────────────────────────────────────────

export function OverflowBar({
  items,
  className,
  itemClassName = defaultItemClassName,
  activeItemClassName = defaultActiveItemClassName,
  inactiveItemClassName = defaultInactiveItemClassName,
  fit = false,
}: OverflowBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // ── Check scroll overflow ────────────────────────────────

  const updateScrollState = useCallback(() => {
    if (fit) return
    const el = scrollRef.current
    if (!el) return
    // Measure content from the last item's box rather than `scrollWidth`.
    // Active items carry a decorative `::after` glow that bleeds a few px past
    // their box; since it's absolutely positioned it inflates `scrollWidth`
    // without being real content, which would otherwise show a phantom fade.
    const lastChild = el.children[el.children.length - 1] as HTMLElement | undefined
    const contentRight = lastChild ? lastChild.offsetLeft + lastChild.offsetWidth : el.scrollWidth
    setCanScrollLeft(el.scrollLeft > 1)
    setCanScrollRight(el.scrollLeft + el.clientWidth < contentRight - 1)
  }, [fit])

  useLayoutEffect(() => {
    updateScrollState()
  }, [updateScrollState, items])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", updateScrollState, { passive: true })
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(el)
    return () => {
      el.removeEventListener("scroll", updateScrollState)
      observer.disconnect()
    }
  }, [updateScrollState])

  // ── Auto-scroll active item into view ─────────────────────
  // Scroll the inner container's `scrollLeft` directly rather than calling
  // `child.scrollIntoView()`. The latter walks up the DOM and scrolls every
  // ancestor (including the page) to bring the active child into view, which
  // pulls the whole page down on mount when the bar is below the fold.

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const activeIdx = items.findIndex((i) => i.active)
    if (activeIdx < 0) return
    const child = el.children[activeIdx] as HTMLElement | undefined
    if (!child) return

    const childLeft = child.offsetLeft
    const childRight = childLeft + child.offsetWidth
    const viewLeft = el.scrollLeft
    const viewRight = viewLeft + el.clientWidth

    if (childLeft < viewLeft) {
      el.scrollTo({ left: childLeft, behavior: "smooth" })
    } else if (childRight > viewRight) {
      el.scrollTo({ left: childRight - el.clientWidth, behavior: "smooth" })
    }
  }, [items])

  // ── Render ────────────────────────────────────────────────

  return (
    <div className={cn("relative flex items-center overflow-hidden", className)}>
      {/* Scrollable items */}
      <div
        ref={scrollRef}
        className={cn(
          "flex h-full items-stretch gap-1 overflow-x-auto scrollbar-none",
          fit && "w-max shrink-0",
        )}
      >
        {items.map((item) => (
          <div
            key={item.key}
            className={cn(
              "flex shrink-0 items-center",
              itemClassName,
              item.active ? activeItemClassName : inactiveItemClassName,
            )}
          >
            {item.element}
          </div>
        ))}
      </div>

      {/* Leading fade mask */}
      {canScrollLeft && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10 rounded-l-full"
          style={{
            background: "linear-gradient(to right, var(--color-muted), transparent)",
          }}
        />
      )}

      {/* Trailing fade mask */}
      {canScrollRight && (
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10 rounded-r-full"
          style={{
            background: "linear-gradient(to left, var(--color-muted), transparent)",
          }}
        />
      )}
    </div>
  )
}
