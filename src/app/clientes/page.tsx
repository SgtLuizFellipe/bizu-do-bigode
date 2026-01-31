'use client'

import { supabase } from '../../lib/supabase'
import { useState } from 'react'
import { toast } from 'sonner' 

type TipoCliente = 'militar' | 'civil' | null

const OPCOES_POSTO = ['EV', 'EP', 'Cb', 'Sgt', 'Ten', 'Cap']
const OPCOES_CIA = ['1ª Cia', '2ª Cia', 'CCSV', 'Base', 'DE']

export default function Clientes() {
  const [tipo, setTipo] = useState<TipoCliente>(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [posto, setPosto] = useState('EV')
  const [companhia, setCompanhia] = useState('1ª Cia')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!nome.trim() || !telefone.trim()) {
      toast.error('Preencha nome e telefone.') 
      return
    }

    setSalvando(true)
    
    // Ajustado para os nomes reais das colunas no seu banco de dados
    const dadosParaSalvar = {
      tipo: tipo ?? 'civil',
      nome_completo: nome.trim(), // Atualizado de 'nome' para 'nome_completo'
      telefone: telefone.trim(),
      ...(tipo === 'militar' && { 
        posto_grad: posto, // Atualizado de 'posto_graduacao' para 'posto_grad'
        companhia: companhia 
      }),
    }

    const { error } = await supabase.from('clientes').insert([dadosParaSalvar])

    setSalvando(false)
    if (error) {
      toast.error('Erro ao salvar: ' + error.message) 
      return
    }

    toast.success('Cliente salvo com sucesso!') 
    setNome('')
    setTelefone('')
    setPosto('EV')
    setCompanhia('1ª Cia')
    setTipo(null)
  }

  return (
    <div className="min-h-screen bg-stone-100 p-6 pb-20">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-sm border border-stone-200">
        <h1 className="mb-6 text-xl font-bold text-stone-800 italic">Cadastro de cliente</h1>

        {tipo === null ? (
          <div className="space-y-4">
            <p className="text-stone-600 font-medium text-center italic">O cliente é militar ou civil?</p>
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
              }}
              className="text-xs font-bold uppercase tracking-widest text-amber-600 hover:text-amber-700"
            >
              ← Trocar para {tipo === 'militar' ? 'Civil' : 'Militar'}
            </button>

            <div className="space-y-4">
              {tipo === 'militar' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1 ml-1">Posto / Grad</label>
                    <select
                      value={posto}
                      onChange={(e) => setPosto(e.target.value)}
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:bg-white outline-none transition-all appearance-none"
                    >
                      {OPCOES_POSTO.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1 ml-1">Companhia</label>
                    <select
                      value={companhia}
                      onChange={(e) => setCompanhia(e.target.value)}
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:bg-white outline-none transition-all appearance-none"
                    >
                      {OPCOES_CIA.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </div>
                </div>
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