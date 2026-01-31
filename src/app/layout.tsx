import type { Metadata } from 'next'
import HeaderComNav from '../components/HeaderComNav'
import './globals.css' // Certifique-se de que o CSS global está importado

export const metadata: Metadata = {
  title: 'Bizu do Bigode',
  description: 'Gestão do negócio',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-stone-100 antialiased font-sans">
        <HeaderComNav />
        <main>{children}</main>
      </body>
    </html>
  )
}