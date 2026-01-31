'use client'

import { supabase } from '../../lib/supabase'
import { useState } from 'react'

const ATALHOS = [
  'Sanduíche de Frango',
  'Calabresa',
  'Salame',
  'Peito de Peru',
  'Refrigerante',
  'Suco',
  'Energético',
]

export default function Produtos() {
  const [nome, setNome] = useState('')
  const [custo, setCusto] = useState<number>(0)
  const [venda, setVenda] = useState<number>(0)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!nome.trim()) {
      alert('Preencha o nome do produto.')
      return
    }
    
    setSalvando(true)
    
    const { error } = await supabase.from('produtos').insert([
      { 
        nome: nome.trim(), 
        preco_custo: Number(custo), 
        preco_venda: Number(venda) 
      },
    ])
    
    setSalvando(false)
    
    if (error) {
      alert('Erro ao salvar. Tente de novo.')
      return
    }

    alert('Produto salvo com sucesso!')
    setNome('')
    setCusto(0)
    setVenda(0)
  }

  return (
    <div className="min-h-screen bg-stone-100 p-6 pb-20">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-sm border border-stone-200">
        <h1 className="mb-6 text-xl font-bold text-stone-800 text-center">Cadastro de Estoque</h1>

        <div className="mb-8">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Atalhos Rápidos</p>
          <div className="flex flex-wrap gap-2">
            {ATALHOS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setNome(item)}
                className="rounded-xl bg-stone-100 px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-800 hover:text-white transition-all active:scale-95"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-stone-400 mb-2 ml-1">Nome do Produto</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Coca-Cola 350ml"
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 placeholder-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-200 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-stone-400 mb-2 ml-1">Custo (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={custo || ''}
                onChange={(e) => setCusto(Number(e.target.value) || 0)}
                placeholder="0,00"
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 placeholder-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-200 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-stone-400 mb-2 ml-1">Venda (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={venda || ''}
                onChange={(e) => setVenda(Number(e.target.value) || 0)}
                placeholder="0,00"
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 placeholder-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-200 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="w-full rounded-2xl bg-amber-600 py-4 text-white font-bold shadow-lg shadow-amber-100 hover:bg-amber-700 disabled:opacity-50 transition-all mt-4 active:scale-[0.98]"
          >
            {salvando ? 'Salvando no Banco...' : 'Adicionar ao Estoque'}
          </button>
        </div>
      </div>
    </div>
  )
}