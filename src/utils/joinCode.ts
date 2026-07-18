// Bez znaków mylących się wizualnie (0/O, 1/I) — kod jest przepisywany ręcznie.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateJoinCode(length = 4): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return code
}
