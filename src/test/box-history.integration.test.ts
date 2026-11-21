import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Opt-in authenticated checks: only creates and removes this suite's new test box.
const enabled = process.env["RUN_BOX_HISTORY_LIVE_TESTS"] === "1";
const url = process.env["VITE_SUPABASE_URL"] ?? "";
const key = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "";
const session = enabled ? JSON.parse(process.env["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"] || "{}") : {};
const token: string = session.access_token ?? "";
const actor: string = session.user?.id ?? "";
let boxId = "";
async function call(path: string, method = "GET", body?: unknown, authenticated = true) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method, headers: { apikey: key, ...(authenticated ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json", Prefer: "return=representation" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return { ok: response.ok, status: response.status, data: await response.json().catch(() => null) };
}
async function history() {
  const result = await call(`box_activity?box_id=eq.${boxId}&order=created_at.desc`);
  expect(result.ok).toBe(true);
  return result.data as { action: string; actor_id: string; actor_label: string; created_at: string; details: Record<string, unknown> }[];
}
describe.skipIf(!enabled)("historial retirado en caja nueva", () => {
  beforeAll(async () => {
    if (!url || !key || !token || !actor) throw new Error("Authenticated test configuration unavailable");
    const result = await call("boxes", "POST", { user_id: actor, room: "Prueba de historial", notes: "Caja temporal de verificación" });
    expect(result.ok).toBe(true);
    boxId = String(result.data[0].id);
  });
  afterAll(async () => {
    if (boxId) expect((await call(`boxes?id=eq.${boxId}`, "DELETE")).ok).toBe(true);
  });
  it("no registra creación ni modificaciones al retirar el historial", async () => {
    expect(await history()).toEqual([]);
    expect((await call(`boxes?id=eq.${boxId}`, "PATCH", { status: "cerrada" })).ok).toBe(true);
    expect(await history()).toEqual([]);
  });
  it("compartir, cambiar permisos y revocar no genera historial", async () => {
    const email = `history-${crypto.randomUUID()}@example.com`;
    for (const role of ["reader", "editor"]) expect((await call("rpc/set_box_share", "POST", { _box_id: boxId, _email: email, _role: role })).ok).toBe(true);
    expect((await call("rpc/accept_box_invites", "POST", {})).ok).toBe(true);
    expect((await call(`box_shares?box_id=eq.${boxId}`, "DELETE")).ok).toBe(true);
    expect(await history()).toEqual([]);
  });
  it("comentarios y objetos siguen funcionando sin generar historial", async () => {
    expect((await call("box_comments", "POST", { box_id: boxId, user_id: actor, body: "Comentario de verificación" })).ok).toBe(true);
    const item = await call("items", "POST", { box_id: boxId, user_id: actor, name: "Sartén" });
    expect(item.ok).toBe(true);
    expect((await call(`items?id=eq.${String(item.data[0].id)}`, "PATCH", { origin: "Cajón" })).ok).toBe(true);
    expect(await history()).toEqual([]);
  });
  it("impide acceso anónimo y escritura, edición o borrado directo del historial", async () => {
    const anonymous = await call(`box_activity?box_id=eq.${boxId}`, "GET", undefined, false);
    expect(!anonymous.ok || anonymous.data.length === 0).toBe(true);
    expect((await call("box_activity", "POST", { box_id: boxId, actor_label: "Falso", action: "box_updated" })).ok).toBe(false);
    const before = await history();
    const edited = await call(`box_activity?box_id=eq.${boxId}`, "PATCH", { actor_label: "Falso" });
    expect(!edited.ok || edited.data.length === 0).toBe(true);
    const removed = await call(`box_activity?box_id=eq.${boxId}`, "DELETE");
    expect(!removed.ok || removed.data.length === 0).toBe(true);
    expect(await history()).toEqual(before);
  });
});