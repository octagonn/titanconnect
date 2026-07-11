-- Returns post ids ranked by a recency-decayed engagement score ("hot" feed sort).
-- Score fades as a post ages, so a fresh unliked post still surfaces near the top,
-- while a highly-liked older post can outrank a very fresh, unengaged one.
create or replace function public.get_hot_post_ids(p_category text, p_limit int, p_offset int)
returns table(id uuid) as $$
  select p.id
  from public.posts p
  left join (select post_id, count(*) c from public.likes group by post_id) l on l.post_id = p.id
  left join (select post_id, count(*) c from public.comments group by post_id) c on c.post_id = p.id
  where p.category = p_category
  order by (coalesce(l.c, 0) * 2 + coalesce(c.c, 0) * 3 + 1)
    / power(extract(epoch from (now() - p.created_at)) / 3600 + 2, 1.5) desc
  limit p_limit offset p_offset;
$$ language sql stable;
