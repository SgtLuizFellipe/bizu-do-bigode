'use client'

import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

type VendaExtrato = {
  id: string
  valor_total: number
  metodo_pagamento: string
  data_venda: string
  pago: boolean
  cliente_id: string
  nome_cliente?: string
  posto_cliente?: string
}

export default function Extrato() {
  const [vendas, setVendas] = useState<VendaExtrato[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)
    try {
      const { data: vendasData, error: errVendas } = await supabase
        .from('vendas')
        .select('id, valor_total, metodo_pagamento, data_venda, pago, cliente_id')
        .order('data_venda', { ascending: false })
      
      if (errVendas) {
        toast.error('Erro ao acessar histórico.')
        return
      }

      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome_completo, posto_grad')

      const clientesMap = new Map()
      clientesData?.forEach(c => clientesMap.set(c.id, c))

      if (vendasData) {
        const formatadas = vendasData.map(v => {
          const cliente = clientesMap.get(v.cliente_id)
          return {
            ...v,
            nome_cliente: cliente?.nome_completo || 'Avulso',
            posto_cliente: cliente?.posto_grad || ''
          }
        })
        setVendas(formatadas)
      }
      
    } catch (err) {
      console.error(err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const filtradas = vendas.filter(v => 
    v.nome_cliente?.toLowerCase().includes(busca.toLowerCase()) ||
    v.metodo_pagamento?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-20">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-xl font-medium tracking-tight text-stone-950 italic">Extrato Geral</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1">Histórico de Operações</p>
        </header>

        <div className="relative mb-8">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar por nome ou método de pagamento..."
            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 outline-none transition-all shadow-sm ring-1 ring-stone-900/5 focus:border-stone-400"
          />
        </div>

        {carregando ? (
          <div className="space-y-4">
            <div className="h-20 rounded-xl bg-white animate-pulse border border-stone-100 shadow-sm" />
            <div className="h-20 rounded-xl bg-white animate-pulse border border-stone-100 shadow-sm" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtradas.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-xl bg-white p-5 border border-stone-200/60 shadow-sm ring-1 ring-stone-900/5 hover:shadow-md transition-all">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tight">
                      {v.posto_cliente}
                    </span>
                    <p className="text-sm font-semibold text-stone-900">{v.nome_cliente}</p>
                  </div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 mt-1">
                    {v.data_venda ? new Date(v.data_venda).toLocaleDateString('pt-BR') : 'S/ Data'} • {v.metodo_pagamento}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className={`text-base font-bold tracking-tight ${v.pago ? 'text-stone-900' : 'text-amber-600'}`}>
                    R$ {Number(v.valor_total).toFixed(2)}
                  </p>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <div className={`h-1.5 w-1.5 rounded-full ${v.pago ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
                      {v.pago ? 'Liquidado' : 'Pendente'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {filtradas.length === 0 && (
              <div className="rounded-xl bg-white p-12 text-center border border-stone-200/60 shadow-sm">
                <p className="text-stone-400 text-sm font-medium italic">Nenhum registro encontrado para esta busca.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}