-- The event journal is append-only (docs/event-log.md, D-015): rows can be
-- inserted but never updated, deleted or truncated. The database enforces it,
-- so an application bug or a stray SQL statement cannot rewrite history.
-- (Roles with ownership of the table can still disable triggers; production
-- should connect with a role that does not own it, see T-066.)

CREATE FUNCTION events_block_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'events is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER events_no_update_delete
  BEFORE UPDATE OR DELETE ON "events"
  FOR EACH ROW EXECUTE FUNCTION events_block_mutation();

CREATE TRIGGER events_no_truncate
  BEFORE TRUNCATE ON "events"
  FOR EACH STATEMENT EXECUTE FUNCTION events_block_mutation();
