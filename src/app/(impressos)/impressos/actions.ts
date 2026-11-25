"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/access";
import { isValidISO } from "@/lib/dates";
import { defaultSteps, isPageKind, isPageSize, isPageStatus, isPrintKind, isPrintStatus, isProofResult, nextStatus, parseMoney } from "@/lib/impressos";

type SB = Awaited<ReturnType<typeof createClient>>;
const txt = (fd: FormData, k: string) => { const v = String(fd.get(k) ?? "").trim(); return v === "" ? null : v; };
const date = (v: string | null) => (v && isValidISO(v) ? v : null);
const int = (v: string | null) => { const n = Number(v); return v && Number.isInteger(n) && n > 0 ? n : null; };
const refresh = () => revalidatePath("/impressos", "layout");
async function imp() {
  const sb = await createClient();
  await requireModule(sb, "impressos");
  return sb;
}

/** Garante que o cliente também aparece nesta gestão (clients.modules contém 'impressos'). */
async function addModule(sb: SB, id: string, modules: string[] | null) {
  if (modules?.includes("impressos")) return;
  await sb.from("clients").update({ modules: [...(modules ?? []), "impressos"] }).eq("id", id);
}
async function clientFor(sb: SB, fd: FormData): Promise<string | null> {
  const newName = txt(fd, "new_client");
  if (newName) {
    const { data: found } = await sb.from("clients").select("id,modules").eq("name", newName).maybeSingle();
    if (found) { await addModule(sb, found.id as string, found.modules as string[] | null); return found.id as string; }
    const { data: last } = await sb.from("clients").select("sort").order("sort", { ascending: false }).limit(1);
    const { data, error } = await sb.from("clients").insert({ name: newName, weekly_goal: 0, sort: (last?.[0]?.sort ?? 0) + 1, modules: ["impressos"] }).select("id").single();
    if (error) throw new Error(error.message);
    return data.id as string;
  }
  const sel = String(fd.get("client_id") ?? "");
  if (!sel) return null;
  const { data: c } = await sb.from("clients").select("id,modules").eq("id", sel).maybeSingle();
  if (!c) return null;
  await addModule(sb, c.id as string, c.modules as string[] | null);
  return c.id as string;
}

export async function saveJob(fd: FormData) {
  const sb = await imp();
  const id = txt(fd, "id");
  const title = txt(fd, "title");
  const kind = String(fd.get("kind") ?? "outro");
  const status = String(fd.get("status") ?? "briefing");
  if (!title) redirect(id ? `/impressos/trabalhos/${id}?erro=titulo` : "/impressos/trabalhos?erro=titulo");
  if (!isPrintKind(kind) || !isPrintStatus(status)) redirect("/impressos/trabalhos?erro=dados");
  const row = {
    title, kind, status, client_id: await clientFor(sb, fd),
    quantity: int(txt(fd, "quantity")), pages: int(txt(fd, "pages")),
    size: txt(fd, "size"), paper: txt(fd, "paper"), colors: txt(fd, "colors"), finish: txt(fd, "finish"), supplier: txt(fd, "supplier"),
    cost: parseMoney(String(fd.get("cost") ?? "")), price: parseMoney(String(fd.get("price") ?? "")),
    due_date: date(txt(fd, "due_date")), notes: txt(fd, "notes"),
  };
  let jid = id;
  if (id) {
    const { error } = await sb.from("print_jobs").update(row).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await sb.from("print_jobs").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    jid = data.id as string;
    if (fd.get("steps") === "1") {
      const steps = defaultSteps(kind).map((t, i) => ({ job_id: jid, title: t, position: (i + 1) * 1000 }));
      await sb.from("print_steps").insert(steps);
    }
  }
  refresh();
  redirect(`/impressos/trabalhos/${jid}?ok=1`);
}

export async function deleteJob(fd: FormData) {
  const sb = await imp();
  const { error } = await sb.from("print_jobs").delete().eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  refresh();
  redirect("/impressos/trabalhos?ok=1");
}

/** Muda a situação (select) ou avança para a próxima (botão). */
export async function setJobStatus(fd: FormData) {
  const sb = await imp();
  const id = String(fd.get("id"));
  const back = String(fd.get("back") ?? "/impressos");
  let status = String(fd.get("status") ?? "");
  if (fd.get("advance") === "1") status = nextStatus(String(fd.get("current"))) ?? "";
  if (!isPrintStatus(status)) redirect(back);
  const { error } = await sb.from("print_jobs").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
  redirect(back.startsWith("/impressos") ? back : "/impressos");
}

