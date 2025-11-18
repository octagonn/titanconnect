-- Add role column to profiles and update handle_new_user to use auth metadata role

alter table public.profiles
  add column if not exists role text check (role in ('student','faculty')) default 'student';

create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_role text;
begin
  new_role := coalesce(new.raw_user_meta_data->>'role', 'student');

  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new_role
  );
  return new;
end;
$$ language plpgsql security definer;



