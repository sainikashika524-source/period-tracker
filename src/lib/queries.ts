import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from '../context/AuthProvider'
import type { Article, CampaignStats, Cycle, DailyLog, Myth, Profile, QuizAttempt, QuizQuestion } from './types'
import { ARTICLES } from '../content/articles'
import { MYTHS } from '../content/myths'
import { QUIZ } from '../content/quiz'

/** Content falls back to the bundled copy if the DB is unreachable or not yet seeded. */
async function withFallback<T>(fn: () => PromiseLike<{ data: unknown; error: unknown }>, fallback: T[]): Promise<T[]> {
  try {
    const { data, error } = await fn()
    if (error || !Array.isArray(data) || data.length === 0) return fallback
    return data as T[]
  } catch {
    return fallback
  }
}

export const useArticles = () =>
  useQuery({
    queryKey: ['articles'],
    queryFn: () => withFallback<Article>(() => supabase.from('articles').select('*').order('position'), ARTICLES),
    staleTime: Infinity,
    placeholderData: ARTICLES,
  })

export const useMyths = () =>
  useQuery({
    queryKey: ['myths'],
    queryFn: () => withFallback<Myth>(() => supabase.from('myths').select('*').order('id'), MYTHS),
    staleTime: Infinity,
    placeholderData: MYTHS,
  })

export const useQuizQuestions = () =>
  useQuery({
    queryKey: ['quiz_questions'],
    queryFn: () => withFallback<QuizQuestion>(() => supabase.from('quiz_questions').select('*').order('position'), QUIZ),
    staleTime: Infinity,
  })

export const useCampaignStats = () =>
  useQuery({
    queryKey: ['campaign_stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_campaign_stats')
      if (error) throw error
      return data as CampaignStats
    },
    retry: 1,
    staleTime: 60_000,
  })

// ── Per-user data ────────────────────────────────────────────────
export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle()
      if (error) throw error
      if (data) return data as Profile
      // The signup trigger normally creates it; self-heal for users created before the migration.
      const { data: created, error: e2 } = await supabase
        .from('profiles')
        .insert({ id: user!.id, display_name: (user!.user_metadata?.full_name as string) ?? user!.email?.split('@')[0] ?? null })
        .select()
        .single()
      if (e2) throw e2
      return created as Profile
    },
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', user!.id).select().single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: (p) => qc.setQueryData(['profile', user?.id], p),
  })
}

export function useCycles() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['cycles', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('cycles').select('*').order('start_date', { ascending: true })
      if (error) throw error
      return data as Cycle[]
    },
  })
}

export function useLogs() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['logs', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('daily_logs').select('*').order('date', { ascending: true })
      if (error) throw error
      return data as DailyLog[]
    },
  })
}

export function useQuizHistory() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['quiz_history', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('id, score, total, session_stage, completed, created_at')
        .eq('completed', true)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data as QuizAttempt[]
    },
  })
}

export function useCycleMutations() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['cycles', user?.id] })
  return {
    start: useMutation({
      mutationFn: async (start_date: string) => {
        const { error } = await supabase.from('cycles').upsert({ user_id: user!.id, start_date }, { onConflict: 'user_id,start_date' })
        if (error) throw error
      },
      onSuccess: invalidate,
    }),
    end: useMutation({
      mutationFn: async ({ id, end_date }: { id: string; end_date: string | null }) => {
        const { error } = await supabase.from('cycles').update({ end_date }).eq('id', id)
        if (error) throw error
      },
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from('cycles').delete().eq('id', id)
        if (error) throw error
      },
      onSuccess: invalidate,
    }),
  }
}

export function useLogMutations() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['logs', user?.id] })
  return {
    save: useMutation({
      mutationFn: async (log: DailyLog) => {
        const { id: _id, user_id: _u, ...rest } = log
        void _id
        void _u
        const { error } = await supabase.from('daily_logs').upsert({ ...rest, user_id: user!.id }, { onConflict: 'user_id,date' })
        if (error) throw error
      },
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (date: string) => {
        const { error } = await supabase.from('daily_logs').delete().eq('date', date)
        if (error) throw error
      },
      onSuccess: invalidate,
    }),
  }
}
