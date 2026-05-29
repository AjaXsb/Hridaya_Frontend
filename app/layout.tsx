import type React from "react"

import type { Metadata } from "next"
// <CHANGE> Switched to Inter and JetBrains Mono for terminal aesthetics
import { Inter, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { TerminalQueryProvider } from "@/lib/query-provider"
import { CONVENTION_CLASS } from "@/lib/color-convention"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" })

export const metadata: Metadata = {
  title: "CS2 Market Terminal",
  description: "Institutional-grade CS2 market data terminal for professional traders",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark ${CONVENTION_CLASS}`}
      style={
        {
          "--font-sans": inter.style.fontFamily,
          "--font-mono": jetbrainsMono.style.fontFamily,
        } as React.CSSProperties
      }
    >
      <body className={`${inter.className} antialiased`}>
        <TerminalQueryProvider>{children}</TerminalQueryProvider>
        <Analytics />
      </body>
    </html>
  )
}
