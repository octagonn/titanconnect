-- Demo/seed data: fake student accounts + sample posts across every
-- category (events, study buddy, marketplace, anonymous incl. poll and
-- wishbone), plus a handful of likes/votes/comments so the feed doesn't
-- look empty while developing or demoing. Safe to re-run: every insert is
-- keyed off a fixed uuid and guarded with `on conflict do nothing`.
--
-- Run this once in the Supabase SQL editor AFTER applying all migrations
-- (in particular 20260704070000_extend_posts_categories.sql and
-- 20260704080000_anon_subtypes_tags_votes.sql).
--
-- These accounts are seed data only — they have no real password/identity
-- and cannot sign in. They exist purely so posts/likes/comments have a
-- believable author.

-- 1. Fake auth users (triggers public.handle_new_user() -> creates profiles row)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-8111-111111111101', 'authenticated', 'authenticated', 'ava.chen.seed@fullerton.edu', crypt('seed-not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Ava Chen","role":"student"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-8111-111111111102', 'authenticated', 'authenticated', 'marcus.johnson.seed@fullerton.edu', crypt('seed-not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Marcus Johnson","role":"student"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-8111-111111111103', 'authenticated', 'authenticated', 'priya.patel.seed@fullerton.edu', crypt('seed-not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Priya Patel","role":"student"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-8111-111111111104', 'authenticated', 'authenticated', 'jordan.lee.seed@fullerton.edu', crypt('seed-not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Jordan Lee","role":"student"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-8111-111111111105', 'authenticated', 'authenticated', 'sofia.ramirez.seed@fullerton.edu', crypt('seed-not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Sofia Ramirez","role":"student"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-8111-111111111106', 'authenticated', 'authenticated', 'tyler.brooks.seed@fullerton.edu', crypt('seed-not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Tyler Brooks","role":"student"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

-- 2. Flesh out the auto-created profiles rows (major/year/bio/avatar/interests)
update public.profiles set
  major = 'Computer Science', year = 'Junior', bio = 'CS major, always down to pair on an assignment.',
  avatar_url = 'https://i.pravatar.cc/300?img=47', interests = array['coding','coffee','hiking'], is_profile_complete = true
where id = 'a1111111-1111-4111-8111-111111111101';

update public.profiles set
  major = 'Business Administration', year = 'Senior', bio = 'Marketing club officer. Ask me about the spring mixer.',
  avatar_url = 'https://i.pravatar.cc/300?img=12', interests = array['basketball','entrepreneurship'], is_profile_complete = true
where id = 'a1111111-1111-4111-8111-111111111102';

update public.profiles set
  major = 'Biology', year = 'Sophomore', bio = 'Pre-med. Trying to survive genetics.',
  avatar_url = 'https://i.pravatar.cc/300?img=32', interests = array['research','volleyball'], is_profile_complete = true
where id = 'a1111111-1111-4111-8111-111111111103';

update public.profiles set
  major = 'Kinesiology', year = 'Freshman', bio = 'First year, still finding my way around campus.',
  avatar_url = 'https://i.pravatar.cc/300?img=15', interests = array['fitness','music'], is_profile_complete = true
where id = 'a1111111-1111-4111-8111-111111111104';

update public.profiles set
  major = 'Art', year = 'Senior', bio = 'Painting major, runs the campus art club fundraiser table.',
  avatar_url = 'https://i.pravatar.cc/300?img=45', interests = array['art','baking'], is_profile_complete = true
where id = 'a1111111-1111-4111-8111-111111111105';

update public.profiles set
  major = 'Mechanical Engineering', year = 'Junior', bio = 'ME major. Selling stuff I don''t need anymore.',
  avatar_url = 'https://i.pravatar.cc/300?img=53', interests = array['robotics','gaming'], is_profile_complete = true
where id = 'a1111111-1111-4111-8111-111111111106';

