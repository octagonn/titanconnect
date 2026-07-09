-- Adds a couple of untouched demo scenarios on top of the existing seed
-- data (supabase/seed.sql) so a real logged-in tester has something to act
-- on as the *other* party: message a seller who isn't them, request to join
-- a study group that requires host approval. Mirrors seed.sql's "section 7"
-- so local `db reset` and the remote project stay in sync. Guarded with
-- `on conflict do nothing` — safe to re-run, and a no-op if the base seed
-- accounts from seed.sql were never applied to this database.
insert into public.posts (id, user_id, content, category, title, price, condition, tags, created_at) values
  ('b2222222-2222-4222-8222-222222222212', 'a1111111-1111-4111-8111-111111111103', 'USB-C rechargeable, three brightness settings, barely used this semester.', 'market', 'Desk Lamp — USB-C Charging', 12, 'Good', array['dorm','electronics'], now() - interval '2 hours')
on conflict (id) do nothing;

insert into public.posts (id, user_id, content, category, course, scheduled_at, location, tags, join_policy, created_at) values
  ('b2222222-2222-4222-8222-222222222213', 'a1111111-1111-4111-8111-111111111104', 'Grinding through the discrete math problem sets before Friday''s deadline. Keeping it small so message me first.', 'study', 'MATH 245', now() + interval '3 days' + interval '15 hours', 'Pollak Library', array['problem sets','midterm'], 'approval', now() - interval '1 hour')
on conflict (id) do nothing;

insert into public.likes (post_id, user_id) values
  ('b2222222-2222-4222-8222-222222222213', 'a1111111-1111-4111-8111-111111111105')
on conflict (post_id, user_id) do nothing;
