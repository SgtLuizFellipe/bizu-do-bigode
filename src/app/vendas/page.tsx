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

  // Filtra apenas militares e pelo termo de busca
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
      toast.error('Selecione o cliente e adicione itens.')
      return
    }

    setSalvando(true)

    try {
      // 1. Verificar estoque de todos os itens antes de começar
      for (const item of carrinho) {
        const { data: prod } = await supabase
          .from('produtos')
          .select('estoque, nome')
          .eq('id', item.produto.id)
          .single()

        if (prod && prod.estoque < item.quantidade) {
          toast.error(`Estoque insuficiente: ${prod.nome} (Disponível: ${prod.estoque})`)
          setSalvando(false)
          return
        }
      }

      // 2. Criar a Venda
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

      if (errVenda || !venda) throw new Error('Erro ao criar venda')

      // 3. Inserir Itens e Baixar Estoque
      for (const item of carrinho) {
        // Registra o item da venda
        await supabase.from('itens_venda').insert({
          venda_id: venda.id,
          produto_id: item.produto.id,
          quantidade: item.quantidade,
          preco_unitario: Number(item.produto.preco_venda),
        })

        // Subtrai do estoque real no banco
        const { data: prodAtual } = await supabase
          .from('produtos')
          .select('estoque')
          .eq('id', item.produto.id)
          .single()
        
        const novoEstoque = (prodAtual?.estoque || 0) - item.quantidade

        await supabase
          .from('produtos')
          .update({ estoque: novoEstoque })
          .eq('id', item.produto.id)
      }

      toast.success(`Venda para ${clienteSelecionado.nome_completo} ok! Estoque atualizado.`)
      setCarrinho([])
      setClienteSelecionado(null)
      setBuscaCliente('')

    } catch (err) {
      toast.error('Ocorreu um erro ao processar a venda.')
      console.error(err)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 p-6 pb-24 text-stone-800">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-black italic">Ponto de Venda</h1>

        {/* Seleção de Cliente */}
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm border border-stone-200">
          <label className="mb-2 block text-[10px] font-black uppercase text-stone-400">Militar (Hierarquia)</label>
          <input
            type="text"
            value={buscaCliente}
            onChange={(e) => { setBuscaCliente(e.target.value); setClienteSelecionado(null); }}
            placeholder="Pesquisar militar..."
            className="mb-3 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:bg-white transition-all"
          />
          <div className="max-h-48 overflow-y-auto rounded-2xl border border-stone-100 bg-stone-50">
            {militaresFiltrados.map((c) => (
              <button
                key={c.id}
                onClick={() => { setClienteSelecionado(c); setBuscaCliente(`${c.posto_grad} ${c.nome_completo}`) }}
                className={`block w-full px-4 py-3 text-left text-sm border-b border-stone-100 last:border-0 ${clienteSelecionado?.id === c.id ? 'bg-amber-100 font-bold' : 'hover:bg-white'}`}
              >
                <span className="text-amber-600 mr-2 font-black">{c.posto_grad}</span> {c.nome_completo}
              </button>
            ))}
            
            {/* Atalho para cadastro se não encontrar ou lista vazia */}
            {(militaresFiltrados.length === 0 && buscaCliente.trim() !== '') && (
              <Link 
                href="/clientes"
                className="block w-full px-4 py-4 text-center text-xs font-black uppercase tracking-widest text-amber-600 bg-amber-50 hover:bg-amber-100"
              >
                + Cadastrar militar
              </Link>
            )}
          </div>
        </div>

        {/* Produtos */}
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm border border-stone-200">
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-[10px] font-black text-amber-600 uppercase italic">🥪 Alimentos</p>
              <div className="grid grid-cols-2 gap-2">
                {alimentos.map(p => (
                  <button key={p.id} onClick={() => adicionarProduto(p)} className="flex justify-between rounded-xl bg-stone-50 p-3 text-xs font-bold active:bg-stone-200 transition-all">
                    <span>{p.nome}</span>
                    <span className="text-stone-300">R$ {Number(p.preco_venda).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black text-blue-600 uppercase italic">🥤 Bebidas</p>
              <div className="grid grid-cols-2 gap-2">
                {bebidas.map(p => (
                  <button key={p.id} onClick={() => adicionarProduto(p)} className="flex justify-between rounded-xl bg-stone-50 p-3 text-xs font-bold active:bg-stone-200 transition-all">
                    <span>{p.nome}</span>
                    <span className="text-stone-300">R$ {Number(p.preco_venda).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Carrinho */}
        {carrinho.length > 0 && (
          <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm border border-stone-200">
            <h2 className="mb-3 text-[10px] font-black uppercase text-stone-400 italic">Carrinho</h2>
            <div className="space-y-2">
              {carrinho.map(item => (
                <div key={item.produto.id} className="flex items-center justify-between border-b border-stone-50 pb-2">
                  <span className="text-sm font-bold">{item.quantidade}x {item.produto.nome}</span>
                  <button onClick={() => removerUm(item.produto.id)} className="text-red-500 font-bold text-[10px] uppercase">Remover</button>
                </div>
              ))}
              <div className="pt-2 text-right">
                <p className="text-2xl font-black text-amber-600 font-mono">R$ {total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm border border-stone-200">
          <div className="grid grid-cols-2 gap-2">
            {(['pix', 'dinheiro', 'cartao', 'fiado'] as MetodoPagamento[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetodo(m)}
                className={`py-4 rounded-2xl text-[10px] font-black uppercase border transition-all ${metodo === m ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-400 border-stone-200'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={finalizarVenda}
          disabled={salvando || carrinho.length === 0}
          className={`w-full rounded-2xl py-5 text-lg font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 ${metodo === 'fiado' ? 'bg-amber-600' : 'bg-green-600'}`}
        >
          {salvando ? 'Processando...' : 'Finalizar Venda'}
        </button>
      </div>
    </div>
  )
}