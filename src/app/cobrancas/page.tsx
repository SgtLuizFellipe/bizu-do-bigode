'use client'

import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'

type VendaPendente = {
  id: string
  cliente_id: string
  valor_total: number
  pago: boolean
  clientes: { nome: string; tipo: string; telefone: string } | null
}

type Devedor = {
  cliente_id: string
  nome: string
  tipo: string
  telefone: string
  total: number
  vendaIds: string[]
}

export default function Cobrancas() {
  const [devedores, setDevedores] = useState<Devedor[]>([])
  const [carregando, setCarregando] = useState(true)
  const [marcandoId, setMarcandoId] = useState<string | null>(null)

  async function carregar() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('vendas')
      .select('id, cliente_id, valor_total, pago, clientes(nome, tipo, telefone)')
      .eq('pago', false)
      .order('id', { ascending: false })

    if (error) {
      alert('Erro ao carregar cobranças.')
      setCarregando(false)
      return
    }

    // Mantendo a correção de tipagem que evita erro no build da Vercel
    const vendasFormatadas = (data as any[]).map(venda => ({
      ...venda,
      clientes: Array.isArray(venda.clientes) ? venda.clientes[0] : venda.clientes
    })) as VendaPendente[]

    const porCliente = new Map<string, Devedor>()

    for (const v of vendasFormatadas) {
      const cid = v.cliente_id
      const nome = v.clientes?.nome ?? 'Cliente'
      const tipo = v.clientes?.tipo ?? 'civil'
      const telefone = v.clientes?.telefone ?? ''
      
      if (!porCliente.has(cid)) {
        porCliente.set(cid, {
          cliente_id: cid,
          nome,
          tipo,
          telefone,
          total: 0,
          vendaIds: [],
        })
      }
      const d = porCliente.get(cid)!
      d.total += Number(v.valor_total)
      d.vendaIds.push(v.id)
    }

    setDevedores(Array.from(porCliente.values()))
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  async function marcarComoPago(devedor: Devedor) {
    const confirmar = confirm(`Confirmar que ${devedor.nome} pagou o total de R$ ${devedor.total.toFixed(2)}?`)
    if (!confirmar) return

    setMarcandoId(devedor.cliente_id)
    const { error } = await supabase
      .from('vendas')
      .update({ pago: true })
      .eq('cliente_id', devedor.cliente_id)
      .eq('pago', false)
    
    setMarcandoId(null)
    if (error) {
      alert('Erro ao registrar pagamento.')
      return
    }
    await carregar()
  }

  function cobrarWhatsApp(devedor: Devedor) {
    if (!devedor.telefone) {
      alert('Este cliente não tem telefone cadastrado.')
      return
    }

    const mensagem = `Olá ${devedor.nome}, tudo bem? Passando para lembrar do seu acerto de lanches. O total pendente é R$ ${devedor.total.toFixed(2)}. Qual a melhor forma de pagamento para você?`
    // Garante que o número tenha apenas dígitos e adiciona o código do país
    const numeroLimpo = devedor.telefone.replace(/\D/g, '')
    const url = `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-stone-100 p-6 pb-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-xl font-bold text-stone-800">Cobranças Pendentes</h1>

        {carregando ? (
          <div className="grid gap-4">
            <div className="h-32 animate-pulse rounded-3xl bg-white shadow-sm" />
            <div className="h-32 animate-pulse rounded-3xl bg-white shadow-sm" />
          </div>
        ) : devedores.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm border border-stone-200">
            <p className="text-stone-500 font-medium">Tudo em dia! Nenhuma pendência encontrada.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {devedores.map((d) => (
              <div key={d.cliente_id} className="rounded-3xl bg-white p-6 shadow-sm border border-stone-200">
                <div className="mb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-bold text-stone-800">{d.nome}</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                      {d.tipo === 'militar' ? 'Militar' : 'Civil'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-amber-600">R$ {d.total.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => cobrarWhatsApp(d)}
                    className="flex-1 rounded-2xl bg-green-100 py-3 text-sm font-bold text-green-700 hover:bg-green-200 transition-all"
                  >
                    Cobrar Zap
                  </button>
                  <button
                    type="button"
                    onClick={() => marcarComoPago(d)}
                    disabled={marcandoId === d.cliente_id}
                    className="flex-1 rounded-2xl bg-stone-800 py-3 text-sm font-bold text-white hover:bg-stone-900 disabled:opacity-50 transition-all"
                  >
                    {marcandoId === d.cliente_id ? 'Salvando...' : 'Receber'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}