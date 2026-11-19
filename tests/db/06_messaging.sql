-- Messaging between matches (migration 8).
\set ON_ERROR_STOP on
\set QUIET on

select tests.member('60000000-0000-0000-0000-000000000001', 'Mira',  'woman', '{man}',   '1995-01-01', 12.97, 77.59);
select tests.member('60000000-0000-0000-0000-000000000002', 'Nikhil', 'man',  '{woman}', '1994-01-01', 12.97, 77.59);
select tests.member('60000000-0000-0000-0000-000000000003', 'Omar',  'man',   '{woman}', '1993-01-01', 12.97, 77.59);
-- Mira & Nikhil matched; Mira & Omar matched; Nikhil & Omar are strangers.
insert into public.matches (id, user_a, user_b) values
  ('6a000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002'),
  ('6a000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000003');

set role authenticated;

-- ---------- sending ----------
select tests.as_user('60000000-0000-0000-0000-000000000001');
select tests.ok(
  (public.send_message('6a000000-0000-0000-0000-000000000001', E'  Hi Nikhil!\u0007  ', '6b000000-0000-0000-0000-000000000001')).body = 'Hi Nikhil!',
  'messages are trimmed and control characters stripped');
select tests.ok(
  (public.send_message('6a000000-0000-0000-0000-000000000001', 'Hi Nikhil!', '6b000000-0000-0000-0000-000000000001')).id
    = (select id from public.messages where client_id = '6b000000-0000-0000-0000-000000000001'),
  'retrying with the same client id does not duplicate');
select tests.ok((select count(*) = 1 from public.messages where match_id = '6a000000-0000-0000-0000-000000000001'), 'exactly one message stored');
select tests.throws($$select public.send_message('6a000000-0000-0000-0000-000000000001', '   ', gen_random_uuid())$$, 'empty messages are rejected');
select tests.throws($$select public.send_message('6a000000-0000-0000-0000-000000000001', repeat('a', 2001), gen_random_uuid())$$, 'over-long messages are rejected');
select tests.lives($$select public.send_message('6a000000-0000-0000-0000-000000000001', E'line one\n\n\n\n\nline two', gen_random_uuid())$$, 'multi-line messages are fine');
select tests.ok((select body = E'line one\n\nline two' from public.messages where sender_id = auth.uid() order by created_at desc limit 1), 'runs of blank lines are collapsed');
select tests.throws($$insert into public.messages (match_id, sender_id, body, client_id) values ('6a000000-0000-0000-0000-000000000001', auth.uid(), 'x', gen_random_uuid())$$, 'messages cannot be inserted directly');
select tests.throws($$update public.messages set body = 'edited'$$, 'messages cannot be edited directly');

-- ---------- reading ----------
select tests.as_user('60000000-0000-0000-0000-000000000002');
select tests.ok((select count(*) = 2 from public.messages), 'the other person in the match can read the conversation');
select tests.ok((select unread_count = 2 from public.my_conversations() where match_id = '6a000000-0000-0000-0000-000000000001'), 'unread messages are counted');
select tests.ok(public.unread_conversations_count() = 1, 'nav badge counts conversations with unread messages');
select tests.ok(public.conversation_seen_at('6a000000-0000-0000-0000-000000000001') is not null, 'Nikhil sees when Mira last read (sending counts as reading)');
select public.mark_conversation_read('6a000000-0000-0000-0000-000000000001');
select tests.ok((select unread_count = 0 from public.my_conversations() where match_id = '6a000000-0000-0000-0000-000000000001'), 'opening the chat clears unread');
select tests.throws($$select public.send_message('6a000000-0000-0000-0000-000000000002', 'hello', gen_random_uuid())$$, 'outsiders cannot post into someone else''s match');

select tests.as_user('60000000-0000-0000-0000-000000000003');
select tests.ok((select count(*) = 0 from public.messages where match_id = '6a000000-0000-0000-0000-000000000001'), 'outsiders cannot read someone else''s conversation');
select tests.ok((select count(*) = 0 from public.match_reads where match_id = '6a000000-0000-0000-0000-000000000001'), 'outsiders cannot see read state');

-- ---------- read receipts privacy ----------
reset role;
update public.privacy_settings set send_read_receipts = false where profile_id = '60000000-0000-0000-0000-000000000002';
set role authenticated;
select tests.as_user('60000000-0000-0000-0000-000000000001');
select tests.ok(public.conversation_seen_at('6a000000-0000-0000-0000-000000000001') is null, 'no "seen" when the other person hides read receipts');
select tests.ok((select count(*) = 0 from public.match_reads where profile_id = '60000000-0000-0000-0000-000000000002'), 'their read row is hidden too');
select tests.as_user('60000000-0000-0000-0000-000000000002');
select tests.ok(public.conversation_seen_at('6a000000-0000-0000-0000-000000000001') is null, 'and someone who hides receipts doesn''t see others'' (it''s mutual)');

-- ---------- rate limit ----------
select tests.as_user('60000000-0000-0000-0000-000000000001');
do $$ begin
  for i in 1..18 loop perform public.send_message('6a000000-0000-0000-0000-000000000002', 'msg ' || i, gen_random_uuid()); end loop;
end $$;
select tests.throws($$select public.send_message('6a000000-0000-0000-0000-000000000002', 'one too many', gen_random_uuid())$$, 'more than 20 messages a minute is refused');

-- ---------- ending the conversation ----------
select tests.as_user('60000000-0000-0000-0000-000000000002');
select public.unmatch('6a000000-0000-0000-0000-000000000001');
select tests.ok((select count(*) = 0 from public.messages where match_id = '6a000000-0000-0000-0000-000000000001'), 'after unmatching, the conversation disappears');
select tests.ok(not exists (select 1 from public.my_conversations() where match_id = '6a000000-0000-0000-0000-000000000001'), 'and leaves the conversation list');
select tests.as_user('60000000-0000-0000-0000-000000000001');
select tests.throws($$select public.send_message('6a000000-0000-0000-0000-000000000001', 'still there?', gen_random_uuid())$$, 'nobody can message into an ended match');

-- Blocking closes it too (Omar blocks Mira).
select tests.as_user('60000000-0000-0000-0000-000000000003');
insert into public.blocks (blocker_id, blocked_id) values ('60000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001');
select tests.as_user('60000000-0000-0000-0000-000000000001');
select tests.throws($$select public.send_message('6a000000-0000-0000-0000-000000000002', 'hello?', gen_random_uuid())$$, 'blocked: cannot message');
select tests.ok((select count(*) = 0 from public.messages where match_id = '6a000000-0000-0000-0000-000000000002'), 'blocked: conversation hidden');
select tests.ok(public.unread_conversations_count() = 0, 'no unread conversations remain');

reset role;
