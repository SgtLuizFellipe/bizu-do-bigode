'use client'

import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

type VendaPendente = {
  id: string
  cliente_id: string
  valor_total: number
  pago: boolean
}

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
      // Busca 1: Vendas não pagas
      const { data: vendasData, error: errVendas } = await supabase
        .from('vendas')
        .select('id, cliente_id, valor_total, pago')
        .eq('pago', false)
      
      if (errVendas) {
        toast.error('Erro ao buscar vendas: ' + errVendas.message)
        return
      }

      if (!vendasData || vendasData.length === 0) {
        setDevedores([])
        return
      }

      // Busca 2: Clientes com nomes de colunas corrigidos
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
        
        // Ajuste para usar nome_completo e posto_grad
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

  useEffect(() => {
    carregar()
  }, [])

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
    
    toast.success(`Débito de ${devedor.nome} quitado!`)
    carregar()
  }

  function cobrarWhatsApp(devedor: Devedor) {
    if (!devedor.telefone) {
      toast.error('Cliente sem WhatsApp cadastrado.')
      return
    }

    const mensagem = `Olá ${devedor.posto} ${devedor.nome}, tudo bem? Passando para lembrar do seu acerto do Bizu do Bigode. O total é R$ ${devedor.total.toFixed(2)}. Consegue realizar o Pix?`
    const numeroLimpo = devedor.telefone.replace(/\D/g, '')
    const url = `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-stone-100 p-6 pb-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-xl font-bold text-stone-800 italic text-center">Cobranças Pendentes</h1>

        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Filtrar por nome ou companhia..."
          className="mb-6 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-stone-200 transition-all"
        />

        {carregando ? (
          <div className="grid gap-4 animate-pulse">
            <div className="h-32 rounded-3xl bg-white shadow-sm" />
            <div className="h-32 rounded-3xl bg-white shadow-sm" />
          </div>
        ) : devedoresFiltrados.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm border border-stone-200">
            <p className="text-stone-500 font-medium italic">Nenhuma pendência encontrada.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {devedoresFiltrados.map((d) => (
              <div key={d.cliente_id} className="rounded-3xl bg-white p-6 shadow-sm border border-stone-200">
                <div className="mb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-bold text-stone-800">
                      <span className="text-amber-600 mr-1">{d.posto}</span> {d.nome}
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                      {d.companhia} • {d.tipo}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-red-600">R$ {d.total.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => cobrarWhatsApp(d)}
                    className="flex-1 rounded-2xl bg-green-100 py-3 text-sm font-bold text-green-700 hover:bg-green-200 transition-all"
                  >
                    Cobrar Zap
                  </button>
                  <button
                    onClick={() => marcarComoPago(d)}
                    disabled={marcandoId === d.cliente_id}
                    className="flex-1 rounded-2xl bg-stone-800 py-3 text-sm font-bold text-white hover:bg-stone-900 disabled:opacity-50 transition-all"
                  >
                    {marcandoId === d.cliente_id ? 'Processando...' : 'Liquidar'}
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