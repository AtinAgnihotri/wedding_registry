import '@tanstack/react-start/server-only'
import { readFile } from 'node:fs/promises'
import { auth, sheets } from '@googleapis/sheets'
import type { sheets_v4 } from '@googleapis/sheets'

export const SHEET_NAME = 'Gifts'

export const GIFT_HEADERS = [
  'id',
  'name',
  'category',
  'price',
  'description',
  'link',
  'reservedBy',
  'message',
  'releaseCode',
  'reservations',
  'createdAt',
  'updatedAt',
] as const

export type GiftHeader = (typeof GIFT_HEADERS)[number]
export type SheetCell = string | number | boolean
export type SheetRecord = Partial<Record<GiftHeader, SheetCell>> &
  Record<string, SheetCell | undefined>

export interface SheetRow {
  /** 1-based row number in the sheet (header is row 1). */
  rowNumber: number
  record: SheetRecord
}

export interface SheetSnapshot {
  headers: Array<string>
  rows: Array<SheetRow>
}

/**
 * Minimal storage surface over the `Gifts` tab. Implemented by Google Sheets
 * (production) and an in-memory store (local dev / tests without credentials).
 */
export interface GiftSheetStore {
  read: () => Promise<SheetSnapshot>
  readRow: (rowNumber: number, headers: Array<string>) => Promise<SheetRecord>
  append: (records: Array<SheetRecord>, headers: Array<string>) => Promise<void>
  update: (
    rowNumber: number,
    record: SheetRecord,
    headers: Array<string>,
  ) => Promise<void>
}

function columnLetter(index: number) {
  let n = index + 1
  let letters = ''

  while (n > 0) {
    const remainder = (n - 1) % 26
    letters = String.fromCharCode(65 + remainder) + letters
    n = Math.floor((n - 1) / 26)
  }

  return letters
}

function quotedSheet() {
  return `'${SHEET_NAME.replaceAll("'", "''")}'`
}

function toRecord(headers: Array<string>, row: Array<unknown>): SheetRecord {
  const record: SheetRecord = {}

  headers.forEach((header, index) => {
    const value = row[index]
    record[header] =
      typeof value === 'number' || typeof value === 'boolean'
        ? value
        : value == null
          ? ''
          : String(value)
  })

  return record
}

function toRow(headers: Array<string>, record: SheetRecord) {
  return headers.map((header) => record[header] ?? '')
}

interface ServiceAccountCredentials {
  client_email: string
  private_key: string
}

async function loadServiceAccount(): Promise<ServiceAccountCredentials> {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()
  const filePath = process.env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim()
  let raw = ''

  if (inline) {
    raw = inline.startsWith('{')
      ? inline
      : Buffer.from(inline, 'base64').toString('utf8')
  } else if (filePath) {
    raw = await readFile(filePath, 'utf8')
  } else {
    throw new Error(
      'Set GOOGLE_SERVICE_ACCOUNT_JSON (JSON or base64) or GOOGLE_SERVICE_ACCOUNT_FILE.',
    )
  }

  const parsed = JSON.parse(raw) as Partial<ServiceAccountCredentials>

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('Service account JSON is missing client_email or private_key.')
  }

  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key.replaceAll('\\n', '\n'),
  }
}

class GoogleSheetStore implements GiftSheetStore {
  private client: Promise<sheets_v4.Sheets> | null = null
  private ensured: Promise<void> | null = null

  constructor(private readonly spreadsheetId: string) {}

