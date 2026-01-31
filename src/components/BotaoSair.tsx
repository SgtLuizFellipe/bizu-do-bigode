'use client'

// Mudança de @/lib/supabase para ../lib/supabase
import { supabase } from '../lib/supabase' 
import { useRouter } from 'next/navigation'

export function BotaoSair() {
  const router = useRouter()

  async function sair() {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <button
      type="button"
      onClick={sair}
className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-[10px] font-medium uppercase tracking-[0.15em] text-stone-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all active:scale-[0.98]"    >
      Sair
    </button>
  )
}