import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/ui/button"
import { Card, CardContent } from "@/ui/card"
import { Icon } from "@/ui/icon"
import { Logo } from "@/components/logo"
import { useImportService } from "@/providers/import-provider"

/**
 * Full-window drag-and-drop overlay. Listens on `window` for file drag
 * events and calls `startFileImport` from the import provider when files
 * are dropped. Hidden until a drag is in progress, or while a sheet is open.
 */
export function Dropzone() {
  const { startFileImport, openLogId } = useImportService()
  const [isDragOver, setIsDragOver] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const dragCounter = useRef(0)

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer?.types.includes("Files")) {
      dragCounter.current++
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragOver(false)

    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return

    if (files.length > 1) {
      setErrorMessage("Please drop one file at a time")
      return
    }

    startFileImport(Array.from(files))
  }, [startFileImport])

  useEffect(() => {
    window.addEventListener("dragenter", handleDragEnter)
    window.addEventListener("dragleave", handleDragLeave)
    window.addEventListener("dragover", handleDragOver)
    window.addEventListener("drop", handleDrop)
    return () => {
      window.removeEventListener("dragenter", handleDragEnter)
      window.removeEventListener("dragleave", handleDragLeave)
      window.removeEventListener("dragover", handleDragOver)
      window.removeEventListener("drop", handleDrop)
    }
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop])

  const reset = useCallback(() => {
    setIsDragOver(false)
    setErrorMessage(null)
  }, [])

  // Hide while a sheet is open (avoid stacking a second import on top).
  if (openLogId) return null
  if (!isDragOver && !errorMessage) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="flex h-full w-full flex-col items-center justify-end px-8 py-5 backdrop-blur-sm">
        <Button variant="outline" size="icon" className="absolute right-4 top-4" onClick={reset}>
          <Icon name="x" />
        </Button>
        <div className="m-3 flex w-full flex-1 flex-col items-center justify-center rounded-lg border-4 border-dashed">
          {errorMessage && <span className="text-destructive">{errorMessage}</span>}
          <Icon name="upload" className="mb-2 size-8 animate-bounce text-muted-foreground" />
          <span className="text-muted-foreground">Drop file here to import</span>
        </div>
        <Card className="rounded-4xl rounded-b-none border bg-secondary/50 backdrop-blur">
          <CardContent className="flex flex-row items-center gap-4">
            <Logo />
            <span className="text-sm">Drop a bank statement (PDF / Excel) to import transactions</span>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
