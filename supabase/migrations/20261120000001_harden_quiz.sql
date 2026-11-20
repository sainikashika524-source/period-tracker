-- ════════════════════════════════════════════════════════════════
-- Hardening for public launch
-- finish_quiz_attempt is callable by anyone, so never trust the
-- client's total / score / answers: total is the real question count,
-- score is clamped to it, and the answers payload is size-limited.
-- ════════════════════════════════════════════════════════════════
create or replace function public.finish_quiz_attempt(p_id uuid, p_score int, p_total int, p_answers jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_total int := greatest(1, (select count(*)::int from public.quiz_questions));
  v_answers jsonb := coalesce(p_answers, '[]');
begin
  if jsonb_typeof(v_answers) <> 'array' or jsonb_array_length(v_answers) > v_total or pg_column_size(v_answers) > 8192 then
    v_answers := '[]';
  end if;
  update public.quiz_attempts
     set score = greatest(0, least(coalesce(p_score, 0), v_total)),
         total = v_total,
         answers = v_answers,
         completed = true,
         finished_at = now()
   where id = p_id
     and completed = false
     and created_at > now() - interval '1 day'
     and (user_id is null or user_id = auth.uid());
end $$;

grant execute on function public.finish_quiz_attempt(uuid, int, int, jsonb) to anon, authenticated;