/* ---------- Etapas ---------- */
const jobUrl = (id: string, q = "ok=1") => `/impressos/trabalhos/${id}?${q}`;
export async function addStep(fd: FormData) {
  const sb = await imp();
  const job_id = String(fd.get("job_id"));
  const title = txt(fd, "title");
  if (!title) redirect(jobUrl(job_id, "erro=etapa"));
  const { data } = await sb.from("print_steps").select("position").eq("job_id", job_id).order("position", { ascending: false }).limit(1);
  const { error } = await sb.from("print_steps").insert({ job_id, title, due_date: date(txt(fd, "due_date")), position: Number(data?.[0]?.position ?? 0) + 1000 });
  if (error) throw new Error(error.message);
  refresh();
  redirect(jobUrl(job_id));
}
export async function toggleStep(fd: FormData) {
  const sb = await imp();
  const { error } = await sb.from("print_steps").update({ done: fd.get("done") !== "1" }).eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  refresh();
  redirect(jobUrl(String(fd.get("job_id")), "ok=1#etapas"));
}
export async function deleteStep(fd: FormData) {
  const sb = await imp();
  const { error } = await sb.from("print_steps").delete().eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  refresh();
  redirect(jobUrl(String(fd.get("job_id")), "ok=1#etapas"));
}

/* ---------- Provas ---------- */
export async function addProof(fd: FormData) {
  const sb = await imp();
  const job_id = String(fd.get("job_id"));
  const { data } = await sb.from("print_proofs").select("version").eq("job_id", job_id).order("version", { ascending: false }).limit(1);
  const { error } = await sb.from("print_proofs").insert({
    job_id, version: Number(data?.[0]?.version ?? 0) + 1, sent_at: date(txt(fd, "sent_at")) ?? undefined, notes: txt(fd, "notes"),
  });
  if (error) throw new Error(error.message);
  refresh();
  redirect(jobUrl(job_id, "ok=1#provas"));
}
export async function setProof(fd: FormData) {
  const sb = await imp();
  const result = String(fd.get("result") ?? "");
  if (!isProofResult(result)) redirect(jobUrl(String(fd.get("job_id")), "erro=dados"));
  const { error } = await sb.from("print_proofs").update({ result }).eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  refresh();
  redirect(jobUrl(String(fd.get("job_id")), "ok=1#provas"));
}
export async function deleteProof(fd: FormData) {
  const sb = await imp();
  const { error } = await sb.from("print_proofs").delete().eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  refresh();
  redirect(jobUrl(String(fd.get("job_id")), "ok=1#provas"));
}

/* ---------- Páginas (ex.: anunciantes de uma revista) ---------- */
export async function savePage(fd: FormData) {
  const sb = await imp();
  const job_id = String(fd.get("job_id"));
  const id = txt(fd, "id");
  const title = txt(fd, "title");
  const kind = String(fd.get("kind") ?? "anuncio");
  const size = String(fd.get("size") ?? "1");
  const status = String(fd.get("status") ?? "para_fazer");
  if (!title) redirect(jobUrl(job_id, "erro=pagina#paginas"));
  if (!isPageKind(kind) || !isPageSize(size) || !isPageStatus(status)) redirect(jobUrl(job_id, "erro=dados#paginas"));
  const row = {
    title, kind, size, status, advertiser: txt(fd, "advertiser"), page_number: int(txt(fd, "page_number")),
    value: parseMoney(String(fd.get("value") ?? "")), assignee_id: txt(fd, "assignee_id"), due_date: date(txt(fd, "due_date")), notes: txt(fd, "notes"),
  };
  if (id) {
    const { error } = await sb.from("print_pages").update(row).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data } = await sb.from("print_pages").select("position").eq("job_id", job_id).order("position", { ascending: false }).limit(1);
    const { error } = await sb.from("print_pages").insert({ ...row, job_id, position: Number(data?.[0]?.position ?? 0) + 1000 });
    if (error) throw new Error(error.message);
  }
  refresh();
  redirect(jobUrl(job_id, "ok=1#paginas"));
}

/** Move a página entre as colunas (select) ou avança para a próxima coluna (botão). */
export async function setPageStatus(fd: FormData) {
  const sb = await imp();
  const job_id = String(fd.get("job_id"));
  let status = String(fd.get("status") ?? "");
  if (fd.get("advance") === "1") {
    const order = ["aguardando_material", "para_fazer", "produzindo", "para_conferir", "aprovado"];
    const cur = String(fd.get("current"));
    status = cur === "ajustes" ? "para_conferir" : order[Math.min(order.indexOf(cur) + 1, order.length - 1)] ?? "";
  }
  if (!isPageStatus(status)) redirect(jobUrl(job_id, "erro=dados#paginas"));
  const { error } = await sb.from("print_pages").update({ status }).eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  refresh();
  redirect(jobUrl(job_id, "ok=1#paginas"));
}

export async function deletePage(fd: FormData) {
  const sb = await imp();
  const { error } = await sb.from("print_pages").delete().eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  refresh();
  redirect(jobUrl(String(fd.get("job_id")), "ok=1#paginas"));
}
