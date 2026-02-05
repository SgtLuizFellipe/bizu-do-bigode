'use client'

import { supabase } from '../../lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

type Cliente = { id: string; nome_completo: string; posto_grad?: string; tipo?: string; }
type Produto = { id: string; nome: string; preco_venda: number; categoria: string; localizacao: string }
type ItemCarrinho = { produto: Produto; quantidade: number; noCombo: boolean }
type MetodoPagamento = 'FIADO' | 'PIX' | 'CARTÃO' | 'DINHEIRO'

type ComboConfig = {
  id: string
  label: string
  preco: number
  desc: string
  precisa: string[]
}

const ORDEM_HIERARQUICA: Record<string, number> = { 'Ten': 1, 'Sgt': 2, 'Cb': 3, 'EP': 4, 'EV': 5 };

const COMBOS_PROMO: ComboConfig[] = [
  { id: 'G', label: 'Combo G', preco: 12.00, desc: '1 Pão + 1 Refri', precisa: ['Pão', 'Refrigerante'] },
  { id: 'E', label: 'Combo E', preco: 16.00, desc: '1 Pão + 1 Ener.', precisa: ['Pão', 'Energético'] },
  { id: 'GB', label: 'Combo GB', preco: 26.00, desc: '1 Pão + 1 Refri + 1 Bolo', precisa: ['Pão', 'Refrigerante', 'Bolo'] },
  { id: 'EB', label: 'Combo EB', preco: 28.00, desc: '1 Pão + 1 Ener. + 1 Bolo', precisa: ['Pão', 'Energético', 'Bolo'] },
]