-- 3. Sample posts across every category
insert into public.posts (id, user_id, content, category, title, scheduled_at, location, tags, created_at) values
  ('b2222222-2222-4222-8222-222222222201', 'a1111111-1111-4111-8111-111111111102', 'Come watch the Titans take on Long Beach State! Free pizza while it lasts.', 'events', 'Titans Basketball Watch Party', now() + interval '3 days' + interval '18 hours', 'Titan Student Union', array['sports','free food'], now() - interval '2 hours'),
  ('b2222222-2222-4222-8222-222222222202', 'a1111111-1111-4111-8111-111111111101', 'Bring your laptop, we''ll have snacks and quiet rooms booked all night.', 'events', 'Late Night Study Jam', now() + interval '1 day' + interval '20 hours', 'Pollak Library', array['study','free food'], now() - interval '5 hours'),
  ('b2222222-2222-4222-8222-222222222203', 'a1111111-1111-4111-8111-111111111105', 'Kicking off the semester with live music and 40+ club booths on Titan Walk.', 'events', 'Spring Club Fair Kickoff', now() + interval '5 days' + interval '11 hours', 'Titan Walk', array['clubs','music'], now() - interval '1 day')
on conflict (id) do nothing;

insert into public.posts (id, user_id, content, category, course, scheduled_at, location, tags, created_at) values
  ('b2222222-2222-4222-8222-222222222204', 'a1111111-1111-4111-8111-111111111101', 'Anyone free to review linked lists and trees before the midterm?', 'study', 'CPSC 131', now() + interval '2 days' + interval '16 hours', 'Pollak Library', array['midterm','group study'], now() - interval '3 hours'),
  ('b2222222-2222-4222-8222-222222222205', 'a1111111-1111-4111-8111-111111111103', 'Forming a small group to work through the genetics problem sets together.', 'study', 'BIOL 172', now() + interval '2 days' + interval '14 hours', 'McCarthy Hall', array['problem sets'], now() - interval '6 hours')
on conflict (id) do nothing;

insert into public.posts (id, user_id, content, category, title, price, condition, tags, created_at) values
  ('b2222222-2222-4222-8222-222222222206', 'a1111111-1111-4111-8111-111111111104', 'Moving out of the dorms, works perfectly, just don''t need it anymore.', 'market', 'Mini Fridge — barely used', 40, 'Good', array['dorm','appliance'], now() - interval '1 day'),
  ('b2222222-2222-4222-8222-222222222207', 'a1111111-1111-4111-8111-111111111106', 'Used for one semester of calc, no scratches, comes with the case.', 'market', 'TI-84 Plus Calculator', 30, 'Like New', array['math','textbook alt'], now() - interval '8 hours'),
  ('b2222222-2222-4222-8222-222222222208', 'a1111111-1111-4111-8111-111111111105', 'Fundraiser for the art club — DM me to order, pickup on Titan Walk!', 'market', 'Homemade Tamales (dozen)', 15, null, array['food'], now() - interval '4 hours')
on conflict (id) do nothing;

insert into public.posts (id, user_id, content, category, subtype, created_at) values
  ('b2222222-2222-4222-8222-222222222209', 'a1111111-1111-4111-8111-111111111103', 'Why does the 3rd floor of Pollak always smell like coffee and stress', 'anon', 'thought', now() - interval '9 hours')
on conflict (id) do nothing;

insert into public.posts (id, user_id, content, category, subtype, poll_options, created_at) values
  ('b2222222-2222-4222-8222-222222222210', 'a1111111-1111-4111-8111-111111111104', 'Best place to nap between classes?', 'anon', 'poll',
    '[{"id":0,"label":"TSU couches"},{"id":1,"label":"Library cubicles"},{"id":2,"label":"My car"}]'::jsonb,
    now() - interval '12 hours')
on conflict (id) do nothing;

insert into public.posts (id, user_id, content, category, subtype, image_url, image_url_2, created_at) values
  ('b2222222-2222-4222-8222-222222222211', 'a1111111-1111-4111-8111-111111111106', 'Which dining hall plate wins?', 'anon', 'wishbone',
    'https://picsum.photos/seed/titan-food-a/600/600', 'https://picsum.photos/seed/titan-food-b/600/600',
    now() - interval '1 day')
