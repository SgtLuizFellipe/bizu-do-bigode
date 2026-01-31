'use client'

import { supabase } from '../../lib/supabase'
import { useState } from 'react'

type TipoCliente = 'militar' | 'civil' | null

export default function Clientes() {
  const [tipo, setTipo] = useState<TipoCliente>(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [posto, setPosto] = useState('')
  const [companhia, setCompanhia] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!nome.trim() || !telefone.trim()) {
      alert('Preencha nome e telefone.')
      return
    }
    if (tipo === 'militar' && !posto.trim()) {
      alert('Preencha o posto/graduação.')
      return
    }
    if (tipo === 'militar' && !companhia.trim()) {
      alert('Preencha a companhia.')
      return
    }

    setSalvando(true)
    
    // Objeto de inserção com tipagem segura
    const dadosParaSalvar = {
      tipo: tipo ?? 'civil',
      nome: nome.trim(),
      telefone: telefone.trim(),
      ...(tipo === 'militar' && { 
        posto_graduacao: posto.trim(), 
        companhia: companhia.trim() 
      }),
    }

    const { error } = await supabase.from('clientes').insert([dadosParaSalvar])

    setSalvando(false)
    if (error) {
      alert('Erro ao salvar. Tente de novo.')
      return
    }

    alert('Cliente salvo!')
    setNome('')
    setTelefone('')
    setPosto('')
    setCompanhia('')
    setTipo(null) // Opcional: reseta para a escolha inicial
  }

  return (
    <div className="min-h-screen bg-stone-100 p-6 pb-20">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-sm border border-stone-200">
        <h1 className="mb-6 text-xl font-bold text-stone-800">Cadastro de cliente</h1>

        {tipo === null ? (
          <div className="space-y-4">
            <p className="text-stone-600 font-medium text-center">O cliente é militar ou civil?</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTipo('militar')}
                className="flex-1 rounded-2xl bg-stone-800 py-4 text-white font-bold shadow-md hover:bg-stone-900 transition-all"
              >
                Militar
              </button>
              <button
                type="button"
                onClick={() => setTipo('civil')}
                className="flex-1 rounded-2xl bg-white border-2 border-stone-200 py-4 text-stone-700 font-bold hover:bg-stone-50 transition-all"
              >
                Civil
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => {
                setTipo(null)
                setNome('')
                setTelefone('')
                setPosto('')
                setCompanhia('')
              }}
              className="text-xs font-bold uppercase tracking-widest text-amber-600 hover:text-amber-700"
            >
              ← Trocar para {tipo === 'militar' ? 'Civil' : 'Militar'}
            </button>

            <div className="space-y-4">
              {tipo === 'militar' && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1 ml-1">Posto / Graduação</label>
                    <input
                      type="text"
                      value={posto}
                      onChange={(e) => setPosto(e.target.value)}
                      placeholder="Ex: Soldado, Cabo..."
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 placeholder-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1 ml-1">Companhia</label>
                    <input
                      type="text"
                      value={companhia}
                      onChange={(e) => setCompanhia(e.target.value)}
                      placeholder="Ex: 1ª Cia, CCS..."
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 placeholder-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-200 outline-none transition-all"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1 ml-1">Nome Completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 placeholder-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-200 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1 ml-1">Telefone (Zap)</label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="DDD + Número"
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 placeholder-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-200 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="w-full rounded-2xl bg-amber-600 py-4 text-white font-bold shadow-lg shadow-amber-200 hover:bg-amber-700 disabled:opacity-50 transition-all mt-4"
            >
              {salvando ? 'Processando...' : 'Finalizar Cadastro'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}