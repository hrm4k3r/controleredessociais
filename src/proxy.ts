import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

// Rotas sem login: tela de login, setup, página pública do relatório (token) e cron (segredo próprio).
const PUBLIC = [/^\/login/, /^\/setup/, /^\/r\//, /^\/api\/cron\//, /^\/_next\//, /^\/favicon/, /^\/icon/];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!hasSupabaseEnv()) {
    return pathname.startsWith("/setup") ? NextResponse.next() : NextResponse.redirect(new URL("/setup", req.url));
  }
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const isPublic = PUBLIC.some((re) => re.test(pathname));
  if (!data.user && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (data.user && pathname.startsWith("/login")) {
    const url = req.nextUrl.clone();
    url.pathname = "/modulos";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|svg|ico)$).*)"] };
