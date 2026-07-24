import { FunctionsHttpError } from '@supabase/supabase-js'

/**
 * `supabase.functions.invoke()` NIE parsuje ciała odpowiedzi błędu do `data`
 * — `data` jest zawsze `null` przy non-2xx, a `error.message` to zawsze ten
 * sam ogólny tekst ("Edge Function returned a non-2xx status code"), bez
 * względu na to, co nasza funkcja faktycznie zwróciła. Właściwy powód (nasze
 * `{ error: "..." }`) siedzi w `error.context` — surowym obiekcie Response —
 * trzeba go osobno odczytać (dokładnie jak w przykładzie z docs supabase-js
 * dla `FunctionsHttpError`). Bez tego every hook pokazywał tylko ogólnik
 * zamiast konkretnego polskiego komunikatu z serwera.
 */
export async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (typeof body?.error === 'string') return body.error
    } catch {
      // Ciało nie było poprawnym JSON-em — spadamy do ogólnego komunikatu.
    }
  }
  return error instanceof Error ? error.message : fallback
}
