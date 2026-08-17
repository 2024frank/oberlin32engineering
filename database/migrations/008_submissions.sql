create table if not exists public.submission_rate_limits(
  network_hash text not null,
  bucket_start timestamptz not null,
  request_count integer not null default 0,
  primary key(network_hash,bucket_start)
);
alter table public.submission_rate_limits enable row level security;

create or replace function public.consume_submission_rate_limit(p_network_hash text,p_limit integer default 8)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_bucket timestamptz:=date_trunc('hour',now())+(floor(extract(minute from now())/15)*15||' minutes')::interval;v_count integer;begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service role required';end if;
  insert into public.submission_rate_limits(network_hash,bucket_start,request_count) values(p_network_hash,v_bucket,1)
  on conflict(network_hash,bucket_start) do update set request_count=public.submission_rate_limits.request_count+1
  returning request_count into v_count;
  delete from public.submission_rate_limits where bucket_start<now()-interval '2 days';
  return v_count<=p_limit;
end $$;
grant execute on function public.consume_submission_rate_limit(text,integer) to service_role;
