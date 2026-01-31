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
      className="rounded-xl bg-stone-100 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-stone-500 hover:bg-red-50 hover:text-red-600 transition-all active:scale-95"
    >
      Sair
    </button>
  )
}