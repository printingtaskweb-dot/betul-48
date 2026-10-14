-- Allow ward management only for authenticated municipal administrators,
-- admins, and authorized ward-management roles.

alter table public.wards enable row level security;

drop policy if exists "Authenticated users can read active wards" on public.wards;
create policy "Authenticated users can read active wards"
on public.wards
for select
to authenticated
using (is_active = true or exists (
  select 1
  from public.user_profiles
  where id = auth.uid()
    and (
      is_admin = true
      or role in (
        'admin',
        'municipal_administrator',
        'deputy_commissioner',
        'area_officer'
      )
    )
));

drop policy if exists "Authorized users can insert wards" on public.wards;
create policy "Authorized users can insert wards"
on public.wards
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and (
        is_admin = true
        or role in (
          'admin',
          'municipal_administrator',
          'deputy_commissioner',
          'area_officer'
        )
      )
  )
);

drop policy if exists "Authorized users can update wards" on public.wards;
create policy "Authorized users can update wards"
on public.wards
for update
to authenticated
using (exists (
  select 1
  from public.user_profiles
  where id = auth.uid()
    and (
      is_admin = true
      or role in (
        'admin',
        'municipal_administrator',
        'deputy_commissioner',
        'area_officer'
      )
    )
))
with check (exists (
  select 1
  from public.user_profiles
  where id = auth.uid()
    and (
      is_admin = true
      or role in (
        'admin',
        'municipal_administrator',
        'deputy_commissioner',
        'area_officer'
      )
    )
));

drop policy if exists "Authorized users can delete wards" on public.wards;
create policy "Authorized users can delete wards"
on public.wards
for delete
to authenticated
using (exists (
  select 1
  from public.user_profiles
  where id = auth.uid()
    and (
      is_admin = true
      or role in (
        'admin',
        'municipal_administrator',
        'deputy_commissioner',
        'area_officer'
      )
    )
));
