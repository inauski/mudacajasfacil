import { beforeAll, afterAll, describe, it, expect } from "vitest";

// Runs against this draft's local backend only. Never creates data in the live app.
const url = process.env["SUPABASE_URL"] ?? "";
const publicKey = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
const local = /^http:\/\/(127\.0\.0\.1|localhost):8001\/?$/.test(url) && !!serviceKey;
type User = { id: string; email: string; token: string };
const users: User[] = [];
let boxId = "", otherBoxId = "", itemId = "", photo = "";

async function call(token: string, path: string, method = "GET", data?: unknown) {
  const response = await fetch(url + path, {
    method, headers: { apikey: publicKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
  const text = await response.text();
  return { status: response.status, ok: response.ok, data: text ? JSON.parse(text) : null };
}
function user(index: number): User { const u = users[index]; if (!u) throw new Error("Test account missing"); return u; }
async function rpc(u: User, name: string, args: unknown = {}) { return call(u.token, `/rest/v1/rpc/${name}`, "POST", args); }
async function createUser(index: number, confirmed = true): Promise<User> {
  const email = `box-permission-${crypto.randomUUID()}-${index}@example.com`;
  const password = crypto.randomUUID();
  const created = await call(serviceKey, "/auth/v1/admin/users", "POST", { email, password, email_confirm: confirmed });
  if (!created.ok) throw new Error(`Cannot create isolated test account (${created.status})`);
  const u = { id: String(created.data.id), email, token: "" }; users.push(u);
  if (confirmed) {
    const login = await call(publicKey, "/auth/v1/token?grant_type=password", "POST", { email, password });
    if (!login.ok) throw new Error(`Cannot sign in test account (${login.status})`);
    u.token = String(login.data.access_token);
  }
  return u;
}
async function expectNoRows(result: Awaited<ReturnType<typeof call>>) {
  if (result.ok) expect(result.data).toEqual([]); else expect(result.status).toBeGreaterThanOrEqual(400);
}

describe.skipIf(!local)("privacidad real por caja (borrador local)", () => {
  beforeAll(async () => {
    for (let i = 0; i < 6; i++) await createUser(i, i !== 5);
    const owner = user(0);
    const created = await call(owner.token, "/rest/v1/boxes", "POST", { room: "Cocina", notes: "Caja compartida" });
    expect(created.ok).toBe(true); boxId = String(created.data[0].id);
    const other = await call(owner.token, "/rest/v1/boxes", "POST", { room: "Dormitorio", notes: "Caja no compartida" });
    expect(other.ok).toBe(true); otherBoxId = String(other.data[0].id);
    const item = await call(owner.token, "/rest/v1/items", "POST", { box_id: boxId, user_id: owner.id, name: "Sartén", quantity: 2, origin: "Cajón superior" });
    expect(item.ok).toBe(true); itemId = String(item.data[0].id);
    for (const [i, role] of [[1,"reader"],[2,"commenter"],[3,"editor"],[5,"editor"]] as const) {
      expect((await rpc(owner, "set_box_share", { _box_id: boxId, _email: user(i).email, _role: role })).ok).toBe(true);
      if (i !== 5) expect((await rpc(user(i), "accept_box_invites")).ok).toBe(true);
    }
    photo = `${owner.id}/${boxId}/test-photo.jpg`;
    const uploaded = await fetch(`${url}/storage/v1/object/box-photos/${photo}`, { method: "POST", headers: { apikey: publicKey, Authorization: `Bearer ${owner.token}`, "Content-Type": "image/jpeg" }, body: new Uint8Array([255,216,255,217]) });
    expect(uploaded.ok).toBe(true);
    expect((await call(owner.token, `/rest/v1/boxes?id=eq.${boxId}`, "PATCH", { photos: [photo] })).ok).toBe(true);
  }, 30000);
  afterAll(async () => {
    if (users[0] && photo) await call(user(0).token, "/storage/v1/object/box-photos", "DELETE", { prefixes: [photo] });
    if (users[0]) await call(user(0).token, `/rest/v1/boxes?user_id=eq.${user(0).id}`, "DELETE");
    for (const u of users) await call(serviceKey, `/auth/v1/admin/users/${u.id}`, "DELETE");
  }, 30000);

  it("lector lee la caja y objetos, sin editar, borrar ni comentar", async () => {
    const u = user(1);
    expect((await call(u.token, `/rest/v1/boxes?id=eq.${boxId}&select=*,items(*)`)).data[0].items[0].name).toBe("Sartén");
    await expectNoRows(await call(u.token, `/rest/v1/boxes?id=eq.${boxId}`, "PATCH", { room: "Prohibido" }));
    await expectNoRows(await call(u.token, `/rest/v1/items?id=eq.${itemId}`, "PATCH", { unpacked: true }));
    await expectNoRows(await call(u.token, `/rest/v1/items?id=eq.${itemId}`, "DELETE"));
    await expectNoRows(await call(u.token, `/rest/v1/boxes?id=eq.${boxId}`, "DELETE"));
    expect((await call(u.token, "/rest/v1/box_comments", "POST", { box_id: boxId, body: "Prohibido" })).ok).toBe(false);
    expect((await call(u.token, "/rest/v1/items", "POST", { box_id: boxId, name: "Prohibido" })).ok).toBe(false);
  });
  it("comentador añade solo comentarios con su identidad y no modifica contenido", async () => {
    const u = user(2);
    expect((await call(u.token, "/rest/v1/box_comments", "POST", { box_id: boxId, body: "Dejar junto a la cocina" })).ok).toBe(true);
    expect((await call(u.token, "/rest/v1/box_comments", "POST", { box_id: boxId, user_id: user(0).id, body: "Identidad falsa" })).ok).toBe(false);
    await expectNoRows(await call(u.token, `/rest/v1/boxes?id=eq.${boxId}`, "PATCH", { location: "Prohibido" }));
    await expectNoRows(await call(u.token, `/rest/v1/items?id=eq.${itemId}`, "PATCH", { name: "Prohibido" }));
  });
  it("editor modifica campos y objetos; conserva propietario, origen y numeración", async () => {
    const u = user(3);
    expect((await call(u.token, `/rest/v1/boxes?id=eq.${boxId}`, "PATCH", { location: "Estantería", status: "cerrada" })).data[0].location).toBe("Estantería");
    expect((await call(u.token, `/rest/v1/items?id=eq.${itemId}`, "PATCH", { quantity: 3, origin: "Cajón de cocina" })).data[0].quantity).toBe(3);
    const added = await call(u.token, "/rest/v1/items", "POST", { box_id: boxId, user_id: u.id, name: "Cargador", origin: "Mesilla" });
    expect(added.data[0].user_id).toBe(user(0).id);
    expect((await call(u.token, `/rest/v1/boxes?id=eq.${boxId}`, "PATCH", { code: "C-999" })).ok).toBe(false);
    expect((await call(u.token, `/rest/v1/boxes?id=eq.${boxId}`, "PATCH", { number: 999 })).ok).toBe(false);
    expect((await call(u.token, `/rest/v1/boxes?id=eq.${boxId}`, "PATCH", { user_id: u.id })).ok).toBe(false);
    expect((await call(u.token, `/rest/v1/items?id=eq.${itemId}`, "PATCH", { box_id: otherBoxId })).ok).toBe(false);
  });
  it("solo el propietario cambia permisos y elimina la caja", async () => {
    for (const i of [1,2,3]) {
      const u = user(i);
      expect((await rpc(u, "set_box_share", { _box_id: boxId, _email: user(4).email, _role: "editor" })).ok).toBe(false);
      await expectNoRows(await call(u.token, `/rest/v1/box_shares?box_id=eq.${boxId}`, "DELETE"));
      await expectNoRows(await call(u.token, `/rest/v1/boxes?id=eq.${boxId}`, "DELETE"));
    }
    expect((await call(user(0).token, `/rest/v1/boxes?id=eq.${boxId}`, "PATCH", { code: "mi-caja" })).data[0].code).toBe("MI-CAJA");
    expect((await call(user(0).token, `/rest/v1/boxes?id=eq.${otherBoxId}`, "PATCH", { code: "mi-CAJA" })).ok).toBe(false);
  });
  it("no expone otras cajas ni permite falsificar un correo en metadatos", async () => {
    expect((await call(user(1).token, `/rest/v1/boxes?id=eq.${otherBoxId}`)).data).toEqual([]);
    expect((await call(user(4).token, `/rest/v1/boxes?id=eq.${boxId}`)).data).toEqual([]);
    expect((await call(user(4).token, "/auth/v1/user", "PUT", { data: { email: user(5).email, recipient_email: user(1).email } })).ok).toBe(true);
    await rpc(user(4), "accept_box_invites");
    expect((await call(user(4).token, `/rest/v1/boxes?id=eq.${boxId}`)).data).toEqual([]);
    const shares = await call(user(0).token, `/rest/v1/box_shares?recipient_email=eq.${encodeURIComponent(user(5).email)}`);
    expect(shares.data[0].recipient_id).toBeNull();
    await expectNoRows(await call(publicKey, `/rest/v1/boxes?id=eq.${boxId}`));
    expect((await call(user(1).token, `/rest/v1/boxes?user_id=eq.${user(1).id}`)).data).toEqual([]);
  });
  it("fotos privadas: colaboradores pueden firmar solo archivos vinculados y editor sube en carpeta del dueño", async () => {
    expect((await call(user(1).token, `/storage/v1/object/sign/box-photos/${photo}`, "POST", { expiresIn: 60 })).ok).toBe(true);
    expect((await call(user(4).token, `/storage/v1/object/sign/box-photos/${photo}`, "POST", { expiresIn: 60 })).ok).toBe(false);
    for (const i of [1,2]) {
      const u = user(i);
      const r = await fetch(`${url}/storage/v1/object/box-photos/${user(0).id}/${boxId}/denied-${i}.jpg`, { method: "POST", headers: { apikey: publicKey, Authorization: `Bearer ${u.token}`, "Content-Type": "image/jpeg" }, body: new Uint8Array([255,216,255,217]) });
      expect(r.ok).toBe(false);
    }
    const editorPath = `${user(0).id}/${boxId}/editor.jpg`;
    const r = await fetch(`${url}/storage/v1/object/box-photos/${editorPath}`, { method: "POST", headers: { apikey: publicKey, Authorization: `Bearer ${user(3).token}`, "Content-Type": "image/jpeg" }, body: new Uint8Array([255,216,255,217]) });
    expect(r.ok).toBe(true);
    expect((await call(user(1).token, `/storage/v1/object/sign/box-photos/${editorPath}`, "POST", { expiresIn: 60 })).ok).toBe(false);
    const list = await call(user(1).token, "/storage/v1/object/list/box-photos", "POST", { prefix: `${user(0).id}/`, limit: 100, offset: 0 });
    expect(JSON.stringify(list.data)).not.toContain("secret.jpg");
    const blockedDelete = await call(user(1).token, "/storage/v1/object/box-photos", "DELETE", { prefixes: [photo] });
    if (blockedDelete.ok) expect(blockedDelete.data).toEqual([]);
    expect((await call(user(0).token, `/storage/v1/object/sign/box-photos/${photo}`, "POST", { expiresIn: 60 })).ok).toBe(true);
    expect((await call(user(3).token, `/rest/v1/items?id=eq.${itemId}`, "PATCH", { photo: editorPath })).ok).toBe(true);
    expect((await call(user(1).token, `/storage/v1/object/sign/box-photos/${editorPath}`, "POST", { expiresIn: 60 })).ok).toBe(true);
    expect((await call(user(3).token, `/rest/v1/items?id=eq.${itemId}`, "PATCH", { photo: `${user(0).id}/${otherBoxId}/secret.jpg` })).ok).toBe(false);
    const unsharedUpload = await fetch(`${url}/storage/v1/object/box-photos/${user(0).id}/${otherBoxId}/secret.jpg`, { method: "POST", headers: { apikey: publicKey, Authorization: `Bearer ${user(3).token}`, "Content-Type": "image/jpeg" }, body: new Uint8Array([255,216,255,217]) });
    expect(unsharedUpload.ok).toBe(false);
    await call(user(0).token, "/storage/v1/object/box-photos", "DELETE", { prefixes: [editorPath] });
  });
  it("revocación bloquea lecturas, escrituras, comentarios y nuevas firmas de fotos", async () => {
    const shares = await call(user(0).token, `/rest/v1/box_shares?box_id=eq.${boxId}&recipient_id=eq.${user(3).id}`);
    const shareId = shares.data[0].id;
    expect((await call(user(0).token, `/rest/v1/box_shares?id=eq.${shareId}`, "DELETE")).data).toHaveLength(1);
    const u = user(3);
    expect((await call(u.token, `/rest/v1/boxes?id=eq.${boxId}`)).data).toEqual([]);
    expect((await call(u.token, `/rest/v1/items?id=eq.${itemId}`)).data).toEqual([]);
    expect((await call(u.token, `/rest/v1/box_comments?box_id=eq.${boxId}`)).data).toEqual([]);
    expect((await call(u.token, `/rest/v1/box_activity?box_id=eq.${boxId}`)).data).toEqual([]);
    await expectNoRows(await call(u.token, `/rest/v1/boxes?id=eq.${boxId}`, "PATCH", { location: "Después de revocar" }));
    expect((await call(u.token, "/rest/v1/box_comments", "POST", { box_id: boxId, body: "Después de revocar" })).ok).toBe(false);
    expect((await call(u.token, `/storage/v1/object/sign/box-photos/${photo}`, "POST", { expiresIn: 60 })).ok).toBe(false);
  });
  it("borrar caja no retrocede su contador", async () => {
    expect((await call(user(0).token, `/rest/v1/boxes?id=eq.${otherBoxId}`, "DELETE")).ok).toBe(true);
    const next = await call(user(0).token, "/rest/v1/boxes", "POST", { room: "Salón" });
    expect(next.data[0].number).toBe(3); expect(next.data[0].code).toBe("C-003");
  });
});
