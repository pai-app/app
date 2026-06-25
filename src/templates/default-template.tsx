import type { ReactNode } from "react"
import { Navbar } from "@/features/navbar/navbar"
import { Dropzone } from "@/components/import/dropzone"
import { ImportSurface } from "@/features/import/import-surface"
import { useApp } from "@/providers/app-provider"

export function DefaultTemplate({ children }: { readonly children: ReactNode }) {
  const { isMobile } = useApp()

  if (isMobile) {
    return (
      <div className="w-full">
        <div className="w-full pb-16">
          {children}
        </div>
        <Navbar className="w-full px-2 absolute bottom-4 z-10" isMobile />
        <Dropzone />
        <ImportSurface />
      </div>
    )
  }

  return (
    <div className="flex flex-col my-4 h-[calc(100%-2rem)]">
      <Navbar className="absolute left-0 right-0 top-4 mx-20 z-10" />
      <div className="h-[calc(100%-4rem)] mt-16 mx-24">
        {children}
      </div>
      <Dropzone />
      <ImportSurface />
    </div>
  )
}
