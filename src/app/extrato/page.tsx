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
        toast.error('Erro ao acessar vendas.')
        return
      }

      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome_completo, posto_grad') // Atualizado para colunas reais

      const clientesMap = new Map()
      clientesData?.forEach(c => clientesMap.set(c.id, c))

      if (vendasData) {
        const formatadas = vendasData.map(v => {
          const cliente = clientesMap.get(v.cliente_id)
          return {
            ...v,
            nome_cliente: cliente?.nome_completo || 'Avulso', // Usa nome_completo
            posto_cliente: cliente?.posto_grad || '' // Usa posto_grad
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
    <div className="min-h-screen bg-stone-100 p-6 pb-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-xl font-bold text-stone-800 italic text-center">Extrato Geral</h1>

        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente ou método..."
          className="mb-6 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-stone-200 transition-all"
        />

        {carregando ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-20 rounded-2xl bg-white shadow-sm" />
            <div className="h-20 rounded-2xl bg-white shadow-sm" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtradas.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-2xl bg-white p-4 border border-stone-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black text-amber-600 uppercase italic">
                      {v.posto_cliente}
                    </span>
                    <p className="text-sm font-bold text-stone-800">{v.nome_cliente}</p>
                  </div>
                  <p className="text-[10px] font-black uppercase text-stone-400">
                    {v.data_venda ? new Date(v.data_venda).toLocaleDateString('pt-BR') : 'Sem data'} • {v.metodo_pagamento}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-mono font-black ${v.pago ? 'text-green-600' : 'text-amber-600'}`}>
                    R$ {Number(v.valor_total).toFixed(2)}
                  </p>
                  <span className="text-[8px] font-black uppercase tracking-tighter opacity-50">
                    {v.pago ? 'Liquidado' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
            {filtradas.length === 0 && (
              <p className="text-center py-10 text-stone-400 italic font-medium">Nenhuma venda encontrada.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}