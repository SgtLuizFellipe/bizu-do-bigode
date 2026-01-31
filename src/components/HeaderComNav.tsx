'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BotaoSair } from './BotaoSair'

export default function HeaderComNav() {
  const pathname = usePathname()
  
  if (pathname === '/login') return null

  const navLinks = [
    { name: 'Início', href: '/' },
    { name: 'Vendas', href: '/vendas' },
    { name: 'Produtos', href: '/produtos' },
    { name: 'Clientes', href: '/clientes' },
    { name: 'Cobranças', href: '/cobrancas' },
    { name: 'Extrato', href: '/extrato' },
    { name: 'Análise', href: '/analise' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <nav className="flex flex-wrap items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                pathname === link.href
                  ? 'bg-stone-800 text-white shadow-sm'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>
        <BotaoSair />
      </div>
    </header>
  )
}