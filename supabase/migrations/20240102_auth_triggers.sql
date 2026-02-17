-- =============================================================================
-- RNTell MVP: Auth Triggers
-- /supabase/migrations/20240102_auth_triggers.sql
--
-- Automatically creates a profile row when a new user signs up via Supabase Auth.
-- Defaults role to 'nurse' unless specified in user_metadata.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. HANDLE NEW USER FUNCTION
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    role,
    email,
    full_name,
    avatar_url
  )
  values (
    new.id,
    coalesce(
      (new.raw_user_meta_data ->> 'role')::public.user_role,
      'nurse'::public.user_role
    ),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );

  -- If the user signed up as a nurse, also create the nurses row
  if coalesce((new.raw_user_meta_data ->> 'role'), 'nurse') = 'nurse' then
    insert into public.nurses (id)
    values (new.id);
  end if;

  -- If the user signed up as a facility, also create the facilities row
  if (new.raw_user_meta_data ->> 'role') = 'facility' then
    insert into public.facilities (id, name)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'facility_name', 'Unnamed Facility')
    );
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates profile + role-specific record on signup. Defaults to nurse role.';

-- ---------------------------------------------------------------------------
-- 2. AUTH TRIGGER
-- ---------------------------------------------------------------------------
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
