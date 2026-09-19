import { config } from "dotenv";
import { createClient, type User } from "@supabase/supabase-js";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const email = process.env.DEV_TEST_EMAIL?.trim().toLowerCase();
const password = process.env.DEV_TEST_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiUrl = (process.env.DEV_TEST_API_URL ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);

if (!email || !password || !supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error(
    "DEV_TEST_EMAIL, DEV_TEST_PASSWORD and Supabase environment variables are required.",
  );
}
if (password.length < 6) {
  throw new Error("DEV_TEST_PASSWORD must be at least 6 characters.");
}

const testEmail = email;
const testPassword = password;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const client = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUser(): Promise<User | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;
    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === testEmail,
    );
    if (user) return user;
    if (data.users.length < 100) return null;
  }
  return null;
}

async function api<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = (await response.json()) as {
    ok: boolean;
    data?: T;
    error?: { message?: string };
  };
  if (!response.ok || !body.ok || body.data === undefined) {
    throw new Error(
      body.error?.message ?? `API request failed (${response.status})`,
    );
  }
  return body.data;
}

async function main() {
  const existing = await findUser();
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: "Hoflayn Test Üreticisi" },
    });
    if (error) throw error;
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: "Hoflayn Test Üreticisi" },
    });
    if (error) throw error;
  }

  const { data: sessionData, error: signInError } =
    await client.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
  if (signInError || !sessionData.session) {
    throw signInError ?? new Error("Test user sign-in failed.");
  }
  const token = sessionData.session.access_token;

  await api("/api/v1/session/bootstrap", token, { method: "POST" });
  await api("/api/v1/onboarding", token, {
    method: "PATCH",
    body: JSON.stringify({
      name: "Hoflayn Test Atölyesi",
      craftCategory: "ceramics",
    }),
  });

  const products = await api<Array<{ id: string }>>("/api/v1/products", token);
  if (products.length === 0) {
    await api("/api/v1/products", token, {
      method: "POST",
      body: JSON.stringify({
        name: "Benekli Seramik Kupa",
        description: "Gerçek kullanıcı akışını doğrulamak için örnek test ürünü.",
        price: "680",
        costPrice: "210",
        stockQuantity: 8,
        category: "Kupa",
        tags: "seramik, el yapımı, test",
      }),
    });
    await api("/api/v1/products", token, {
      method: "POST",
      body: JSON.stringify({
        name: "Dalga Formlu Vazo",
        description: "Mobil ürün listesi ve düzenleme testi için örnek ürün.",
        price: "1450",
        costPrice: "480",
        stockQuantity: 3,
        category: "Vazo",
        tags: "seramik, dekorasyon, test",
      }),
    });
  }

  await client.auth.signOut();
  console.log(`Test user ready: ${testEmail}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
