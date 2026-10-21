import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { UNLOCK_COOKIE, unlockOptions } from "@/lib/unlock";

// Routes that work without a logged-in user
const PUBLIC_PREFIXES = [
  "/login", // also covers /login-pin
  "/faktura/vis",
  "/api/faktura/claim",
  "/api/gemba",
  "/api/bank-transfer/callback",
];

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[middleware] Supabase environment variables are missing at runtime");
    return new NextResponse("Server configuration error: Supabase environment variables are missing.", {
      status: 500,
    });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    console.error("[middleware] supabase.auth.getUser failed:", err);
  }

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p));
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    return NextResponse.redirect(url);
  };

  // Not logged in
  if (!user) return isPublic ? response : redirectTo("/login");

  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const onboarded = meta.onboarded === true; // name + verified phone done
  const hasPin = meta.has_pin === true;

  const onOnboarding = path.startsWith("/onboarding");
  const onCreatePin = path.startsWith("/create-pin");
  const onPinApi = path.startsWith("/api/pin");
  const onLoginPin = path.startsWith("/login-pin");
  const onLoginPage = path === "/" || path === "/login";

  // Step 1: name, display name and a verified phone number
  if (!onboarded) {
    if (onOnboarding || path.startsWith("/api/onboarding") || path === "/api/pin/status") return response;
    if (isPublic && !onLoginPage && !onLoginPin) return response; // invoice page + webhooks keep working
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "onboarding_required" }, { status: 428 });
    }
    return redirectTo("/onboarding");
  }

  // Onboarding is done: nothing more to do on that page
  if (onOnboarding) return redirectTo(hasPin ? "/dashboard" : "/create-pin");

  // Step 2: the customer must create a PIN. Never ask for a PIN that does not exist.
  if (!hasPin) {
    if (onCreatePin || onPinApi) return response;
    if (isPublic && !onLoginPage && !onLoginPin) return response;
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "pin_required" }, { status: 428 });
    }
    return redirectTo("/create-pin");
  }

  // Has a PIN: is the app unlocked?
  const unlocked = request.cookies.get(UNLOCK_COOKIE)?.value === user.id;

  if (onLoginPage) return redirectTo(unlocked ? "/dashboard" : "/login-pin");
  if (onLoginPin && unlocked) return redirectTo("/dashboard");
  if (onCreatePin && !unlocked) return redirectTo("/login-pin");

  if (!unlocked && !isPublic && !onPinApi) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "locked" }, { status: 423 });
    }
    return redirectTo("/login-pin");
  }

  // Keep the app unlocked while it is in use
  if (unlocked) response.cookies.set(UNLOCK_COOKIE, user.id, unlockOptions);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
