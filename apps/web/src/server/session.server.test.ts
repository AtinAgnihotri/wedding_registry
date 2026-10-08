import { describe, expect, it, vi } from 'vitest'

import { publicUserName } from './session.server'

vi.mock('@tanstack/react-start/server', () => ({ getRequest: vi.fn() }))
vi.mock('./auth.server', () => ({ getAuth: () => null }))

describe('publicUserName', () => {
  it('hides the phone placeholder name from phone sign-ups', () => {
    expect(publicUserName('+919876543210', '+919876543210')).toBe('')
    expect(publicUserName('+91 98765 43210', '+919876543210')).toBe('')
    expect(publicUserName('919876543210', null)).toBe('')
  })

  it('keeps real names', () => {
    expect(publicUserName('Priya Sharma', '+919876543210')).toBe('Priya Sharma')
    expect(publicUserName('  Atin ', null)).toBe('Atin')
    expect(publicUserName('', null)).toBe('')
  })
})
