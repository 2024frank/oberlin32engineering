-- Lets an officer mark a "join the club" submission as approved, meaning it has been
-- converted into a real, identity-verified membership request rather than just
-- reviewed or archived. Distinct from those two so the officer can see at a glance
-- which join requests actually started the member pipeline.
alter table public.submissions drop constraint if exists submissions_status_check;
alter table public.submissions add constraint submissions_status_check check(status in ('new','reviewed','archived','approved'));
