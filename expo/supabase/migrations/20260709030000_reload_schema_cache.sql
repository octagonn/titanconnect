-- PostgREST's schema cache didn't pick up the new self-referencing FK
-- (posts.tagged_event_id -> posts.id) from the previous migration in time —
-- self-referencing constraints on a table PostgREST already knows about
-- don't always trip its DDL-listener the way a brand new table does. Force
-- an explicit reload rather than waiting on it.
NOTIFY pgrst, 'reload schema';