export default function Vendas() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [buscaCliente, setBuscaCliente] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [metodo, setMetodo] = useState<MetodoPagamento>('PIX')
  const [salvando, setSalvando] = useState(false)
  const [modalCombo, setModalCombo] = useState<ComboConfig | null>(null)
  const [selecaoCombo, setSelecaoCombo] = useState<Record<string, Produto>>({})
  const [descontoManual, setDescontoManual] = useState<number | null>(null)

  useEffect(() => {
    async function carregar() {
      const [resClientes, resProdutos] = await Promise.all([
        supabase.from('clientes').select('id, nome_completo, posto_grad, tipo'),
        supabase.from('produtos').select('*').eq('localizacao', 'Geladeira').order('nome'),
      ])
      if (resClientes.data) {
        const ordenados = [...resClientes.data].sort((a, b) => {
          const pesoA = ORDEM_HIERARQUICA[a.posto_grad || ''] || 99;
          const pesoB = ORDEM_HIERARQUICA[b.posto_grad || ''] || 99;
          return pesoA !== pesoB ? pesoA - pesoB : a.nome_completo.localeCompare(b.nome_completo);
        });
        setClientes(ordenados as Cliente[]);
      }
      if (resProdutos.data) setProdutos(resProdutos.data as Produto[])
    }
    carregar()
  }, [])

  const militaresFiltrados = useMemo(() => {
    return clientes.filter((c: Cliente) => 
      c.tipo === 'militar' && c.nome_completo.toLowerCase().includes(buscaCliente.toLowerCase())
    )
  }, [clientes, buscaCliente])

  const { subtotalGeral, descontoCalculado } = useMemo(() => {
    let subNormal = 0
    let subPromo = 0
    carrinho.forEach(i => {
      const preco = Number(i.produto.preco_venda) || 0
      if (i.noCombo) subPromo += preco
      else subNormal += preco
    })
    const count = carrinho.filter(i => i.noCombo).length;
    const conf = COMBOS_PROMO.find(c => c.precisa.length === count);
    const precoAlvoCombo = conf ? conf.preco : subPromo;
    return { 
      subtotalGeral: subNormal + subPromo, 
      descontoCalculado: Math.max(0, subPromo - precoAlvoCombo) 
    }
  }, [carrinho])

  const totalComDesconto = subtotalGeral - (descontoManual ?? descontoCalculado)

  function adicionarProduto(p: Produto) {
    setCarrinho([...carrinho, { produto: p, quantidade: 1, noCombo: false }])
    toast.info(`${p.nome} adicionado`)
  }

  function prepararCombo(combo: ComboConfig) {
    const pre: Record<string, Produto> = {};
    combo.precisa.forEach(tipo => {
      const p = produtos.find(item => {
        const n = item.nome.toUpperCase();
        if (tipo === 'Refrigerante') return item.categoria === 'bebida' && (n.includes('COCA') || n.includes('REFRI') || n.includes('REFRIGERANTE') || n.includes('GUARANÁ'));
        if (tipo === 'Energético') return n.includes('ENER') || n.includes('MONSTER') || n.includes('RED BULL') || n.includes('BALLY');
        return false;
      });
      if (p) pre[tipo] = p;
    });
    setSelecaoCombo(pre);
    setModalCombo(combo);
  }

  function confirmarCombo() {
    if (!modalCombo) return;
    const faltam = modalCombo.precisa.filter(tipo => !selecaoCombo[tipo]);
    if (faltam.length > 0) return toast.error('Selecione todos os sabores.');
    const itens = Object.values(selecaoCombo).map(p => ({ produto: p, quantidade: 1, noCombo: true }));
    setCarrinho([...carrinho, ...itens]);
    setModalCombo(null);
    setSelecaoCombo({});
    setDescontoManual(null); // Reseta para recalcular automático
    toast.success('Combo pronto');
  }

  async function finalizar() {
    if (carrinho.length === 0 || !clienteSelecionado) return toast.error('Dados incompletos');
    setSalvando(true);
    try {
      const { data: v, error: ev } = await supabase.from('vendas').insert([{
        cliente_id: clienteSelecionado.id, valor_total: totalComDesconto, 
        desconto: (descontoManual ?? descontoCalculado),
        pago: metodo !== 'FIADO', metodo_pagamento: metodo, data_venda: new Date().toISOString()
      }]).select('id').single();
      if (ev || !v) throw new Error();
      for (const i of carrinho) {
        await supabase.from('itens_venda').insert({ venda_id: v.id, produto_id: i.produto.id, quantidade: i.quantidade, preco_unitario: i.produto.preco_venda });
        const { data: ep } = await supabase.from('produtos').select('estoque').eq('id', i.produto.id).single();
        await supabase.from('produtos').update({ estoque: (Number(ep?.estoque) || 0) - i.quantidade }).eq('id', i.produto.id);
      }
      toast.success('Venda concluída');
      setCarrinho([]); setClienteSelecionado(null); setBuscaCliente(''); setDescontoManual(null);
    } catch { toast.error('Erro ao processar') } finally { setSalvando(false) }
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 pb-24 text-stone-900 font-sans uppercase tracking-tighter">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center font-normal">
          <h1 className="text-xl text-stone-950">Ponto de Venda</h1>
          <p className="text-[10px] text-stone-400">Operações Militares</p>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COMBOS_PROMO.map(c => (
            <button key={c.id} onClick={() => prepararCombo(c)} className="flex flex-col items-center p-3 bg-white border border-stone-200 rounded-xl hover:border-stone-950 active:scale-95 transition-all shadow-sm">
              <span className="text-[10px] text-stone-900">{c.label}</span>
              <span className="mt-1 text-[8px] opacity-60 text-stone-400">{c.desc}</span>
              <span className="mt-2 text-xs text-stone-950">R$ {c.preco.toFixed(2)}</span>
            </button>
          ))}
        </section>

        <section className="mb-6 p-6 bg-white rounded-xl border border-stone-200 shadow-sm font-normal">
          <input type="text" value={buscaCliente} onChange={e => setBuscaCliente(e.target.value)} placeholder="PESQUISAR MILITAR..." className="w-full p-3 bg-stone-50 border border-stone-100 rounded-lg text-sm outline-none focus:border-stone-400" />
          <div className="max-h-40 overflow-y-auto mt-2">
            {militaresFiltrados.map(c => (
              <button key={c.id} onClick={() => { setClienteSelecionado(c); setBuscaCliente(`${c.posto_grad} ${c.nome_completo}`) }} className={`block w-full p-2.5 text-left text-[11px] border-b border-stone-50 last:border-0 ${clienteSelecionado?.id === c.id ? 'bg-stone-950 text-white' : 'hover:bg-stone-50'}`}>
                <span className="text-stone-400 mr-2">{c.posto_grad}</span> {c.nome_completo}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6 p-6 bg-white rounded-xl border border-stone-200 shadow-sm space-y-6">
          {['ALIMENTOS', 'BEBIDAS'].map(cat => (
            <div key={cat}>
              <p className="mb-3 text-[9px] text-stone-400 border-b pb-1">{cat}</p>
              <div className="grid grid-cols-2 gap-2">
                {produtos.filter(p => cat === 'ALIMENTOS' ? p.categoria !== 'bebida' : p.categoria === 'bebida').map(p => (
                  <button key={p.id} onClick={() => adicionarProduto(p)} className="flex justify-between p-3 bg-stone-50 border border-stone-100 rounded-lg text-[11px] hover:border-stone-950 transition-all uppercase font-normal">
                    <span>{p.nome}</span>
                    <span className="text-stone-400">R$ {Number(p.preco_venda).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        {carrinho.length > 0 && (
          <section className="mb-6 p-6 bg-stone-950 text-white rounded-xl shadow-lg">
            <div className="space-y-2 mb-6 border-b border-white/10 pb-4">
              {carrinho.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs font-normal">
                  <span>{item.quantidade}X {item.produto.nome} {item.noCombo && '(PROMO)'}</span>
                  <div className="flex gap-4 items-center">
                    <span className="text-white/40">R$ {(item.quantidade * item.produto.preco_venda).toFixed(2)}</span>
                    <button onClick={() => { setCarrinho(carrinho.filter((_, i) => i !== idx)); setDescontoManual(null); }} className="text-[9px] text-white/30 underline">REMOVER</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-end justify-between font-normal">
              <div>
                <p className="text-[9px] text-emerald-400 tracking-widest">DESCONTO (CLIQUE P/ EDITAR)</p>
                <div className="flex items-center gap-2">
                   <span className="text-lg">- R$</span>
                   <input 
                     type="number" 
                     value={descontoManual ?? descontoCalculado.toFixed(2)} 
                     onChange={(e) => setDescontoManual(Number(e.target.value))}
                     className="bg-transparent text-lg border-b border-white/20 outline-none w-20 text-white"
                   />
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] opacity-40">TOTAL LÍQUIDO</p>
                <p className="text-3xl text-emerald-400">R$ {totalComDesconto.toFixed(2)}</p>
              </div>
            </div>
          </section>
        )}

        {modalCombo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 backdrop-blur-sm p-6 animate-in fade-in font-normal">
            <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-2xl animate-in zoom-in-95">
              <header className="mb-6 text-center font-normal uppercase">
                <h3 className="text-sm text-stone-900">CONFIGURAR {modalCombo.label}</h3>
                <p className="text-[10px] text-stone-400 mt-1 tracking-widest font-normal">ESCOLHA OS SABORES</p>
              </header>
              <div className="space-y-4 mb-6">
                {modalCombo.precisa.map(t => {
                  const isF = t === 'Refrigerante' || t === 'Energético';
                  return (
                    <div key={t}>
                      <label className="mb-1.5 block text-[9px] text-stone-400 uppercase font-normal tracking-widest">{t}</label>
                      {isF ? (
                        <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-[10px] text-stone-900 uppercase">
                          {selecaoCombo[t]?.nome || 'ITEM NÃO LOCALIZADO NA GELADEIRA'}
                        </div>
                      ) : (
                        <select onChange={e => { const p = produtos.find(x => x.id === e.target.value); if(p) setSelecaoCombo(prev => ({...prev, [t]: p})) }} className="w-full p-3 bg-white border border-stone-200 rounded-lg text-[11px] outline-none appearance-none uppercase font-normal">
                          <option value="">ESCOLHER SABOR...</option>
                          {produtos.filter(p => {
                            const n = p.nome.toUpperCase();
                            if (t === 'Pão') return ['FRANGO', 'CALABRESA', 'SALAME', 'PERU'].some(x => n.includes(x));
                            if (t === 'Bolo') return n.includes('BOLO');
                            return false;
                          }).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setModalCombo(null); setSelecaoCombo({}) }} className="flex-1 p-3 bg-stone-100 text-stone-400 text-[10px] rounded-xl uppercase">CANCELAR</button>
                <button onClick={confirmarCombo} className="flex-1 p-3 bg-stone-950 text-white text-[10px] rounded-xl uppercase shadow-lg">CONFIRMAR</button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 grid grid-cols-4 gap-2">
          {(['FIADO', 'PIX', 'CARTÃO', 'DINHEIRO'] as MetodoPagamento[]).map(m => (
            <button key={m} onClick={() => setMetodo(m)} className={`p-3 text-[9px] border rounded-lg transition-all font-normal uppercase ${metodo === m ? 'bg-stone-950 text-white shadow-sm' : 'bg-white text-stone-400 border-stone-100 hover:bg-stone-50'}`}>{m}</button>
          ))}
        </div>

        <button onClick={finalizar} disabled={salvando || carrinho.length === 0} className="w-full p-5 bg-stone-950 text-white text-[11px] rounded-lg shadow-xl hover:bg-stone-800 transition-all active:scale-95 disabled:opacity-50 uppercase font-normal">
          {salvando ? 'PROCESSANDO...' : 'CONFIRMAR VENDA'}
        </button>
      </div>
    </div>
  )
}