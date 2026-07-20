import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * Wyciąga zweryfikowany user_id wywołującego z nagłówka Authorization
 * (token dołączany automatycznie przez supabase.functions.invoke po stronie
 * klienta). Używane obok service_role klienta, żeby sprawdzić, że gracz,
 * w imieniu którego przychodzi żądanie, faktycznie odpowiada zalogowanej
 * sesji — bez tego ktokolwiek mógłby podać cudze playerId z devtools.
 */
export async function getCallerUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
  const {
    data: { user },
  } = await supabase.auth.getUser(token)
  return user?.id ?? null
}
