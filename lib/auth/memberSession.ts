import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type CurrentMember = {
  userId: string
  email: string
  displayName: string
  status: 'ACTIVE'
  classYear: number | null
  major: string | null
  disciplines: string[]
  skills: string[]
}

export async function getCurrentMember(): Promise<CurrentMember | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user?.email) return null
  const { data, error } = await supabase
    .from('member_profiles')
    .select('user_id,oberlin_email,display_name,status,class_year,major,disciplines,skills')
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .maybeSingle()
  if (error || !data) return null
  return {
    userId: data.user_id,
    email: data.oberlin_email,
    displayName: data.display_name,
    status: 'ACTIVE',
    classYear: data.class_year,
    major: data.major,
    disciplines: data.disciplines ?? [],
    skills: data.skills ?? [],
  }
}

export async function requireActiveMember() {
  const member = await getCurrentMember()
  if (!member) redirect('/member/login?status=approval_required')
  return member
}
