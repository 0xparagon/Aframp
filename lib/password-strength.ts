export type PasswordStrength = {
  /** 0 (very weak) to 4 (strong). */
  score: 0 | 1 | 2 | 3 | 4
  label: 'Too weak' | 'Weak' | 'Fair' | 'Good' | 'Strong'
  isCommon: boolean
}

const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  '11111111',
  'qwertyui',
  'qwerty123',
  'qwertyuiop',
  'abc12345',
  'iloveyou',
  'admin123',
  'welcome1',
  'welcome123',
  'letmein1',
  'passw0rd',
  'p@ssw0rd',
  'p@ssword',
  '00000000',
  'aaaaaaaa',
  'monkey123',
  'football',
  'baseball',
  'sunshine',
])

const LABELS: PasswordStrength['label'][] = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']

export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase())
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: LABELS[0], isCommon: false }
  if (isCommonPassword(password)) return { score: 0, label: LABELS[0], isCommon: true }

  let points = 0
  if (password.length >= 8) points++
  if (password.length >= 12) points++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points++
  if (/\d/.test(password)) points++
  if (/[^A-Za-z0-9]/.test(password)) points++
  // Very repetitive passwords (e.g. "aaaaaaaaB1") shouldn't score well.
  if (new Set(password).size <= 3) points = Math.min(points, 1)

  const score = Math.min(4, Math.max(0, points - 1)) as PasswordStrength['score']
  return { score, label: LABELS[score], isCommon: false }
}
