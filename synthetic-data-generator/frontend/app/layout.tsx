import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Synthetic Data Generator',
  description: 'Generate realistic synthetic datasets from declarative schemas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jetbrains.variable}>
      <body className={`${jetbrains.className} antialiased`}>{children}</body>
    </html>
  )
}
