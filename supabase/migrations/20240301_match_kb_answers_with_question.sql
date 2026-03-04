-- Update match_kb_answers to join kb_questions and return question_text
-- for the SmartRN RAG chat feature.
-- Must drop + recreate because return type is changing (adding question_text).

begin;

set local search_path to public, extensions;

drop function if exists match_kb_answers(vector(3072), float, int);

create function match_kb_answers(
  query_embedding vector(3072),
  match_threshold float default 0.5,
  match_count     int   default 10
)
returns table (
  id            uuid,
  answer_text   text,
  confidence    numeric,
  is_canonical  boolean,
  question_text text,
  similarity    float
)
language sql stable
as $$
  select
    a.id,
    a.answer_text,
    a.confidence,
    a.is_canonical,
    q.question_text,
    1 - (a.embedding <=> query_embedding) as similarity
  from public.kb_answers a
  left join public.kb_questions q on q.id = a.question_id
  where a.embedding is not null
    and 1 - (a.embedding <=> query_embedding) > match_threshold
  order by a.embedding <=> query_embedding
  limit match_count;
$$;

commit;
