-- =============================================================================
-- RNTell: Update Auth Trigger for New Roles
-- /supabase/migrations/20240202_update_auth_trigger.sql
--
-- Extends handle_new_user() to support the landlord role.
-- Nurse and facility logic is preserved exactly as written in 20240102.
-- Admin accounts are created manually — no auto-row needed.
-- =============================================================================

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

  -- NURSE: create nurses row (default role if none specified)
  if coalesce((new.raw_user_meta_data ->> 'role'), 'nurse') = 'nurse' then
    insert into public.nurses (id)
    values (new.id);
  end if;

  -- FACILITY: create facilities row
  if (new.raw_user_meta_data ->> 'role') = 'facility' then
    insert into public.facilities (id, name)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'facility_name', 'Unnamed Facility')
    );
  end if;

  -- LANDLORD: create landlords row
  if (new.raw_user_meta_data ->> 'role') = 'landlord' then
    insert into public.landlords (id)
    values (new.id);
  end if;

  -- ADMIN: no auto-row created.
  -- Admin accounts are set up manually by the RNTell team directly
  -- in the Supabase dashboard. The profile row above is all that is needed
  -- for authentication. Access to the admin dashboard is controlled by
  -- checking role = 'admin' in RLS policies and Next.js middleware.

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Auto-creates a role-specific record when a user signs up. Handles: nurse (default), facility, landlord. Admin is manual-only.';