  private getClient() {
    this.client ??= loadServiceAccount().then((credentials) =>
      sheets({
        version: 'v4',
        auth: new auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        }),
      }),
    )
    this.client.catch(() => {
      this.client = null
    })
    return this.client
  }

  private ensureSheet() {
    this.ensured ??= this.createSheetIfMissing()
    this.ensured.catch(() => {
      this.ensured = null
    })
    return this.ensured
  }

  private async createSheetIfMissing() {
    const client = await this.getClient()
    const meta = await client.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: 'sheets.properties.title',
    })
    const exists = meta.data.sheets?.some(
      (sheet) => sheet.properties?.title === SHEET_NAME,
    )

    if (!exists) {
      await client.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: SHEET_NAME,
                  gridProperties: { frozenRowCount: 1 },
                },
              },
            },
          ],
        },
      })
    }
  }

  async read(): Promise<SheetSnapshot> {
    await this.ensureSheet()
    const client = await this.getClient()
    const response = await client.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: quotedSheet(),
      valueRenderOption: 'UNFORMATTED_VALUE',
    })
    const values = response.data.values ?? []
    const headers = (values[0] ?? []).map((value) => String(value).trim())

    return {
      headers,
      rows: values.slice(1).map((row, index) => ({
        rowNumber: index + 2,
        record: toRecord(headers, row),
      })),
    }
  }

  async readRow(rowNumber: number, headers: Array<string>) {
    const client = await this.getClient()
    const lastColumn = columnLetter(headers.length - 1)
    const response = await client.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${quotedSheet()}!A${rowNumber}:${lastColumn}${rowNumber}`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    })
    return toRecord(headers, response.data.values?.[0] ?? [])
  }

  async append(records: Array<SheetRecord>, headers: Array<string>) {
    const client = await this.getClient()
    await client.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: quotedSheet(),
      // RAW keeps guest-entered text (e.g. "=IMPORTXML(...)") from being evaluated as formulas.
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: records.map((record) => toRow(headers, record)) },
    })
  }

  async update(rowNumber: number, record: SheetRecord, headers: Array<string>) {
    const client = await this.getClient()
    const lastColumn = columnLetter(headers.length - 1)
    await client.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${quotedSheet()}!A${rowNumber}:${lastColumn}${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values: [toRow(headers, record)] },
    })
  }

  async writeHeaders(headers: Array<string>) {
    await this.ensureSheet()
    const client = await this.getClient()
    await client.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${quotedSheet()}!A1:${columnLetter(headers.length - 1)}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    })
  }
}

class MemorySheetStore implements GiftSheetStore {
  private headers: Array<string> = []
  private rows: Array<Array<SheetCell>> = []

  async read(): Promise<SheetSnapshot> {
    return {
      headers: [...this.headers],
      rows: this.rows.map((row, index) => ({
        rowNumber: index + 2,
        record: toRecord(this.headers, row),
      })),
    }
  }

  async readRow(rowNumber: number, headers: Array<string>) {
    return toRecord(headers, this.rows[rowNumber - 2] ?? [])
  }

  async append(records: Array<SheetRecord>, headers: Array<string>) {
    this.rows.push(...records.map((record) => toRow(headers, record)))
  }

  async update(rowNumber: number, record: SheetRecord, headers: Array<string>) {
    this.rows[rowNumber - 2] = toRow(headers, record)
  }

  async writeHeaders(headers: Array<string>) {
    this.headers = [...headers]
    this.rows = this.rows.map((row) =>
      headers.map((_, index) => row[index] ?? ''),
    )
  }
}

export type WritableHeaderStore = GiftSheetStore & {
  writeHeaders: (headers: Array<string>) => Promise<void>
}

let store: WritableHeaderStore | null = null

export function getGiftSheetStore(): WritableHeaderStore {
  if (store) {
    return store
  }

  const backend = (process.env.GIFTS_BACKEND || 'sheets').trim().toLowerCase()

  if (backend === 'memory') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('GIFTS_BACKEND=memory is not allowed in production.')
    }
    store = new MemorySheetStore()
    return store
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim()

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is required.')
  }

  store = new GoogleSheetStore(spreadsheetId)
  return store
}

/** Test hook. */
export function setGiftSheetStoreForTesting(next: WritableHeaderStore | null) {
  store = next
}

export function createMemorySheetStore(): WritableHeaderStore {
  return new MemorySheetStore()
}
