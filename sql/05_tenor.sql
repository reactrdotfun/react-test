-- Relai migration 05 — lock tenors (for the rate curve). Run after 04.
alter table topup_intents add column if not exists tenor  text not null default '1M'; -- 1M | 3M | 6M
alter table topup_intents add column if not exists expiry timestamptz;
