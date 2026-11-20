import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import { HeartMark } from '../components/Brand'
import { Button, ButtonLink, Card, Chip, Label, PageHeader, inputCls } from '../components/ui'
import { cn, errorMessage } from '../lib/utils'

const USEFUL = [
  ['very', 'Very useful'],
  ['somewhat', 'Somewhat useful'],
  ['not-really', 'Not really'],
] as const
const SECTIONS = [
  ['tracker', 'Period tracker'],
  ['calendar', 'Calendar'],
  ['learn', 'Learn'],
  ['myths', 'Myths & Facts'],
  ['quiz', 'Quiz'],
  ['insights', 'Insights'],
] as const
const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Loved it']

export default function Feedback() {
  const { user } = useAuth()
  const [useful, setUseful] = useState<string | null>(null)
  const [learned, setLearned] = useState<boolean | null>(null)
  const [section, setSection] = useState<string | null>(null)
  const [topic, setTopic] = useState('')
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comments, setComments] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [tried, setTried] = useState(false)

  const missing = { useful: !useful, learned: learned === null, rating: !rating }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setTried(true)
    if (missing.useful || missing.learned || missing.rating) return toast.error('Answer the three required questions first.')
    setBusy(true)
    const { error } = await supabase.from('feedback').insert({
      user_id: user?.id ?? null,
      usefulness: useful,
      learned_something_new: learned,
      most_useful_section: section,
      topic_request: topic.trim() || null,
      rating,
      comments: comments.trim() || null,
    })
    setBusy(false)
    if (error) return toast.error(errorMessage(error))
    setDone(true)
  }

  const req = (bad: boolean) => tried && bad && <span className="ml-2 text-xs font-medium text-[#d63a52]">Required</span>

  return (
    <div className="mx-auto max-w-[760px] px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader title="Feedback" sub="Help us improve PeriodWise — this takes less than a minute." />
      <Card className="p-6 sm:p-10">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-10 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.25, 1] }} transition={{ duration: 0.6 }} className="mx-auto grid size-20 place-items-center rounded-full bg-rose-soft text-rose">
                <HeartMark size={38} />
              </motion.div>
              <h2 className="mt-6 text-2xl font-bold">Thank you for your feedback</h2>
              <p className="mt-2 text-muted">It goes straight to the team building PeriodWise.</p>
              <ButtonLink to="/" variant="secondary" className="mt-8">
                Back to home
              </ButtonLink>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={submit} className="space-y-8" exit={{ opacity: 0 }}>
              <fieldset>
                <legend className="mb-3 text-sm font-semibold">How useful was the platform?{req(missing.useful)}</legend>
                <div className="flex flex-wrap gap-2">
                  {USEFUL.map(([v, l]) => (
                    <Chip key={v} active={useful === v} onClick={() => setUseful(v)}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-3 text-sm font-semibold">Did you learn something new?{req(missing.learned)}</legend>
                <div className="flex gap-2">
                  <Chip active={learned === true} onClick={() => setLearned(true)} color="#3fae74">
                    Yes
                  </Chip>
                  <Chip active={learned === false} onClick={() => setLearned(false)} color="#8a7480">
                    No
                  </Chip>
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-3 text-sm font-semibold">Which section was most useful?</legend>
                <div className="flex flex-wrap gap-2">
                  {SECTIONS.map(([v, l]) => (
                    <Chip key={v} active={section === v} color="#8B5CF6" onClick={() => setSection(section === v ? null : v)}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </fieldset>
              <div>
                <Label htmlFor="topic">What topic would you like to learn more about?</Label>
                <input id="topic" className={inputCls} maxLength={200} placeholder="e.g. period pain, hygiene products…" value={topic} onChange={(e) => setTopic(e.target.value)} />
              </div>
              <fieldset>
                <legend className="mb-3 text-sm font-semibold">Overall rating{req(missing.rating)}</legend>
                <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating out of 5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <motion.button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      aria-label={`${n} star${n > 1 ? 's' : ''}`}
                      onMouseEnter={() => setHover(n)}
                      onClick={() => setRating(n)}
                      whileTap={{ scale: 0.8 }}
                      animate={rating === n ? { scale: [1, 1.3, 1] } : {}}
                      className="p-1"
                    >
                      <Star size={34} className={cn('transition-colors', (hover || rating) >= n ? 'fill-[#f5a65b] text-[#f5a65b]' : 'fill-line text-line-2')} />
                    </motion.button>
                  ))}
                  <span className="ml-3 text-sm font-medium text-muted">{RATING_WORDS[hover || rating]}</span>
                </div>
              </fieldset>
              <div>
                <Label htmlFor="comments">
                  Comments <span className="font-normal text-muted">(optional)</span>
                </Label>
                <textarea id="comments" className={inputCls + ' h-32 resize-y py-3'} maxLength={2000} placeholder="Anything else you’d like to share?" value={comments} onChange={(e) => setComments(e.target.value)} />
              </div>
              <Button type="submit" size="lg" loading={busy} className="h-14 w-full">
                Send feedback
              </Button>
              <p className="text-center text-xs text-muted">{user ? 'Linked to your account so we don’t ask twice.' : 'Anonymous — no account needed.'}</p>
            </motion.form>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}
