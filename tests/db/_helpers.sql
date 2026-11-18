-- Tiny assertion helpers for SQL tests (no pgTAP dependency).
create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.ok(cond boolean, description text) returns void language plpgsql as $$
begin
  if cond is distinct from true then
    raise exception 'FAIL: %', description;
  end if;
  raise notice 'ok - %', description;
end $$;

-- Expect a statement to fail. Runs it in a subtransaction so the test can continue.
create function tests.throws(stmt text, description text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'ok - % (%)', description, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % (statement succeeded: %)', description, stmt;
end $$;

-- Expect a statement to succeed.
create function tests.lives(stmt text, description text) returns void language plpgsql as $$
begin
  execute stmt;
  raise notice 'ok - %', description;
exception when others then
  raise exception 'FAIL: % (%)', description, sqlerrm;
end $$;

grant execute on all functions in schema tests to anon, authenticated;
