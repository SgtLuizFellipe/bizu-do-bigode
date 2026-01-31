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
      toast.error('Preencha os campos obrigatórios.') 
      return
    }

    setSalvando(true)
    
    const dadosParaSalvar = {
      tipo: tipo ?? 'civil',
      nome_completo: nome.trim(),
      telefone: telefone.trim(),
      ...(tipo === 'militar' && { 
        posto_grad: posto,
        companhia: companhia 
      }),
    }

    const { error } = await supabase.from('clientes').insert([dadosParaSalvar])

    setSalvando(false)
    if (error) {
      toast.error('Erro ao salvar no banco.') 
      return
    }

    toast.success('Registro concluído.') 
    setNome(''); setTelefone(''); setPosto('EV'); setCompanhia('1ª Cia'); setTipo(null);
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-20">
      <div className="mx-auto max-w-md rounded-xl bg-white p-8 shadow-sm border border-stone-200/60 ring-1 ring-stone-900/5">
        <header className="mb-8">
          <h1 className="text-xl font-medium tracking-tight text-stone-950 italic">Cadastro de Cliente</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1">Gestão de Identidade</p>
        </header>

        {tipo === null ? (
          <div className="space-y-6">
            <p className="text-sm text-stone-500 font-medium">Selecione o perfil do cliente:</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTipo('militar')}
                className="flex-1 rounded-lg bg-stone-950 py-3.5 text-white text-xs font-semibold tracking-wide shadow-sm hover:bg-stone-800 transition-all"
              >
                Militar
              </button>
              <button
                type="button"
                onClick={() => setTipo('civil')}
                className="flex-1 rounded-lg bg-white border border-stone-200 py-3.5 text-stone-600 text-xs font-semibold tracking-wide hover:bg-stone-50 transition-all"
              >
                Civil
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => { setTipo(null); setNome(''); setTelefone(''); }}
              className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-950 transition-colors"
            >
              ← Alterar Perfil
            </button>

            <div className="space-y-4">
              {tipo === 'militar' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">Patente</label>
                    <select
                      value={posto}
                      onChange={(e) => setPosto(e.target.value)}
                      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400 transition-all appearance-none cursor-pointer"
                    >
                      {OPCOES_POSTO.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">Subunidade</label>
                    <select
                      value={companhia}
                      onChange={(e) => setCompanhia(e.target.value)}
                      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-400 transition-all appearance-none cursor-pointer"
                    >
                      {OPCOES_CIA.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">Nome Completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder-stone-300 outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-900/5 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">WhatsApp</label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder-stone-300 outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-900/5 transition-all"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="w-full rounded-lg bg-stone-950 py-4 text-white text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-stone-800 disabled:opacity-50 transition-all mt-4 active:scale-[0.98]"
            >
              {salvando ? 'Processando...' : 'Confirmar Cadastro'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}