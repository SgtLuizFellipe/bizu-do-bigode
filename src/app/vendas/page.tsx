'use client'

import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'

type Cliente = { 
  id: string; 
  nome_completo: string; 
  posto_grad?: string; 
  telefone?: string;
  tipo?: string; 
}
type Produto = { id: string; nome: string; preco_venda: number; categoria: string }
type ItemCarrinho = { produto: Produto; quantidade: number }
type MetodoPagamento = 'pix' | 'dinheiro' | 'cartao' | 'fiado'

const ORDEM_HIERARQUICA: Record<string, number> = {
  'Ten': 1,
  'Sgt': 2,
  'Cb': 3,
  'EP': 4,
  'EV': 5
};

export default function Vendas() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [buscaCliente, setBuscaCliente] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [salvando, setSalvando] = useState(false)
  const [metodo, setMetodo] = useState<MetodoPagamento>('pix')

  useEffect(() => {
    async function carregar() {
      const [resClientes, resProdutos] = await Promise.all([
        supabase.from('clientes').select('id, nome_completo, posto_grad, telefone, tipo'),
        supabase.from('produtos').select('id, nome, preco_venda, categoria').order('nome'),
      ])
      
      if (resClientes.data) {
        const ordenados = [...resClientes.data].sort((a, b) => {
          const pesoA = ORDEM_HIERARQUICA[a.posto_grad || ''] || 99;
          const pesoB = ORDEM_HIERARQUICA[b.posto_grad || ''] || 99;
          if (pesoA !== pesoB) return pesoA - pesoB;
          return a.nome_completo.localeCompare(b.nome_completo);
        });
        setClientes(ordenados as Cliente[]);
      }
      if (resProdutos.data) setProdutos(resProdutos.data as Produto[])
    }
    carregar()
  }, [])

  const militaresFiltrados = clientes.filter(c => 
    c.tipo === 'militar' && 
    c.nome_completo.toLowerCase().includes(buscaCliente.toLowerCase())
  )

  function adicionarProduto(produto: Produto) {
    const jaNoCarrinho = carrinho.find((i) => i.produto.id === produto.id)
    if (jaNoCarrinho) {
      setCarrinho(carrinho.map((i) =>
        i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i
      ))
    } else {
      setCarrinho([...carrinho, { produto, quantidade: 1 }])
      toast.info(`${produto.nome} adicionado`)
    }
  }

  function removerUm(produtoId: string) {
    const item = carrinho.find(i => i.produto.id === produtoId)
    if (item && item.quantidade > 1) {
      setCarrinho(carrinho.map(i => i.produto.id === produtoId ? { ...i, quantidade: i.quantidade - 1 } : i))
    } else {
      setCarrinho(carrinho.filter(i => i.produto.id !== produtoId))
      toast.info("Item removido")
    }
  }

  const total = carrinho.reduce((acc, item) => acc + Number(item.produto.preco_venda) * item.quantidade, 0)
  const alimentos = produtos.filter(p => p.categoria !== 'bebida')
  const bebidas = produtos.filter(p => p.categoria === 'bebida')

  async function finalizarVenda() {
    if (carrinho.length === 0 || !clienteSelecionado) {
      toast.error('Identifique o cliente e os itens.')
      return
    }

    setSalvando(true)

    try {
      for (const item of carrinho) {
        const { data: prod } = await supabase
          .from('produtos')
          .select('estoque, nome')
          .eq('id', item.produto.id)
          .single()

        if (prod && prod.estoque < item.quantidade) {
          toast.error(`Estoque baixo: ${prod.nome}`)
          setSalvando(false)
          return
        }
      }

      const { data: venda, error: errVenda } = await supabase
        .from('vendas')
        .insert([{
          cliente_id: clienteSelecionado.id,
          valor_total: total,
          pago: metodo !== 'fiado',
          metodo_pagamento: metodo,
          data_venda: new Date().toISOString()
        }])
        .select('id').single()

      if (errVenda || !venda) throw new Error('Falha na venda')

      for (const item of carrinho) {
        await supabase.from('itens_venda').insert({
          venda_id: venda.id,
          produto_id: item.produto.id,
          quantidade: item.quantidade,
          preco_unitario: Number(item.produto.preco_venda),
        })

        const { data: prodAtual } = await supabase
          .from('produtos')
          .select('estoque')
          .eq('id', item.produto.id)
          .single()
        
        await supabase
          .from('produtos')
          .update({ estoque: (prodAtual?.estoque || 0) - item.quantidade })
          .eq('id', item.produto.id)
      }

      toast.success(`Operação concluída.`)
      setCarrinho([]); setClienteSelecionado(null); setBuscaCliente('');

    } catch (err) {
      toast.error('Erro ao processar venda.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-24 text-stone-900">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-xl font-medium tracking-tight text-stone-950 italic">Ponto de Venda</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1">Terminal de Operações</p>
        </header>

        {/* Seleção de Cliente */}
        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm border border-stone-200/60 ring-1 ring-stone-900/5">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-400">Militar (Hierarquia)</label>
          <input
            type="text"
            value={buscaCliente}
            onChange={(e) => { setBuscaCliente(e.target.value); setClienteSelecionado(null); }}
            placeholder="Pesquisar militar..."
            className="mb-4 w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-400 transition-all"
          />
          <div className="max-h-40 overflow-y-auto rounded-lg border border-stone-100 bg-stone-50/50">
            {militaresFiltrados.map((c) => (
              <button
                key={c.id}
                onClick={() => { setClienteSelecionado(c); setBuscaCliente(`${c.posto_grad} ${c.nome_completo}`) }}
                className={`block w-full px-4 py-2.5 text-left text-xs border-b border-stone-100 last:border-0 ${clienteSelecionado?.id === c.id ? 'bg-stone-950 text-white font-semibold' : 'hover:bg-white'}`}
              >
                <span className={`${clienteSelecionado?.id === c.id ? 'text-stone-300' : 'text-stone-400'} mr-2 font-bold`}>{c.posto_grad}</span> {c.nome_completo}
              </button>
            ))}
            
            {militaresFiltrados.length === 0 && buscaCliente.trim() !== '' && (
              <Link href="/clientes" className="block w-full px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-950 transition-colors">
                + Cadastrar Militar
              </Link>
            )}
          </div>
        </section>

        {/* Cardápio */}
        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm border border-stone-200/60 ring-1 ring-stone-900/5">
          <div className="space-y-8">
            <div>
              <p className="mb-3 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] italic border-b border-stone-100 pb-1">🥪 Alimentos</p>
              <div className="grid grid-cols-2 gap-2">
                {alimentos.map(p => (
                  <button key={p.id} onClick={() => adicionarProduto(p)} className="flex justify-between items-center rounded-lg bg-stone-50/50 border border-stone-100 p-3 text-[11px] font-semibold hover:bg-white hover:border-stone-200 transition-all">
                    <span className="text-stone-700">{p.nome}</span>
                    <span className="text-stone-400 font-medium">R$ {Number(p.preco_venda).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] italic border-b border-stone-100 pb-1">🥤 Bebidas</p>
              <div className="grid grid-cols-2 gap-2">
                {bebidas.map(p => (
                  <button key={p.id} onClick={() => adicionarProduto(p)} className="flex justify-between items-center rounded-lg bg-stone-50/50 border border-stone-100 p-3 text-[11px] font-semibold hover:bg-white hover:border-stone-200 transition-all">
                    <span className="text-stone-700">{p.nome}</span>
                    <span className="text-stone-400 font-medium">R$ {Number(p.preco_venda).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Resumo da Operação */}
        {carrinho.length > 0 && (
          <section className="mb-6 rounded-xl bg-stone-950 p-6 text-white shadow-lg shadow-stone-200">
            <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">Resumo da Operação</h2>
            <div className="space-y-3">
              {carrinho.map(item => (
                <div key={item.produto.id} className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-medium">{item.quantidade}x {item.produto.nome}</span>
                  <button onClick={() => removerUm(item.produto.id)} className="text-[10px] font-bold uppercase text-white/40 hover:text-white">Remover</button>
                </div>
              ))}
              <div className="pt-4 text-right">
                <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Total</p>
                <p className="text-3xl font-light tracking-tighter italic">R$ {total.toFixed(2)}</p>
              </div>
            </div>
          </section>
        )}

        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm border border-stone-200/60 ring-1 ring-stone-900/5">
          <div className="grid grid-cols-4 gap-2">
            {(['pix', 'dinheiro', 'cartao', 'fiado'] as MetodoPagamento[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetodo(m)}
                className={`py-3 rounded-lg text-[9px] font-bold uppercase tracking-[0.15em] border transition-all ${metodo === m ? 'bg-stone-950 text-white border-stone-950 shadow-sm' : 'bg-white text-stone-400 border-stone-100 hover:bg-stone-50'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={finalizarVenda}
          disabled={salvando || carrinho.length === 0}
          className="w-full rounded-lg bg-stone-950 py-5 text-[11px] font-bold uppercase tracking-[0.25em] text-white shadow-xl hover:bg-stone-800 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {salvando ? 'Processando...' : 'Confirmar Operação'}
        </button>
      </div>
    </div>
  )
}