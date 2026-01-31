'use client'

import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

type Devedor = {
  cliente_id: string
  nome: string
  tipo: string
  telefone: string
  companhia: string
  posto: string
  total: number
  vendaIds: string[]
}

export default function Cobrancas() {
  const [devedores, setDevedores] = useState<Devedor[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [marcandoId, setMarcandoId] = useState<string | null>(null)

  async function carregar() {
    setCarregando(true)
    try {
      const { data: vendasData, error: errVendas } = await supabase
        .from('vendas')
        .select('id, cliente_id, valor_total, pago')
        .eq('pago', false)
      
      if (errVendas) {
        toast.error('Erro ao buscar vendas.')
        return
      }

      if (!vendasData || vendasData.length === 0) {
        setDevedores([])
        return
      }

      const { data: clientesData, error: errClientes } = await supabase
        .from('clientes')
        .select('id, nome_completo, tipo, telefone, companhia, posto_grad')

      if (errClientes) {
        toast.error('Erro ao buscar clientes.')
        return
      }

      const clientesMap = new Map()
      clientesData?.forEach(c => clientesMap.set(c.id, c))

      const porCliente = new Map<string, Devedor>()

      for (const v of vendasData) {
        if (!v.cliente_id) continue

        const cliente = clientesMap.get(v.cliente_id)
        const cid = v.cliente_id
        
        const nome = cliente?.nome_completo ?? 'Cliente'
        const tipo = cliente?.tipo ?? 'civil'
        const telefone = cliente?.telefone ?? ''
        const cia = cliente?.companhia ?? 'S/C'
        const posto = cliente?.posto_grad ?? ''
        
        if (!porCliente.has(cid)) {
          porCliente.set(cid, {
            cliente_id: cid,
            nome,
            tipo,
            telefone,
            companhia: cia,
            posto,
            total: 0,
            vendaIds: [],
          })
        }
        
        const d = porCliente.get(cid)!
        d.total += Number(v.valor_total)
        d.vendaIds.push(v.id)
      }

      setDevedores(Array.from(porCliente.values()))
      
    } catch (err) {
      console.error(err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const devedoresFiltrados = devedores.filter(d => 
    d.nome.toLowerCase().includes(busca.toLowerCase()) || 
    d.companhia.toLowerCase().includes(busca.toLowerCase())
  )

  async function marcarComoPago(devedor: Devedor) {
    const confirmar = confirm(`Confirmar liquidação de R$ ${devedor.total.toFixed(2)} para ${devedor.nome}?`)
    if (!confirmar) return

    setMarcandoId(devedor.cliente_id)
    
    const { error } = await supabase
      .from('vendas')
      .update({ pago: true })
      .eq('cliente_id', devedor.cliente_id)
      .eq('pago', false)
    
    setMarcandoId(null)
    
    if (error) {
      toast.error('Erro ao registrar liquidação.')
      return
    }
    
    toast.success(`Débito quitado com sucesso.`)
    carregar()
  }

  function cobrarWhatsApp(devedor: Devedor) {
    if (!devedor.telefone) {
      toast.error('WhatsApp não cadastrado.')
      return
    }

    const mensagem = `Olá ${devedor.posto} ${devedor.nome}, tudo bem? Gostaria de lembrá-lo do seu acerto pendente no Bizu do Bigode. O total atual é R$ ${devedor.total.toFixed(2)}.`
    const numeroLimpo = devedor.telefone.replace(/\D/g, '')
    const url = `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-20">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-xl font-medium tracking-tight text-stone-950 italic">Cobranças Pendentes</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1">Gestão de Créditos</p>
        </header>

        <div className="relative mb-8">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar por nome ou companhia..."
            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 outline-none focus:border-stone-400 transition-all shadow-sm ring-1 ring-stone-900/5"
          />
        </div>

        {carregando ? (
          <div className="grid gap-4">
            <div className="h-40 rounded-xl bg-white animate-pulse border border-stone-100" />
            <div className="h-40 rounded-xl bg-white animate-pulse border border-stone-100" />
          </div>
        ) : devedoresFiltrados.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center border border-stone-200/60 shadow-sm">
            <p className="text-stone-400 text-sm font-medium italic">Nenhuma pendência financeira encontrada.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {devedoresFiltrados.map((d) => (
              <div key={d.cliente_id} className="rounded-xl bg-white p-6 border border-stone-200/60 shadow-sm ring-1 ring-stone-900/5 transition-all hover:shadow-md">
                <div className="mb-6 flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-semibold text-stone-900">
                      <span className="text-stone-400 font-medium mr-1.5">{d.posto}</span> {d.nome}
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">
                      {d.companhia} • {d.tipo}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tracking-tight text-red-600">R$ {d.total.toFixed(2)}</p>
                    <span className="text-[8px] font-black uppercase tracking-tighter text-red-400 opacity-60">Débito em Aberto</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => cobrarWhatsApp(d)}
                    className="flex-1 rounded-lg bg-stone-50 border border-stone-200 py-2.5 text-[11px] font-bold uppercase tracking-widest text-stone-600 hover:bg-stone-100 transition-all"
                  >
                    Notificar WhatsApp
                  </button>
                  <button
                    onClick={() => marcarComoPago(d)}
                    disabled={marcandoId === d.cliente_id}
                    className="flex-1 rounded-lg bg-stone-950 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-stone-800 disabled:opacity-50 transition-all shadow-sm"
                  >
                    {marcandoId === d.cliente_id ? 'Processando...' : 'Liquidar Débito'}
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