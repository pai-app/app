import { useApp } from "@/providers/app-provider"
import { DialogSurface } from "./dialog-surface"
import { SheetSurface } from "./sheet-surface"
import { PopoverSurface } from "./popover-surface"
import { DrawerSurface } from "./drawer-surface"
import type { AdaptiveSurfaceProps, SurfaceCommonProps, SurfaceSpec } from "./types"

/**
 * Viewport-adaptive overlay. Renders a different surface primitive
 * (`dialog` | `sheet` | `popover` | `drawer`) per breakpoint, chosen via the
 * `desktop` / `mobile` specs. Which breakpoint is active comes from
 * `useApp().isMobile`.
 *
 * Scope: the transient overlay family only — not persistent layout elements
 * like sidebars.
 *
 * Performance / correctness notes:
 * - Crossing the breakpoint swaps the underlying primitive, so `content`
 *   unmounts and remounts. Keep any state inside `content` controlled / lifted
 *   so it survives the swap; uncontrolled state (inputs, scroll, in-flight
 *   fetches) is otherwise lost.
 * - `popover` anchors to the trigger; the other surfaces portal to `<body>`
 *   with an overlay. Don't rely on anchored positioning for those.
 */
export function AdaptiveSurface({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  srOnlyTitle,
  content,
  desktop,
  mobile,
}: AdaptiveSurfaceProps) {
  const { isMobile } = useApp()
  const spec = isMobile ? mobile : desktop

  const common: SurfaceCommonProps = {
    open,
    onOpenChange,
    trigger,
    title,
    description,
    srOnlyTitle,
    children: content,
  }

  return renderSurface(spec, common)
}

function renderSurface(spec: SurfaceSpec, common: SurfaceCommonProps) {
  switch (spec.type) {
    case "dialog":
      return <DialogSurface {...common} contentProps={spec.props} />
    case "sheet":
      return <SheetSurface {...common} contentProps={spec.props} />
    case "popover":
      return <PopoverSurface {...common} contentProps={spec.props} />
    case "drawer":
      return (
        <DrawerSurface
          {...common}
          direction={spec.props?.direction}
          contentProps={spec.props?.content}
        />
      )
  }
}
