'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner' // Importação necessária

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    
    if (!email.trim() || !senha) {
      const msg = 'Preencha e-mail e senha.'
      setErro(msg)
      toast.error(msg)
      return
    }

    setCarregando(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password: senha 
      })
      
      if (error) {
        const msg = 'E-mail ou senha incorretos.'
        setErro(msg)
        toast.error(msg)
        setCarregando(false)
        return
      }

      toast.success('Acesso autorizado! Entrando...')
      
      router.refresh()
      
      setTimeout(() => {
        router.push('/')
      }, 500)

    } catch (err) {
      const msg = 'Erro ao conectar com o servidor.'
      setErro(msg)
      toast.error(msg)
      setCarregando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm border border-stone-200">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-stone-800 italic">BIZU DO BIGODE</h1>
          <p className="text-sm font-medium text-stone-400 uppercase tracking-widest mt-1">Acesso Restrito</p>
        </div>

        <form onSubmit={entrar} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 ml-1">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 placeholder-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-200 outline-none transition-all"
            />
          </div>

          <div>
            <label htmlFor="senha" className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 ml-1">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 placeholder-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-200 outline-none transition-all"
            />
          </div>

          {erro && (
            <div className="rounded-xl bg-red-50 p-3">
              <p className="text-center text-xs font-bold text-red-600">{erro}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-2xl bg-stone-800 py-4 font-bold text-white shadow-lg hover:bg-stone-900 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {carregando ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  )
}