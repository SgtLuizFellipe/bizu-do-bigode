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
  nome_produto?: string
  custo_produto?: number
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
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      try {
        const [resVendas, resItens, resProdutos] = await Promise.all([
          supabase.from('vendas').select('id, valor_total, pago, data_venda'),
          supabase.from('itens_venda').select('venda_id, produto_id, quantidade, preco_unitario'),
          supabase.from('produtos').select('id, nome, preco_custo, preco_venda, estoque')
        ])
        
        if (resVendas.error || resItens.error || resProdutos.error) {
          toast.error('Erro técnico ao buscar dados.')
          return
        }

        const produtosMap = new Map()
        resProdutos.data?.forEach(p => produtosMap.set(p.id, p))

        setVendas(resVendas.data || [])
        setProdutos(resProdutos.data || [])
        
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
    const vendasFiltradas = vendas.filter((v) => {
      if (!v.data_venda) return false
      const dataV = new Date(v.data_venda)
      
      if (periodo === 'hoje') {
        return (
          dataV.getDate() === hoje.getDate() &&
          dataV.getMonth() === hoje.getMonth() &&
          dataV.getFullYear() === hoje.getFullYear()
        )
      } else {
        return (
          dataV.getMonth() === hoje.getMonth() &&
          dataV.getFullYear() === hoje.getFullYear()
        )
      }
    })

    const idsVendasFiltradas = new Set(vendasFiltradas.map((v) => v.id))
    const bruto = vendasFiltradas.reduce((s, v) => s + (Number(v.valor_total) || 0), 0)
    const fiado = vendasFiltradas.filter((v) => !v.pago).reduce((s, v) => s + (Number(v.valor_total) || 0), 0)

    const itensFiltrados = itensVenda.filter((i) => idsVendasFiltradas.has(i.venda_id))
    
    const liquido = itensFiltrados.reduce((s, i) => {
      const custo = Number(i.custo_produto) || 0
      const venda = Number(i.preco_unitario) || 0
      return s + (Number(i.quantidade) * (venda - custo))
    }, 0)

    const porProduto = new Map<string, number>()
    for (const i of itensFiltrados) {
      const nome = i.nome_produto ?? 'Produto'
      porProduto.set(nome, (porProduto.get(nome) ?? 0) + Number(i.quantidade))
    }
    
    const rank = Array.from(porProduto.entries())
      .map(([nome, qtd]) => ({ nome, quantidade: qtd }))
      .sort((a, b) => b.quantidade - a.quantidade)

    // Cálculos de Patrimônio (Estoque Atual)
    const investimentoTotal = produtos.reduce((s, p) => s + (Number(p.estoque) * Number(p.preco_custo)), 0)
    const lucroPotencial = produtos.reduce((s, p) => s + (Number(p.estoque) * (Number(p.preco_venda) - Number(p.preco_custo))), 0)

    return { bruto, liquido, fiado, rank, investimentoTotal, lucroPotencial }
  }, [vendas, itensVenda, produtos, periodo])

  return (
    <div className="min-h-screen bg-stone-100 p-6 pb-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-xl font-bold text-stone-800 italic text-center">Resumo Financeiro</h1>

        <div className="mb-6 flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-stone-200">
          <button type="button" onClick={() => setPeriodo('hoje')} className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all ${periodo === 'hoje' ? 'bg-stone-800 text-white shadow-md' : 'text-stone-500'}`}>Hoje</button>
          <button type="button" onClick={() => setPeriodo('mes')} className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all ${periodo === 'mes' ? 'bg-stone-800 text-white shadow-md' : 'text-stone-500'}`}>Mês</button>
        </div>

        {carregando ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 rounded-3xl bg-white shadow-sm" />
            <div className="h-64 rounded-3xl bg-white shadow-sm" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card title="Bruto" value={stats.bruto} color="text-stone-800" />
              <Card title="Líquido" value={stats.liquido} color="text-green-600" />
              <Card title="Fiado" value={stats.fiado} color="text-red-600" />
            </div>

            {/* Novo Card de Patrimônio em Estoque */}
            <div className="rounded-3xl bg-amber-600 p-6 text-white shadow-xl shadow-amber-200/50 border border-amber-500">
              <h2 className="mb-4 text-[10px] font-black uppercase tracking-widest opacity-80 italic">Patrimônio em Estoque</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase opacity-70">Capital Investido</p>
                  <p className="text-xl font-black italic">R$ {stats.investimentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase opacity-70">Lucro Esperado</p>
                  <p className="text-xl font-black italic">R$ {stats.lucroPotencial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm border border-stone-200">
              <h2 className="mb-4 text-lg font-bold text-stone-800 italic">Mais vendidos</h2>
              <div className="space-y-3">
                {stats.rank.map((item, idx) => (
                  <div key={item.nome} className="flex items-center justify-between border-b border-stone-50 pb-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-[10px] font-black text-stone-500">{idx + 1}</span>
                      <span className="font-medium text-stone-700">{item.nome}</span>
                    </div>
                    <span className="text-sm font-bold text-stone-900">{item.quantidade} un.</span>
                  </div>
                ))}
                {stats.rank.length === 0 && <p className="text-center py-4 text-stone-400 italic">Sem vendas registradas.</p>}
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
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-stone-200">
      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">{title}</p>
      <p className={`mt-1 text-2xl font-black ${color}`}>
        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
    </div>
  )
}