'use client'

import { supabase } from '../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

type Periodo = 'hoje' | 'mes'

type Venda = {
  id: string
  valor_total: number
  pago: boolean
  data_venda?: string
}

type ItemVenda = {
  venda_id: string
  produto_id: string
  quantidade: number
  preco_unitario: number
  custo_produto?: number
}

type Baixa = {
  id: string
  custo_total: number
  data_baixa: string
}

type Produto = {
  id: string
  nome: string
  preco_custo: number
  preco_venda: number
  estoque: number
}

export default function Analise() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([])
  const [baixas, setBaixas] = useState<Baixa[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      try {
        const [resVendas, resItens, resProdutos, resBaixas] = await Promise.all([
          supabase.from('vendas').select('id, valor_total, pago, data_venda'),
          supabase.from('itens_venda').select('venda_id, produto_id, quantidade, preco_unitario'),
          supabase.from('produtos').select('id, nome, preco_custo, preco_venda, estoque'),
          supabase.from('baixas').select('id, custo_total, data_baixa')
        ])
        
        if (resVendas.error || resItens.error || resProdutos.error) {
          toast.error('Erro na sincronização de dados.')
          return
        }

        const produtosMap = new Map()
        resProdutos.data?.forEach(p => produtosMap.set(p.id, p))

        setVendas(resVendas.data || [])
        setProdutos(resProdutos.data || [])
        setBaixas(resBaixas.data || [])
        
        const itensFormatados = (resItens.data || []).map(item => ({
          ...item,
          nome_produto: produtosMap.get(item.produto_id)?.nome || 'Produto',
          custo_produto: produtosMap.get(item.produto_id)?.preco_custo || 0
        }))
        
        setItensVenda(itensFormatados)
      } catch (err) {
        console.error(err)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  const stats = useMemo(() => {
    const hoje = new Date()
    
    const filtrarPorData = (dataStr?: string) => {
      if (!dataStr) return false
      const dataV = new Date(dataStr)
      return periodo === 'hoje' 
        ? dataV.toDateString() === hoje.toDateString()
        : dataV.getMonth() === hoje.getMonth() && dataV.getFullYear() === hoje.getFullYear()
    }

    const vendasFiltradas = vendas.filter(v => filtrarPorData(v.data_venda))
    const baixasFiltradas = baixas.filter(b => filtrarPorData(b.data_baixa))

    const bruto = vendasFiltradas.reduce((s, v) => s + (Number(v.valor_total) || 0), 0)
    const fiado = vendasFiltradas.filter((v) => !v.pago).reduce((s, v) => s + (Number(v.valor_total) || 0), 0)
    const perdasTotal = baixasFiltradas.reduce((s, b) => s + (Number(b.custo_total) || 0), 0)

    const idsVendasFiltradas = new Set(vendasFiltradas.map((v) => v.id))
    const itensFiltrados = itensVenda.filter((i) => idsVendasFiltradas.has(i.venda_id))
    
    // Lucro Líquido das vendas menos as perdas (consumo/avaria)
    const lucroVendas = itensFiltrados.reduce((s, i) => {
      return s + (Number(i.quantidade) * (Number(i.preco_unitario) - Number(i.custo_produto)))
    }, 0)

    const liquidoReal = lucroVendas - perdasTotal

    const porProduto = new Map<string, number>()
    for (const i of itensFiltrados) {
      const nome = (i as any).nome_produto ?? 'Produto'
      porProduto.set(nome, (porProduto.get(nome) ?? 0) + Number(i.quantidade))
    }
    
    const rank = Array.from(porProduto.entries())
      .map(([nome, qtd]) => ({ nome, quantidade: qtd }))
      .sort((a, b) => b.quantidade - a.quantidade)

    const investimentoTotal = produtos.reduce((s, p) => s + (Number(p.estoque) * Number(p.preco_custo)), 0)
    const lucroPotencial = produtos.reduce((s, p) => s + (Number(p.estoque) * (Number(p.preco_venda) - Number(p.preco_custo))), 0)

    return { bruto, liquido: liquidoReal, fiado, perdasTotal, rank, investimentoTotal, lucroPotencial }
  }, [vendas, itensVenda, produtos, baixas, periodo])

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-20 text-stone-900">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-xl font-medium tracking-tight text-stone-950 italic">Resumo de Performance</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1">Inteligência de Negócio</p>
        </header>

        <div className="mb-8 flex gap-2 bg-white p-1 rounded-lg shadow-sm border border-stone-200/60 ring-1 ring-stone-900/5">
          {(['hoje', 'mes'] as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)} className={`flex-1 rounded-md py-2.5 text-[11px] font-bold uppercase tracking-widest transition-all ${periodo === p ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
              {p}
            </button>
          ))}
        </div>

        {carregando ? (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-3 gap-4"><div className="h-24 rounded-xl bg-white" /></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card title="Receita Bruta" value={stats.bruto} color="text-stone-950" />
              <Card title="Prejuízo / Baixas" value={stats.perdasTotal} color="text-red-600" />
              <Card title="Lucro Real" value={stats.liquido} color="text-stone-950" />
            </div>

            <div className="rounded-xl bg-stone-950 p-6 text-white shadow-lg">
              <header className="mb-6 flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50 italic">Patrimônio em Gôndola</h2>
              </header>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-1">Custo de Inventário</p>
                  <p className="text-2xl font-light tracking-tighter">R$ {stats.investimentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-1">Fiado Pendente</p>
                  <p className="text-2xl font-light tracking-tighter text-red-400 italic">R$ {stats.fiado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 border border-stone-200/60 shadow-sm ring-1 ring-stone-900/5">
              <h2 className="mb-5 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 italic">Ranking de Saída</h2>
              <div className="space-y-3">
                {stats.rank.map((item, idx) => (
                  <div key={item.nome} className="flex items-center justify-between border-b border-stone-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold text-stone-300">#0{idx + 1}</span>
                      <span className="text-sm font-medium text-stone-700">{item.nome}</span>
                    </div>
                    <span className="text-xs font-bold text-stone-950">{item.quantidade} <span className="text-[10px] font-normal text-stone-400 uppercase ml-0.5">un</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-white p-5 border border-stone-200/60 shadow-sm ring-1 ring-stone-900/5">
      <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-2">{title}</p>
      <p className={`text-lg font-bold tracking-tight ${color}`}>
        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
    </div>
  )
}