on conflict (id) do nothing;

-- 4. Likes (also drives "joined"/"interested"/"saved" for events, study, market)
insert into public.likes (post_id, user_id) values
  ('b2222222-2222-4222-8222-222222222201', 'a1111111-1111-4111-8111-111111111101'),
  ('b2222222-2222-4222-8222-222222222201', 'a1111111-1111-4111-8111-111111111103'),
  ('b2222222-2222-4222-8222-222222222202', 'a1111111-1111-4111-8111-111111111102'),
  ('b2222222-2222-4222-8222-222222222204', 'a1111111-1111-4111-8111-111111111103'),
  ('b2222222-2222-4222-8222-222222222205', 'a1111111-1111-4111-8111-111111111101'),
  ('b2222222-2222-4222-8222-222222222206', 'a1111111-1111-4111-8111-111111111105'),
  ('b2222222-2222-4222-8222-222222222209', 'a1111111-1111-4111-8111-111111111101'),
  ('b2222222-2222-4222-8222-222222222209', 'a1111111-1111-4111-8111-111111111104')
on conflict (post_id, user_id) do nothing;

-- 5. Poll and wishbone votes
insert into public.post_votes (post_id, user_id, option_index) values
  ('b2222222-2222-4222-8222-222222222210', 'a1111111-1111-4111-8111-111111111101', 0),
  ('b2222222-2222-4222-8222-222222222210', 'a1111111-1111-4111-8111-111111111102', 1),
  ('b2222222-2222-4222-8222-222222222210', 'a1111111-1111-4111-8111-111111111103', 0),
  ('b2222222-2222-4222-8222-222222222210', 'a1111111-1111-4111-8111-111111111105', 2),
  ('b2222222-2222-4222-8222-222222222211', 'a1111111-1111-4111-8111-111111111101', 0),
  ('b2222222-2222-4222-8222-222222222211', 'a1111111-1111-4111-8111-111111111102', 1),
  ('b2222222-2222-4222-8222-222222222211', 'a1111111-1111-4111-8111-111111111103', 0)
on conflict (post_id, user_id) do nothing;

-- 6. A couple of comments for realism
insert into public.comments (post_id, user_id, content) values
  ('b2222222-2222-4222-8222-222222222201', 'a1111111-1111-4111-8111-111111111101', 'Wouldn''t miss it, see you all there!'),
  ('b2222222-2222-4222-8222-222222222206', 'a1111111-1111-4111-8111-111111111103', 'Is this still available?')
on conflict do nothing;

-- 7. Untouched listings/sessions owned by seed accounts, so a real logged-in
-- tester (not one of the seed NPCs above) has something to act on as the
-- *other* party — message a seller, request to join a gated study group —
-- without needing to sign in as one of the fake accounts.
insert into public.posts (id, user_id, content, category, title, price, condition, tags, created_at) values
  ('b2222222-2222-4222-8222-222222222212', 'a1111111-1111-4111-8111-111111111103', 'USB-C rechargeable, three brightness settings, barely used this semester.', 'market', 'Desk Lamp — USB-C Charging', 12, 'Good', array['dorm','electronics'], now() - interval '2 hours')
on conflict (id) do nothing;

insert into public.posts (id, user_id, content, category, course, scheduled_at, location, tags, join_policy, created_at) values
  ('b2222222-2222-4222-8222-222222222213', 'a1111111-1111-4111-8111-111111111104', 'Grinding through the discrete math problem sets before Friday''s deadline. Keeping it small so message me first.', 'study', 'MATH 245', now() + interval '3 days' + interval '15 hours', 'Pollak Library', array['problem sets','midterm'], 'approval', now() - interval '1 hour')
on conflict (id) do nothing;

insert into public.likes (post_id, user_id) values
  ('b2222222-2222-4222-8222-222222222213', 'a1111111-1111-4111-8111-111111111105')
on conflict (post_id, user_id) do nothing;
