import { randomBytes } from 'node:crypto'

/**
 * 임시 비밀번호 생성기.
 * 정책(10자 이상, 영문/숫자/기호) 만족. 사람이 입력하기 쉬운 글자만 사용 (1·l·I·0·O 등 제외).
 */
export function generateTempPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digit = '23456789'
  const symbol = '!@#$%^&*'
  const all = upper + lower + digit + symbol
  const len = Math.max(length, 10)
  const buf = randomBytes(len)
  let pw = ''
  pw += upper[buf[0] % upper.length]
  pw += lower[buf[1] % lower.length]
  pw += digit[buf[2] % digit.length]
  pw += symbol[buf[3] % symbol.length]
  for (let i = 4; i < len; i++) pw += all[buf[i] % all.length]
  return pw
}
