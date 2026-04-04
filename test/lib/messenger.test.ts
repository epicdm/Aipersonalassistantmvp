import { describe, it, expect } from 'vitest'
import { parseMessengerWebhook } from '@/app/lib/messenger'

describe('Messenger parser', () => {
  it('parses text messages', () => {
    const body = {
      entry: [{
        messaging: [{
          sender: { id: 'psid-123' },
          recipient: { id: 'page-456' },
          timestamp: 1700000000000,
          message: { text: 'Hello from Messenger' },
        }],
      }],
    }

    const messages = parseMessengerWebhook(body)
    expect(messages).toHaveLength(1)
    expect(messages[0].senderId).toBe('psid-123')
    expect(messages[0].text).toBe('Hello from Messenger')
  })

  it('parses postback events', () => {
    const body = {
      entry: [{
        messaging: [{
          sender: { id: 'psid-123' },
          recipient: { id: 'page-456' },
          timestamp: 1700000000000,
          postback: { title: 'Book Now', payload: 'BOOK_APPOINTMENT' },
        }],
      }],
    }

    const messages = parseMessengerWebhook(body)
    expect(messages).toHaveLength(1)
    expect(messages[0].postback?.payload).toBe('BOOK_APPOINTMENT')
  })

  it('handles empty/malformed body', () => {
    expect(parseMessengerWebhook({})).toEqual([])
    expect(parseMessengerWebhook(null)).toEqual([])
    expect(parseMessengerWebhook({ entry: [] })).toEqual([])
  })

  it('skips events without content', () => {
    const body = {
      entry: [{
        messaging: [{
          sender: { id: 'psid-123' },
          recipient: { id: 'page-456' },
          timestamp: 1700000000000,
          delivery: { watermark: 1700000000000 }, // delivery receipt, no message
        }],
      }],
    }

    const messages = parseMessengerWebhook(body)
    expect(messages).toEqual([])
  })
})
