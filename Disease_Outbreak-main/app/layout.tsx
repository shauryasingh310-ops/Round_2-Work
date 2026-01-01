import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { WavyBackground } from "@/components/wavy-background"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EpiGuard",
  description: "Smart water-borne disease tracking and prediction for Northeast India",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased`}>
        <WavyBackground />
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  )
}
