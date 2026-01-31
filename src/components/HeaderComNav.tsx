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
    { name: 'Fechamento', href: 'fechamento' }
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/60 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <nav className="flex flex-wrap items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3.5 py-1.5 text-[11px] font-medium tracking-tight transition-all duration-200 ${
                  isActive
                    ? 'bg-stone-950 text-white shadow-sm ring-1 ring-stone-950'
                    : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                {link.name}
              </Link>
            )
          })}
        </nav>
        
        <div className="flex items-center border-l border-stone-200 pl-4 ml-auto">
          <BotaoSair />
        </div>
      </div>
    </header>
  )
}