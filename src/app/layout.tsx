import type { Metadata } from 'next'
import HeaderComNav from '../components/HeaderComNav'
import { Toaster } from 'sonner' // Importa o componente de notificações
import './globals.css'

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
        {/* Toaster configurado com cores ricas e posição ideal para mobile */}
        <Toaster richColors position="top-center" />
        <HeaderComNav />
        <main>{children}</main>
      </body>
    </html>
  )
}