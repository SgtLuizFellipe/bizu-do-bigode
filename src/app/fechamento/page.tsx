'use client'

import { supabase } from '../../lib/supabase'
import { useState } from 'react'
import { toast } from 'sonner'

type RelatorioCobranca = {
  cliente_id: string
  nome: string
  posto: string
  telefone: string
  total: number
  detalhes: string
}

export default function Fechamento() {
  const [relatorios, setRelatorios] = useState<RelatorioCobranca[]>([])
  const [carregando, setCarregando] = useState(false)
  const [liquidandoId, setLiquidandoId] = useState<string | null>(null)

  async function gerarRelatorios() {
    setCarregando(true)
    try {
      const { data: vendas } = await supabase
        .from('vendas')
        .select(`
          id, valor_total, cliente_id,
          itens_venda(quantidade, preco_unitario, produtos(nome))
        `)
        .eq('pago', false)

      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome_completo, posto_grad, telefone')

      if (!vendas || !clientes) return

      const mapaClientes = new Map()
      clientes.forEach(c => mapaClientes.set(c.id, c))

      const agrupado = new Map<string, RelatorioCobranca>()

      vendas.forEach((v: any) => {
        const c = mapaClientes.get(v.cliente_id)
        if (!c) return

        const id = v.cliente_id
        if (!agrupado.has(id)) {
          agrupado.set(id, {
            cliente_id: id,
            nome: c.nome_completo,
            posto: c.posto_grad,
            telefone: c.telefone,
            total: 0,
            detalhes: ''
          })
        }

        const rel = agrupado.get(id)!
        rel.total += v.valor_total
        
        v.itens_venda.forEach((item: any) => {
          rel.detalhes += `• ${item.quantidade}x ${item.produtos.nome} - R$ ${(item.quantidade * item.preco_unitario).toFixed(2)}\n`
        })
      })

      setRelatorios(Array.from(agrupado.values()))
    } catch (err) {
      toast.error('Erro ao gerar fechamento.')
    } finally {
      setCarregando(false)
    }
  }

  async function liquidarTudo(r: RelatorioCobranca) {
    if (!confirm(`Confirmar pagamento de R$ ${r.total.toFixed(2)} para ${r.posto} ${r.nome}?`)) return
    
    setLiquidandoId(r.cliente_id)
    const { error } = await supabase
      .from('vendas')
      .update({ pago: true })
      .eq('cliente_id', r.cliente_id)
      .eq('pago', false)

    if (error) {
      toast.error('Erro ao liquidar débitos.')
      setLiquidandoId(null)
      return
    }

    toast.success(`Conta de ${r.nome} liquidada!`)
    setRelatorios(prev => prev.filter(item => item.cliente_id !== r.cliente_id))
    setLiquidandoId(null)
  }

  function enviarZap(r: RelatorioCobranca) {
    const chavePix = "SUA_CHAVE_PIX_AQUI"
    const mensagem = `*BIZU DO BIGODE - FECHAMENTO MENSAL*\n\n` +
      `Olá, *${r.posto} ${r.nome}*.\n` +
      `Segue o extrato do seu consumo:\n\n` +
      `${r.detalhes}\n` +
      `*TOTAL: R$ ${r.total.toFixed(2)}*\n\n` +
      `*PIX:* ${chavePix}\n\n` +
      `Envie o comprovante. Obrigado!`

    const fone = r.telefone.replace(/\D/g, '')
    window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(mensagem)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-20 text-stone-900">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-xl font-medium tracking-tight text-stone-950 italic">Fechamento Mensal</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1">Gestão de Recebíveis</p>
        </header>

        <button
          onClick={gerarRelatorios}
          disabled={carregando}
          className="mb-8 w-full rounded-lg bg-stone-950 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-sm hover:bg-stone-800 disabled:opacity-50 transition-all"
        >
          {carregando ? 'Processando...' : 'Gerar Relatórios de Devedores'}
        </button>

        <div className="space-y-4">
          {relatorios.map((r) => (
            <div key={r.cliente_id} className="rounded-xl bg-white p-6 border border-stone-200/60 shadow-sm ring-1 ring-stone-900/5">
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900">{r.posto} {r.nome}</h2>
                  <p className="text-lg font-bold tracking-tight text-stone-900 mt-1">R$ {r.total.toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => enviarZap(r)}
                    className="rounded-lg bg-stone-50 border border-stone-200 px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-stone-500 hover:bg-stone-100 transition-all"
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={() => liquidarTudo(r)}
                    disabled={liquidandoId === r.cliente_id}
                    className="rounded-lg bg-stone-950 px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-white hover:bg-stone-800 transition-all"
                  >
                    {liquidandoId === r.cliente_id ? '...' : 'Liquidar'}
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap text-[10px] text-stone-400 bg-stone-50/50 p-4 rounded-lg font-sans leading-relaxed border border-stone-100">
                {r.detalhes}
              </pre>
            </div>
          ))}
          {relatorios.length === 0 && !carregando && (
            <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-xl">
              <p className="text-stone-300 text-xs font-medium uppercase tracking-widest">Sem pendências para o fechamento</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}