export const PASSWORD_RULE_MESSAGE = '비밀번호는 영문 대문자, 소문자, 숫자, 특수문자를 모두 포함해 8자 이상이어야 합니다.'

export const PASSWORD_RULES = [
  { key: 'length', label: '8자 이상', test: (v) => v.length >= 8 },
  { key: 'upper', label: '영문 대문자', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: '영문 소문자', test: (v) => /[a-z]/.test(v) },
  { key: 'digit', label: '숫자', test: (v) => /\d/.test(v) },
  { key: 'special', label: '특수문자', test: (v) => /[^A-Za-z0-9]/.test(v) },
]

export const isValidPassword = (value = '') => PASSWORD_RULES.every((r) => r.test(value))
export const isValidEmail = (value = '') => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
