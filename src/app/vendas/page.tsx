'use client'

import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'

type Cliente = { id: string; nome: string; telefone?: string }
type Produto = { id: string; nome: string; preco_venda: number }
type ItemCarrinho = { produto: Produto; quantidade: number }

export default function Vendas() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [buscaCliente, setBuscaCliente] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [quantidadeAtual, setQuantidadeAtual] = useState(1)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    async function carregar() {
      const [resClientes, resProdutos] = await Promise.all([
        supabase.from('clientes').select('id, nome, telefone').order('nome'),
        supabase.from('produtos').select('id, nome, preco_venda').order('nome'),
      ])
      if (resClientes.data) setClientes(resClientes.data as Cliente[])
      if (resProdutos.data) setProdutos(resProdutos.data as Produto[])
    }
    carregar()
  }, [])

  const clientesFiltrados = buscaCliente.trim()
    ? clientes.filter(
        (c) =>
          c.nome.toLowerCase().includes(buscaCliente.toLowerCase()) ||
          (c.telefone ?? '').includes(buscaCliente)
      )
    : clientes

  function adicionarProduto(produto: Produto) {
    const qtd = quantidadeAtual < 1 ? 1 : quantidadeAtual
    const jaNoCarrinho = carrinho.find((i) => i.produto.id === produto.id)
    if (jaNoCarrinho) {
      setCarrinho(
        carrinho.map((i) =>
          i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + qtd } : i
        )
      )
    } else {
      setCarrinho([...carrinho, { produto, quantidade: qtd }])
    }
    setQuantidadeAtual(1)
  }

  function removerItem(produtoId: string) {
    setCarrinho(carrinho.filter((i) => i.produto.id !== produtoId))
  }

  const total = carrinho.reduce(
    (acc, item) => acc + Number(item.produto.preco_venda) * item.quantidade,
    0
  )

  async function venderFiado() {
    if (!clienteSelecionado) {
      alert('Escolha um cliente primeiro.')
      return
    }
    if (carrinho.length === 0) {
      alert('O carrinho está vazio.')
      return
    }

    setSalvando(true)

    // Inserção da venda principal
    const { data: venda, error: errVenda } = await supabase
      .from('vendas')
      .insert([
        {
          cliente_id: clienteSelecionado.id,
          valor_total: total,
          pago: false,
        },
      ])
      .select('id')
      .single()

    if (errVenda || !venda?.id) {
      setSalvando(false)
      alert('Erro ao criar venda no banco.')
      return
    }

    // Preparação dos itens para inserção em lote
    const itens = carrinho.map((item) => ({
      venda_id: venda.id,
      produto_id: item.produto.id,
      quantidade: item.quantidade,
      preco_unitario: Number(item.produto.preco_venda),
    }))

    const { error: errItens } = await supabase.from('itens_venda').insert(itens)
    
    setSalvando(false)

    if (errItens) {
      alert('Venda criada, mas erro ao salvar itens. Verifique o financeiro.')
      return
    }

    alert(`Venda registrada para ${clienteSelecionado.nome}!`)
    setClienteSelecionado(null)
    setCarrinho([])
    setBuscaCliente('')
  }

  return (
    <div className="min-h-screen bg-stone-100 p-6 pb-24">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-black text-stone-800">Ponto de Venda</h1>

        {/* Seleção de Cliente */}
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm border border-stone-200">
          <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-stone-400">Cliente</label>
          <input
            type="text"
            value={buscaCliente}
            onChange={(e) => setBuscaCliente(e.target.value)}
            placeholder="Nome ou telefone..."
            className="mb-3 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 outline-none focus:bg-white focus:ring-2 focus:ring-stone-200 transition-all"
          />
          <div className="max-h-40 overflow-y-auto rounded-2xl border border-stone-100 bg-stone-50 shadow-inner">
            {clientesFiltrados.length === 0 ? (
              <p className="p-4 text-center text-xs text-stone-400">Nenhum cliente encontrado.</p>
            ) : (
              clientesFiltrados.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setClienteSelecionado(c)
                    setBuscaCliente(c.nome)
                  }}
                  className={`block w-full px-4 py-3 text-left text-sm transition-colors border-b border-stone-100 last:border-0 ${
                    clienteSelecionado?.id === c.id ? 'bg-amber-100 text-amber-900 font-bold' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {c.nome} {c.telefone ? `– ${c.telefone}` : ''}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Seleção de Produtos */}
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm border border-stone-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-stone-400">Produtos</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-stone-400">Qtd:</span>
              <input
                type="number"
                min="1"
                value={quantidadeAtual}
                onChange={(e) => setQuantidadeAtual(Number(e.target.value) || 1)}
                className="w-16 rounded-xl border border-stone-200 bg-stone-50 px-2 py-1 text-center font-bold text-stone-800"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {produtos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => adicionarProduto(p)}
                className="rounded-2xl bg-stone-100 px-4 py-3 text-xs font-bold text-stone-700 hover:bg-stone-800 hover:text-white transition-all active:scale-95"
              >
                {p.nome} • R$ {Number(p.preco_venda).toFixed(2)}
              </button>
            ))}
          </div>
        </div>

        {/* Carrinho */}
        <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm border border-stone-200">
          <h2 className="mb-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Resumo do Pedido</h2>
          {carrinho.length === 0 ? (
            <p className="py-4 text-center text-sm text-stone-400 italic">O carrinho está vazio.</p>
          ) : (
            <div className="space-y-3">
              {carrinho.map((item) => (
                <div key={item.produto.id} className="flex items-center justify-between rounded-2xl bg-stone-50 p-4 border border-stone-100">
                  <div>
                    <p className="text-sm font-bold text-stone-800">{item.produto.nome}</p>
                    <p className="text-xs text-stone-500">{item.quantidade} un. × R$ {Number(item.produto.preco_venda).toFixed(2)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removerItem(item.produto.id)}
                    className="text-[10px] font-black uppercase tracking-tighter text-red-500 hover:text-red-700"
                  >
                    Remover
                  </button>
                </div>
              ))}
              <div className="mt-4 border-t border-stone-100 pt-4 flex justify-between items-center">
                <span className="text-sm font-bold text-stone-400 uppercase">Total a pagar:</span>
                <span className="text-2xl font-black text-amber-600 font-mono">R$ {total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={venderFiado}
          disabled={salvando || carrinho.length === 0 || !clienteSelecionado}
          className="w-full rounded-2xl bg-stone-800 py-5 text-lg font-black uppercase tracking-widest text-white shadow-xl hover:bg-stone-900 disabled:opacity-30 transition-all active:scale-[0.98]"
        >
          {salvando ? 'Processando...' : 'Confirmar Venda Fiada'}
        </button>
      </div>
    </div>
  )
}