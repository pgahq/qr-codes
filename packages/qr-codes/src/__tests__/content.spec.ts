import { describe, expect, it } from 'vitest'
import { encodeQrContent, escapeWifiField, normalizePhone, normalizeUrl } from '../content'

describe('normalizeUrl', () => {
  it.each([
    ['pga.org', 'https://pga.org/'],
    ['  https://www.pga.org/path?a=1 ', 'https://www.pga.org/path?a=1'],
    ['http://pga.org', 'http://pga.org/'],
    ['localhost:3000/x', 'https://localhost:3000/x']
  ])('accepts %s', (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected)
  })

  it.each(['', 'javascript:alert(1)', 'data:text/html,hi', 'mailto:a@b.co', 'ftp://pga.org', 'not a url', 'pga', 'https://'])(
    'rejects %j',
    (input) => {
      expect(normalizeUrl(input)).toBeNull()
    }
  )
})

describe('encodeQrContent', () => {
  it('encodes urls', () => {
    expect(encodeQrContent({ type: 'url', url: 'pga.org' })).toEqual({ ok: true, value: 'https://pga.org/' })
    expect(encodeQrContent({ type: 'url', url: '' })).toMatchObject({ ok: false, field: 'url' })
  })

  it('escapes special characters in wifi credentials', () => {
    const result = encodeQrContent({ type: 'wifi', ssid: 'Club;House', password: 'p:a\\ss"', security: 'WPA' })
    expect(result).toEqual({ ok: true, value: 'WIFI:T:WPA;S:Club\\;House;P:p\\:a\\\\ss\\";;' })
    expect(escapeWifiField('a,b')).toBe('a\\,b')
  })

  it('supports open and hidden networks and requires a password otherwise', () => {
    expect(encodeQrContent({ type: 'wifi', ssid: 'Guest', security: 'nopass', hidden: true })).toEqual({
      ok: true,
      value: 'WIFI:T:nopass;S:Guest;H:true;;'
    })
    expect(encodeQrContent({ type: 'wifi', ssid: 'Guest' })).toMatchObject({ ok: false, field: 'password' })
    expect(encodeQrContent({ type: 'wifi', ssid: '' })).toMatchObject({ ok: false, field: 'ssid' })
  })

  it('encodes sms with normalized phone and punctuation', () => {
    expect(normalizePhone('+1 (800) 555-1212')).toBe('+18005551212')
    expect(encodeQrContent({ type: 'sms', phone: '+1 (800) 555-1212', message: 'It\u2019s \u201Cgreat\u201D' })).toEqual({
      ok: true,
      value: 'smsto:+18005551212:It\'s "great"'
    })
    expect(encodeQrContent({ type: 'sms', phone: '800' })).toMatchObject({ ok: true, value: 'smsto:800' })
  })

  it('validates sms input', () => {
    expect(encodeQrContent({ type: 'sms', phone: 'abc' })).toMatchObject({ ok: false, field: 'phone' })
    expect(encodeQrContent({ type: 'sms', phone: '+18005551212', message: 'x'.repeat(160) })).toMatchObject({
      ok: false,
      field: 'message'
    })
  })
})
