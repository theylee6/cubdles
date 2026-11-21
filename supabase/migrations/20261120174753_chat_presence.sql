-- Cubdles — migration 15: private Realtime channels for typing indicators and "online now".
-- Topic "chat-presence:<match id>" may only be joined (and written to) by the two people in that
-- match while it is active. Supabase Realtime checks these policies when a private channel is joined.
-- Guarded so local test databases without the realtime schema still migrate.

do $$
begin
  if to_regclass('realtime.messages') is not null and to_regproc('realtime.topic') is not null then
    execute $p$
      create policy "chat presence: match members read" on realtime.messages
        for select to authenticated
        using (
          realtime.topic() like 'chat-presence:%'
          and (select private.in_active_match(nullif(split_part(realtime.topic(), ':', 2), '')::uuid))
        )
    $p$;
    execute $p$
      create policy "chat presence: match members write" on realtime.messages
        for insert to authenticated
        with check (
          realtime.topic() like 'chat-presence:%'
          and (select private.in_active_match(nullif(split_part(realtime.topic(), ':', 2), '')::uuid))
        )
    $p$;
  end if;
end $$;
