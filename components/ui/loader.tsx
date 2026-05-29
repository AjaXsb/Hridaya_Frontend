import { Loader2 } from "lucide-react"

export function TerminalLoader({ text = "INITIALIZING" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-text-tertiary">
      <Loader2 className="w-6 h-6 animate-spin text-ui-focus" />
      <div className="font-mono text-xs tracking-widest animate-pulse">{text}...</div>
    </div>
  )
}
