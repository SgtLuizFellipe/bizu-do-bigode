'use client'

import { supabase } from '../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'

type Periodo = 'hoje' | 'mes'

type Venda = {
  id: string
  valor_total: number
  pago: boolean
  created_at?: string
}

type ItemVenda = {
  venda_id: string
  produto_id: string
  quantidade: number
  preco_unitario: number
  produtos: { nome: string; preco_custo: number; preco_venda: number } | null
}

export default function Analise() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([])
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      const [resVendas, resItens] = await Promise.all([
        supabase.from('vendas').select('id, valor_total, pago, created_at'),
        supabase.from('itens_venda').select('venda_id, produto_id, quantidade, preco_unitario, produtos(nome, preco_custo, preco_venda)'),
      ])
      
      if (resVendas.data) setVendas(resVendas.data as Venda[])
      
      if (resItens.data) {
        // Correção de tipagem para garantir que o TypeScript entenda a estrutura do Supabase
        const itensFormatados = (resItens.data as any[]).map(item => ({
          ...item,
          produtos: Array.isArray(item.produtos) ? item.produtos[0] : item.produtos
        }))
        setItensVenda(itensFormatados as ItemVenda[])
      }
      setCarregando(false)
    }
    carregar()
  }, [])

  const { lucroBruto, lucroLiquido, totalAReceber, ranking } = useMemo(() => {
    const hoje = new Date()
    const vendasFiltradas = vendas.filter((v) => {
      if (!v.created_at) return false
      const dataVenda = new Date(v.created_at)
      
      if (periodo === 'hoje') {
        return (
          dataVenda.getDate() === hoje.getDate() &&
          dataVenda.getMonth() === hoje.getMonth() &&
          dataVenda.getFullYear() === hoje.getFullYear()
        )
      } else {
        return (
          dataVenda.getMonth() === hoje.getMonth() &&
          dataVenda.getFullYear() === hoje.getFullYear()
        )
      }
    })

    const idsVendasFiltradas = new Set(vendasFiltradas.map((v) => v.id))

    const lucroBruto = vendasFiltradas.reduce((s, v) => s + (Number(v.valor_total) || 0), 0)
    const totalAReceber = vendasFiltradas
      .filter((v) => !v.pago)
      .reduce((s, v) => s + (Number(v.valor_total) || 0), 0)

    const itensFiltrados = itensVenda.filter((i) => idsVendasFiltradas.has(i.venda_id))
    
    const lucroLiquido = itensFiltrados.reduce((s, i) => {
      const p = i.produtos
      if (!p) return s
      const custo = Number(p.preco_custo) || 0
      const venda = Number(i.preco_unitario) || 0
      return s + (Number(i.quantidade) * (venda - custo))
    }, 0)

    const porProduto = new Map<string, number>()
    for (const i of itensFiltrados) {
      const nome = i.produtos?.nome ?? 'Produto'
      porProduto.set(nome, (porProduto.get(nome) ?? 0) + Number(i.quantidade))
    }
    
    const ranking = Array.from(porProduto.entries())
      .map(([nome, qtd]) => ({ nome, quantidade: qtd }))
      .sort((a, b) => b.quantidade - a.quantidade)

    return { lucroBruto, lucroLiquido, totalAReceber, ranking }
  }, [vendas, itensVenda, periodo])

  return (
    <div className="min-h-screen bg-stone-100 p-6 pb-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-xl font-bold text-stone-800">Resumo Financeiro</h1>

        <div className="mb-6 flex gap-2 bg-white p-1 rounded-2xl shadow-sm">
          <button
            type="button"
            onClick={() => setPeriodo('hoje')}
            className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all ${
              periodo === 'hoje' ? 'bg-stone-800 text-white shadow-md' : 'text-stone-500'
            }`}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setPeriodo('mes')}
            className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all ${
              periodo === 'mes' ? 'bg-stone-800 text-white shadow-md' : 'text-stone-500'
            }`}
          >
            Mês
          </button>
        </div>

        {carregando ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 rounded-3xl bg-white shadow-sm" />
            <div className="h-64 rounded-3xl bg-white shadow-sm" />
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card title="Bruto" value={lucroBruto} color="text-stone-800" />
              <Card title="Líquido" value={lucroLiquido} color="text-green-600" />
              <Card title="Fiado" value={totalAReceber} color="text-red-600" />
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm border border-stone-200">
              <h2 className="mb-4 text-lg font-bold text-stone-800">Mais vendidos</h2>
              <div className="space-y-3">
                {ranking.map((item, idx) => (
                  <div key={item.nome} className="flex items-center justify-between border-b border-stone-50 pb-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-[10px] font-black text-stone-500">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-stone-700">{item.nome}</span>
                    </div>
                    <span className="text-sm font-bold text-stone-900">{item.quantidade} un.</span>
                  </div>
                ))}
                {ranking.length === 0 && <p className="text-center py-4 text-stone-400">Sem vendas registradas.</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Card({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-stone-200">
      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">{title}</p>
      <p className={`mt-1 text-2xl font-black ${color}`}>
        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
    </div>
  )
}