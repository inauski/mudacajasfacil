import { supabase } from "@/integrations/supabase/client";

export type BoxRole = "owner" | "reader" | "commenter" | "editor";
export const ROLE_LABELS: Record<BoxRole, string> = { owner: "Propietario", reader: "Lector", commenter: "Comentador", editor: "Editor" };
export const canEditBox = (role: BoxRole | null) => role === "owner" || role === "editor";
export const canComment = (role: BoxRole | null) => canEditBox(role) || role === "commenter";
export const canManageBox = (role: BoxRole | null) => role === "owner";

export async function acceptInvites() {
  const { error } = await supabase.rpc("accept_box_invites");
  if (error) throw error;
}

// Only local box/list destinations survive password and OAuth sign-in.
export function safeDestination(value: unknown): string {
  return typeof value === "string" && /^\/cajas(?:\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?\/?$/i.test(value) ? value : "/cajas";
}
export const DESTINATION_KEY = "muda-shared-destination";

export function pageMeta(title: string, description: string) {
  return [
    { title }, { name: "description", content: description },
    { property: "og:title", content: title }, { property: "og:description", content: description },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ];
}
