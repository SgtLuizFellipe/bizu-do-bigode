'use client'

import { supabase } from '../../lib/supabase'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

type Produto = {
  id: string
  nome: string
  preco_custo: number
  preco_venda: number
  estoque: number
  categoria: string
}

const ATALHOS = ['Frango', 'Calabresa', 'Salame', 'Peito de Peru', 'Refrigerante', 'Suco', 'Energético']

export default function Produtos() {
  const [nome, setNome] = useState('')
  const [custo, setCusto] = useState<number>(0)
  const [venda, setVenda] = useState<number>(0)
  const [estoque, setEstoque] = useState<number>(0)
  const [categoria, setCategoria] = useState('comida')
  const [idEdicao, setIdEdicao] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [listaProdutos, setListaProdutos] = useState<Produto[]>([])

  async function carregarProdutos() {
    const { data } = await supabase.from('produtos').select('*').order('nome')
    if (data) setListaProdutos(data as Produto[])
  }

  useEffect(() => { carregarProdutos() }, [])

  async function salvar() {
    if (!nome.trim()) {
      toast.error('Informe o nome do item.')
      return
    }
    
    setSalvando(true)
    const dados = { 
      nome: nome.trim(), 
      preco_custo: Number(custo), 
      preco_venda: Number(venda),
      estoque: Number(estoque),
      categoria: categoria 
    }

    const { error } = idEdicao 
      ? await supabase.from('produtos').update(dados).eq('id', idEdicao)
      : await supabase.from('produtos').insert([dados])
    
    setSalvando(false)
    
    if (error) {
      toast.error('Erro ao processar operação.')
      return
    }

    toast.success(idEdicao ? 'Produto atualizado.' : 'Produto catalogado.')
    limparFormulario()
    carregarProdutos()
  }

  async function excluirProduto(id: string) {
    if (!confirm('Remover este item do inventário?')) return
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    if (error) {
      toast.error('Erro na exclusão.')
      return
    }
    toast.success('Item removido.')
    carregarProdutos()
  }

  function editarProduto(p: Produto) {
    setIdEdicao(p.id)
    setNome(p.nome)
    setCusto(p.preco_custo)
    setVenda(p.preco_venda)
    setEstoque(p.estoque)
    setCategoria(p.categoria || 'comida')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function limparFormulario() {
    setNome(''); setCusto(0); setVenda(0); setEstoque(0); setCategoria('comida'); setIdEdicao(null);
  }

  const alimentos = listaProdutos.filter(p => p.categoria !== 'bebida')
  const bebidas = listaProdutos.filter(p => p.categoria === 'bebida')

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-24 text-stone-900">
      <div className="mx-auto max-w-md">
        
        <div className="mb-8 rounded-xl bg-white p-8 shadow-sm border border-stone-200/60 ring-1 ring-stone-900/5">
          <header className="mb-8 text-center">
            <h1 className="text-xl font-medium tracking-tight text-stone-950 italic">
              {idEdicao ? 'Editar Registro' : 'Cadastro de Inventário'}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1">Gestão de Mercadorias</p>
          </header>

          {!idEdicao && (
            <div className="mb-8">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Atalhos Rápidos</p>
              <div className="flex flex-wrap gap-2">
                {ATALHOS.map((item) => (
                  <button key={item} type="button" onClick={() => setNome(item)} className="rounded-lg bg-stone-50 px-3 py-1.5 text-[10px] font-bold text-stone-600 hover:bg-stone-950 hover:text-white border border-stone-200/50 transition-all">
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">Descrição do Produto</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Sanduíche de Frango" className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-400 transition-all" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">Custo</label>
                <input type="number" value={custo || ''} onChange={(e) => setCusto(Number(e.target.value))} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-stone-400 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">Venda</label>
                <input type="number" value={venda || ''} onChange={(e) => setVenda(Number(e.target.value))} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-stone-400 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5 ml-1">Estoque</label>
                <input type="number" value={estoque || ''} onChange={(e) => setEstoque(Number(e.target.value))} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-stone-400 transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2 ml-1">Categoria de Item</label>
              <div className="flex gap-2">
                {['comida', 'bebida'].map(cat => (
                  <button key={cat} type="button" onClick={() => setCategoria(cat)} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.15em] border transition-all ${categoria === cat ? 'bg-stone-950 text-white border-stone-950' : 'bg-white text-stone-400 border-stone-200'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={salvar} disabled={salvando} className="w-full rounded-lg bg-stone-950 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-sm hover:bg-stone-800 disabled:opacity-50 transition-all active:scale-[0.98] mt-2">
              {salvando ? 'Processando...' : idEdicao ? 'Atualizar Registro' : 'Catalogar no Estoque'}
            </button>
            {idEdicao && <button onClick={limparFormulario} className="w-full text-[10px] font-bold text-stone-400 uppercase tracking-widest py-2">Cancelar Operação</button>}
          </div>
        </div>

        <div className="space-y-6">
          <SecaoProdutos titulo="🥪 Alimentos" cor="text-stone-950" itens={alimentos} onEdit={editarProduto} onDelete={excluirProduto} />
          <SecaoProdutos titulo="🥤 Bebidas" cor="text-stone-950" itens={bebidas} onEdit={editarProduto} onDelete={excluirProduto} />
        </div>
      </div>
    </div>
  )
}

function SecaoProdutos({ titulo, cor, itens, onEdit, onDelete }: any) {
  return (
    <div className="rounded-xl bg-white p-6 border border-stone-200/60 shadow-sm ring-1 ring-stone-900/5">
      <h2 className={`mb-5 text-[10px] font-bold uppercase tracking-[0.2em] ${cor} italic opacity-60`}>{titulo} ({itens.length})</h2>
      <div className="space-y-3">
        {itens.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between p-4 bg-stone-50/50 rounded-lg border border-stone-100">
            <div>
              <span className="text-sm font-semibold text-stone-900 block">{p.nome}</span>
              <div className="flex items-center gap-2 mt-1">
                <div className={`h-1.5 w-1.5 rounded-full ${p.estoque < 5 ? 'bg-red-500' : 'bg-stone-300'}`} />
                <span className={`text-[10px] font-medium uppercase tracking-tight ${p.estoque < 5 ? 'text-red-500 font-bold' : 'text-stone-400'}`}>
                  Qtd: {p.estoque} un.
                </span>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => onEdit(p)} className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-950 transition-colors">Editar</button>
              <button onClick={() => onDelete(p.id)} className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors">Remover</button>
            </div>
          </div>
        ))}
        {itens.length === 0 && <p className="text-center py-4 text-[10px] font-medium text-stone-300 uppercase italic">Nenhum item catalogado</p>}
      </div>
    </div>
  )
}