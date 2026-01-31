'use client'

import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'

export function BotaoSair() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function sair() {
    await supabase.auth.signOut()
    toast.success('Sessão encerrada.')
    window.location.href = '/login'
  }

  return (
    <button
      onClick={sair}
      className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all active:scale-[0.98]"
    >
      Sair
    </button>
  )
}