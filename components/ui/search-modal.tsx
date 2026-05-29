"use client"

import { useState, useEffect } from "react"
import { Search, TrendingUp, History } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (item: any) => void
}

export function SearchModal({ isOpen, onClose, onSelect }: SearchModalProps) {
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!isOpen) setQuery("")
  }, [isOpen])

  const sampleItems = [
    { name: "AK-47 | Redline (Field-Tested)", category: "Rifle • Classified", price: "$43.70" },
    { name: "M4A1-S | Printstream (Factory New)", category: "Rifle • Covert", price: "$125.00" },
    { name: "AWP | Asiimov (Field-Tested)", category: "Sniper Rifle • Covert", price: "$89.50" },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg-deepest/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.1 }}
            className="w-full max-w-2xl bg-bg-base border border-border-default rounded-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[60vh]"
          >
            <div className="h-14 flex items-center px-4 border-b border-border-subtle bg-bg-panel/50">
              <Search className="w-5 h-5 text-text-tertiary" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search market items..."
                className="flex-1 bg-transparent border-none outline-none px-4 text-text-primary placeholder:text-text-tertiary font-medium h-full"
              />
              <div className="flex items-center gap-2">
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border-subtle bg-bg-base px-1.5 font-mono text-[10px] font-medium text-text-tertiary opacity-100">
                  <span className="text-xs">ESC</span>
                </kbd>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {query.length > 0 ? (
                <div className="space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                    Search Results
                  </div>
                  {sampleItems.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => onSelect({ name: item.name })}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-bg-hover text-left group transition-colors focus:bg-bg-hover focus:outline-none"
                    >
                      <div className="flex flex-col">
                        <span className="text-text-primary text-sm font-medium group-hover:text-ui-selected">
                          {item.name}
                        </span>
                        <span className="text-text-tertiary text-xs">{item.category}</span>
                      </div>
                      <span className="text-text-secondary text-sm font-mono">{item.price}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
                      <History className="w-3 h-3" />
                      Recent
                    </div>
                    <div className="space-y-0.5">
                      <button
                        onClick={() => onSelect({ name: "M4A1-S | Printstream" })}
                        className="w-full flex items-center px-3 py-2 rounded-md hover:bg-bg-hover text-left text-text-secondary text-sm group"
                      >
                        <span className="group-hover:text-text-primary">M4A1-S | Printstream</span>
                      </button>
                      <button
                        onClick={() => onSelect({ name: "Butterfly Knife | Doppler" })}
                        className="w-full flex items-center px-3 py-2 rounded-md hover:bg-bg-hover text-left text-text-secondary text-sm group"
                      >
                        <span className="group-hover:text-text-primary">Butterfly Knife | Doppler</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-price-up" />
                      Trending
                    </div>
                    <div className="space-y-0.5">
                      <button
                        onClick={() => onSelect({ name: "Desert Eagle | Blaze" })}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-bg-hover text-left group"
                      >
                        <span className="text-text-secondary text-sm group-hover:text-text-primary">
                          Desert Eagle | Blaze
                        </span>
                        <span className="text-price-up text-xs font-mono">+12.5%</span>
                      </button>
                      <button
                        onClick={() => onSelect({ name: "AK-47 | Gold Arabesque" })}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-bg-hover text-left group"
                      >
                        <span className="text-text-secondary text-sm group-hover:text-text-primary">
                          AK-47 | Gold Arabesque
                        </span>
                        <span className="text-price-up text-xs font-mono">+8.2%</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-2 border-t border-border-subtle bg-bg-panel/50 text-[10px] text-text-tertiary flex items-center justify-between px-4">
              <div className="flex gap-4">
                <span>
                  <span className="font-bold text-text-secondary">↑↓</span> to navigate
                </span>
                <span>
                  <span className="font-bold text-text-secondary">↵</span> to select
                </span>
              </div>
              <span>12,405 items indexed</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
