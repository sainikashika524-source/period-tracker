export type Flow = 'none' | 'spotting' | 'light' | 'medium' | 'heavy'

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  age_group: string | null
  avg_cycle_length: number
  avg_period_length: number
  onboarding_done: boolean
  created_at: string
}

export interface Cycle {
  id: string
  user_id: string
  start_date: string
  end_date: string | null
  notes: string | null
}

export interface DailyLog {
  id?: string
  user_id?: string
  date: string
  flow: Flow
  symptoms: string[]
  mood: string | null
  energy: number | null
  pain_level: number | null
  water_glasses: number | null
  sleep_hours: number | null
  notes: string | null
}

export interface QuizQuestion {
  id: string | number
  position: number
  question: string
  options: string[]
  correct_index: number
  explanation: string
}

export interface QuizAttempt {
  id: string
  score: number | null
  total: number
  session_stage: 'exploring' | 'before' | 'after'
  completed: boolean
  created_at: string
}

export interface Myth {
  id: string | number
  myth: string
  fact: string
  category: string
  source: string | null
}

export type ArticleBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: { title?: string; text: string }[] }
  | { type: 'tip'; text: string }
  | { type: 'warn'; text: string }

export interface Article {
  id?: string
  slug: string
  position: number
  letter: string
  nav_label: string
  title: string
  summary: string
  body: ArticleBlock[]
}

export interface CampaignStats {
  participants: number
  attempts_started: number
  attempts_completed: number
  completion_rate: number
  avg_score_pct: number
  before_avg_pct: number | null
  after_avg_pct: number | null
  feedback_count: number
  learned_new_pct: number | null
}
