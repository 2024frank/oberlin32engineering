-- Media library needed a human layer over the raw upload record.
--
-- Files were listed by their camera-roll name (IMG_0575.jpg) with no way to
-- rename, describe, or delete them, and no alt text anywhere -- which is an
-- accessibility gap the moment one of these images reaches a public page.
alter table public.media add column if not exists title text not null default '';
alter table public.media add column if not exists alt_text text not null default '';

comment on column public.media.title is 'Human name for the file. Falls back to file_name when empty.';
comment on column public.media.alt_text is 'Describes the image for screen readers when it is placed on a public page.';
