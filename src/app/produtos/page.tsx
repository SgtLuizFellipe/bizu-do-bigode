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

const ATALHOS = ['Sanduíche de Frango', 'Calabresa', 'Salame', 'Peito de Peru', 'Refrigerante', 'Suco', 'Energético']

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
      toast.error('Preencha o nome do produto.')
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
      toast.error('Erro ao salvar no banco de dados.')
      return
    }

    toast.success(idEdicao ? 'Produto atualizado!' : 'Produto adicionado!')
    limparFormulario()
    carregarProdutos()
  }

  async function excluirProduto(id: string) {
    if (!confirm('Deseja realmente remover este item?')) return
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir.')
      return
    }
    toast.success('Produto removido.')
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
    <div className="min-h-screen bg-stone-100 p-6 pb-24 text-stone-800">
      <div className="mx-auto max-w-md">
        
        <div className="mb-8 rounded-3xl bg-white p-8 shadow-sm border border-stone-200">
          <h1 className="mb-6 text-xl font-bold text-center italic">
            {idEdicao ? 'Editar Produto' : 'Cadastro de Estoque'}
          </h1>

          {!idEdicao && (
            <div className="mb-8">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-stone-400">Atalhos</p>
              <div className="flex flex-wrap gap-2">
                {ATALHOS.map((item) => (
                  <button key={item} type="button" onClick={() => setNome(item)} className="rounded-xl bg-stone-100 px-3 py-2 text-[10px] font-black text-stone-600 hover:bg-stone-800 hover:text-white transition-all">
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-stone-400 mb-1 ml-1">Nome</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:bg-white transition-all" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-black uppercase text-stone-400 mb-1 ml-1">Custo</label>
                <input type="number" value={custo || ''} onChange={(e) => setCusto(Number(e.target.value))} className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 outline-none focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-stone-400 mb-1 ml-1">Venda</label>
                <input type="number" value={venda || ''} onChange={(e) => setVenda(Number(e.target.value))} className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 outline-none focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-stone-400 mb-1 ml-1">Qtd Inicial</label>
                <input type="number" value={estoque || ''} onChange={(e) => setEstoque(Number(e.target.value))} className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 outline-none focus:bg-white transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-stone-400 mb-1 ml-1">Categoria</label>
              <div className="flex gap-2">
                {['comida', 'bebida'].map(cat => (
                  <button key={cat} type="button" onClick={() => setCategoria(cat)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${categoria === cat ? 'bg-stone-800 text-white' : 'bg-stone-50 text-stone-400'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={salvar} disabled={salvando} className="w-full rounded-2xl bg-amber-600 py-4 font-black uppercase tracking-widest text-white shadow-xl active:scale-95 transition-all mt-2">
              {salvando ? 'Processando...' : idEdicao ? 'Salvar Alterações' : 'Adicionar ao Estoque'}
            </button>
            {idEdicao && <button onClick={limparFormulario} className="w-full text-[10px] font-black text-stone-400 uppercase">Cancelar</button>}
          </div>
        </div>

        <div className="space-y-4">
          <SecaoProdutos titulo="🥪 Alimentos" cor="text-amber-600" itens={alimentos} onEdit={editarProduto} onDelete={excluirProduto} />
          <SecaoProdutos titulo="🥤 Bebidas" cor="text-blue-600" itens={bebidas} onEdit={editarProduto} onDelete={excluirProduto} />
        </div>
      </div>
    </div>
  )
}

function SecaoProdutos({ titulo, cor, itens, onEdit, onDelete }: any) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm border border-stone-200">
      <h2 className={`mb-4 text-[10px] font-black uppercase tracking-widest ${cor} italic`}>{titulo} ({itens.length})</h2>
      <div className="space-y-2">
        {itens.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
            <div>
              <span className="text-sm font-bold text-stone-700 block">{p.nome}</span>
              <span className={`text-[10px] font-black uppercase ${p.estoque < 5 ? 'text-red-500' : 'text-stone-400'}`}>
                Estoque: {p.estoque} un.
              </span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => onEdit(p)} className="text-[10px] font-black uppercase text-blue-500">Editar</button>
              <button onClick={() => onDelete(p.id)} className="text-[10px] font-black uppercase text-red-500">Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}