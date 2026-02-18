import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useRouter, usePathname } from 'next/navigation'

export function useAuth() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: colab } = await supabase
        .from('colaboradores')
        .select('role')
        .eq('email', user.email)
        .single()

      const adminStatus = colab?.role === 'admin'
      setIsAdmin(adminStatus)

      // Se não for admin e tentar acessar algo que não seja vendas, bloqueia
      if (!adminStatus && pathname !== '/vendas') {
        router.push('/vendas')
      }
      
      setLoading(false)
    }
    checkUser()
  }, [pathname])

  return { loading, isAdmin }
}