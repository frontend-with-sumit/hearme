/// Expected-failure return type for the shared layer: callers branch on `ok`
/// instead of catching a throw (AGENTS.md: Result-style returns for expected
/// failures). `E` is a union of typed `{ kind }` errors.
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
