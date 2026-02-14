import { describe, it, expect } from 'vitest'
import { buildLogSnapshot, buildLogDiff, type LogFieldFilter } from '../logging'

describe('logging utilities', () => {
  describe('buildLogSnapshot', () => {
    it('should return undefined for null/undefined input', () => {
      expect(buildLogSnapshot(null)).toBeUndefined()
      expect(buildLogSnapshot(undefined)).toBeUndefined()
    })

    it('should create snapshot of all fields', () => {
      const record = { name: 'John', age: 30, email: 'john@example.com' }
      const snapshot = buildLogSnapshot(record)

      expect(snapshot).toEqual({
        name: 'John',
        age: 30,
        email: 'john@example.com',
      })
    })

    it('should convert undefined values to null', () => {
      const record = { name: 'John', age: undefined }
      const snapshot = buildLogSnapshot(record)

      expect(snapshot).toEqual({
        name: 'John',
        age: null,
      })
    })

    it('should filter with include list', () => {
      const record = { name: 'John', age: 30, email: 'john@example.com' }
      const filter: LogFieldFilter = { include: ['name', 'age'] }
      const snapshot = buildLogSnapshot(record, filter)

      expect(snapshot).toEqual({
        name: 'John',
        age: 30,
      })
      expect(snapshot?.email).toBeUndefined()
    })

    it('should filter with exclude list', () => {
      const record = { name: 'John', age: 30, email: 'john@example.com' }
      const filter: LogFieldFilter = { exclude: ['email'] }
      const snapshot = buildLogSnapshot(record, filter)

      expect(snapshot).toEqual({
        name: 'John',
        age: 30,
      })
    })

    it('should return undefined for empty result after filtering', () => {
      const record = { name: 'John' }
      const filter: LogFieldFilter = { exclude: ['name'] }
      const snapshot = buildLogSnapshot(record, filter)

      expect(snapshot).toBeUndefined()
    })
  })

  describe('buildLogDiff', () => {
    it('should return undefined for both when both records are null', () => {
      const result = buildLogDiff(null, null)

      expect(result.oldData).toBeUndefined()
      expect(result.newData).toBeUndefined()
    })

    it('should detect changed fields', () => {
      const oldRecord = { name: 'John', age: 30 }
      const newRecord = { name: 'John', age: 31 }
      const result = buildLogDiff(oldRecord, newRecord)

      expect(result.oldData).toEqual({ age: 30 })
      expect(result.newData).toEqual({ age: 31 })
    })

    it('should detect added fields', () => {
      const oldRecord = { name: 'John' }
      const newRecord = { name: 'John', email: 'john@example.com' }
      const result = buildLogDiff(oldRecord, newRecord)

      expect(result.oldData).toEqual({ email: null })
      expect(result.newData).toEqual({ email: 'john@example.com' })
    })

    it('should detect removed fields', () => {
      const oldRecord = { name: 'John', email: 'john@example.com' }
      const newRecord = { name: 'John' }
      const result = buildLogDiff(oldRecord, newRecord)

      expect(result.oldData).toEqual({ email: 'john@example.com' })
      expect(result.newData).toEqual({ email: null })
    })

    it('should return undefined when records are equal', () => {
      const oldRecord = { name: 'John', age: 30 }
      const newRecord = { name: 'John', age: 30 }
      const result = buildLogDiff(oldRecord, newRecord)

      expect(result.oldData).toBeUndefined()
      expect(result.newData).toBeUndefined()
    })

    it('should compare objects deeply', () => {
      const oldRecord = { config: { theme: 'dark', lang: 'pt' } }
      const newRecord = { config: { theme: 'light', lang: 'pt' } }
      const result = buildLogDiff(oldRecord, newRecord)

      expect(result.oldData).toEqual({ config: { theme: 'dark', lang: 'pt' } })
      expect(result.newData).toEqual({ config: { theme: 'light', lang: 'pt' } })
    })

    it('should treat equal nested objects as unchanged', () => {
      const oldRecord = { config: { theme: 'dark' } }
      const newRecord = { config: { theme: 'dark' } }
      const result = buildLogDiff(oldRecord, newRecord)

      expect(result.oldData).toBeUndefined()
      expect(result.newData).toBeUndefined()
    })

    it('should apply filter to diff', () => {
      const oldRecord = { name: 'John', age: 30, secret: 'abc' }
      const newRecord = { name: 'Jane', age: 31, secret: 'xyz' }
      const filter: LogFieldFilter = { exclude: ['secret'] }
      const result = buildLogDiff(oldRecord, newRecord, filter)

      expect(result.oldData).toEqual({ name: 'John', age: 30 })
      expect(result.newData).toEqual({ name: 'Jane', age: 31 })
      expect(result.oldData?.secret).toBeUndefined()
    })
  })
})
