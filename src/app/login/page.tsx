'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    
    if (!email.trim() || !senha) {
      toast.error('Preencha as credenciais.')
      return
    }

    setCarregando(true)

    try {
      const { error, data } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password: senha 
      })
      
      if (error) {
        if (error.message.includes('Refresh Token')) {
          await supabase.auth.signOut()
          toast.error('Sessão expirada. Tente novamente.')
        } else {
          toast.error('Credenciais inválidas.')
        }
        setCarregando(false)
        return
      }

      if (data?.session) {
        toast.success('Acesso autorizado.')
        window.location.replace('/')
      }

    } catch (err) {
      toast.error('Erro de conexão.')
      setCarregando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-6">
      <div className="w-full max-w-sm rounded-xl bg-white p-10 shadow-sm border border-stone-200/60 ring-1 ring-stone-900/5">
        <header className="mb-10 text-center">
          <h1 className="text-2xl font-medium tracking-tight text-stone-950 italic">BIZU DO BIGODE</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mt-2">Sistema de Gestão</p>
        </header>

        <form onSubmit={entrar} className="space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@bizu.com"
              className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder-stone-300 outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-900/5 transition-all"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="senha" className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder-stone-300 outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-900/5 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-lg bg-stone-950 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-sm hover:bg-stone-800 disabled:opacity-50 transition-all active:scale-[0.98] mt-2"
          >
            {carregando ? 'Verificando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <footer className="mt-10 text-center">
          <p className="text-[9px] font-medium text-stone-300 uppercase tracking-tighter">Terminal Seguro • v2.1</p>
        </footer>
      </div>
    </div>
  )
}