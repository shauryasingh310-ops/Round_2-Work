import fs from 'node:fs/promises'
import path from 'node:path'

// Curated snapshot importer (CSV -> data/healthcare.json)
//
// CSV columns (header row required):
// state,hospital,bedsAvailable,totalBeds,ventilatorsAvailable,resourcesDispatched,phoneLabel,phone,sourceUrl,lastUpdated
//
// Notes:
// - If you provide multiple rows for the same state+hospital, the last row wins.
// - State totals can be omitted; they will be computed as the sum of hospital totals if present.
// - Emergency contacts can be provided via phoneLabel/phone on any row for that state.

function parseCsv(csvText) {
  // Minimal CSV parser with quoted-field support.
  // Good enough for spreadsheets exported as CSV.
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i]

    if (inQuotes) {
      if (ch === '"') {
        const next = csvText[i + 1]
        if (next === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }

    if (ch === ',') {
      row.push(field)
      field = ''
      continue
    }

    if (ch === '\n') {
      row.push(field)
      field = ''
      if (row.length === 1 && row[0].trim() === '') {
        row = []
        continue
      }
      rows.push(row)
      row = []
      continue
    }

    if (ch === '\r') continue

    field += ch
  }

  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function clampInt(value) {
  const n = Number.parseFloat(String(value ?? ''))
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.round(n))
}

function optionalInt(value) {
  const s = String(value ?? '').trim()
  if (!s) return undefined
  const n = Number.parseFloat(s)
  if (!Number.isFinite(n)) return undefined
  return Math.max(0, Math.round(n))
}

function optionalFloat(value) {
  const s = String(value ?? '').trim()
  if (!s) return undefined
  const n = Number.parseFloat(s)
  if (!Number.isFinite(n)) return undefined
  return Math.max(0, n)
}

function normString(value) {
  const s = String(value ?? '').trim()
  return s
}

function isPlaceholderPhone(phone) {
  const s = String(phone ?? '').trim().toLowerCase()
  if (!s) return false
  if (s.includes('placeholder')) return true
  const digits = s.replace(/[^0-9]/g, '')
  if (!digits) return true
  if (/^0+$/.test(digits)) return true
  // e.g. 1800-000-000
  if (/0{6,}/.test(digits)) return true
  return false
}

function canonicalizeRegionName(value) {
  const s = String(value ?? '').trim()
  if (!s) return ''

  const simplified = s
    .replace(/\s+/g, ' ')
    .replace(/\band\b/gi, '&')
    .replace(/\s*&\s*/g, ' & ')
    .replace(/\s+/g, ' ')
    .trim()

  const direct = {
    'Andaman & Nicobar': 'Andaman & Nicobar Islands',
    'Andaman and Nicobar Islands': 'Andaman & Nicobar Islands',
    'Andaman & Nicobar Islands': 'Andaman & Nicobar Islands',
    'Dadra and Nagar Haveli and Daman and Diu': 'Dadra & Nagar Haveli and Daman & Diu',
    'Dadra & Nagar Haveli and Daman & Diu': 'Dadra & Nagar Haveli and Daman & Diu',
    'Dadra & Nagar Haveli': 'Dadra & Nagar Haveli and Daman & Diu',
    'Daman & Diu': 'Dadra & Nagar Haveli and Daman & Diu',
    'Dadra and Nagar Haveli': 'Dadra & Nagar Haveli and Daman & Diu',
    'Daman and Diu': 'Dadra & Nagar Haveli and Daman & Diu',
    'Jammu and Kashmir': 'Jammu & Kashmir',
    'Jammu & Kashmir': 'Jammu & Kashmir',
    'Orissa': 'Odisha',
    'Pondicherry': 'Puducherry',
  }

  return direct[s] || direct[simplified] || simplified
}

function nowIso() {
  return new Date().toISOString()
}

async function main() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error('Usage: node scripts/import-healthcare-snapshot.mjs <path-to-csv>')
    process.exit(1)
  }

  const absInputPath = path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath)
  const csvText = await fs.readFile(absInputPath, 'utf8')
  const rows = parseCsv(csvText)
  if (rows.length < 2) {
    throw new Error('CSV must include a header row and at least one data row.')
  }

  const header = rows[0].map((h) => normString(h))
  const idx = (name) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase())

  const get = (r, name) => {
    const i = idx(name)
    if (i < 0) return ''
    return r[i] ?? ''
  }

  const byState = new Map()

  for (const r of rows.slice(1)) {
    const state = canonicalizeRegionName(get(r, 'state'))
    if (!state) continue

    const hospitalName = normString(get(r, 'hospital'))

    const stateObj = byState.get(state) || {
      state,
      bedsAvailable: undefined,
      totalBeds: undefined,
      ventilatorsAvailable: 0,
      resourcesDispatched: 0,
      casesHandled: undefined,
      avgResponseTimeHours: undefined,
      lastUpdated: undefined,
      sourceUrl: undefined,
      hospitals: [],
      emergencyContacts: [],
    }

    const sourceUrl = normString(get(r, 'sourceUrl')) || undefined
    const lastUpdated = normString(get(r, 'lastUpdated')) || undefined

    // If row provides state-level meta, keep it.
    stateObj.sourceUrl = stateObj.sourceUrl || sourceUrl
    stateObj.lastUpdated = stateObj.lastUpdated || lastUpdated

    const ventilators = clampInt(get(r, 'ventilatorsAvailable'))
    const resources = clampInt(get(r, 'resourcesDispatched'))
    stateObj.ventilatorsAvailable = Math.max(stateObj.ventilatorsAvailable, ventilators)
    stateObj.resourcesDispatched = Math.max(stateObj.resourcesDispatched, resources)

    // Optional state-level performance metrics (curated).
    const casesHandled = optionalInt(get(r, 'casesHandled'))
    if (typeof casesHandled === 'number') stateObj.casesHandled = Math.max(stateObj.casesHandled ?? 0, casesHandled)

    const avgResponseTimeHours = optionalFloat(get(r, 'avgResponseTimeHours'))
    if (typeof avgResponseTimeHours === 'number') {
      stateObj.avgResponseTimeHours =
        typeof stateObj.avgResponseTimeHours === 'number'
          ? Math.min(stateObj.avgResponseTimeHours, avgResponseTimeHours)
          : avgResponseTimeHours
    }

    const phoneRaw = normString(get(r, 'phone'))
    const phone = phoneRaw && !isPlaceholderPhone(phoneRaw) ? phoneRaw : ''
    const phoneLabel = normString(get(r, 'phoneLabel')) || 'Emergency'
    if (phone) {
      const exists = stateObj.emergencyContacts.some((c) => c.phone === phone && c.label === phoneLabel)
      if (!exists) stateObj.emergencyContacts.push({ label: phoneLabel, phone })
    }

    if (hospitalName) {
      const bedsAvailable = optionalInt(get(r, 'bedsAvailable'))
      const totalBeds = optionalInt(get(r, 'totalBeds'))

      const existingIdx = stateObj.hospitals.findIndex((h) => h.name === hospitalName)
      const hospitalObj = {
        name: hospitalName,
        ...(typeof bedsAvailable === 'number' ? { bedsAvailable } : null),
        ...(typeof totalBeds === 'number' ? { totalBeds } : null),
        sourceUrl,
        lastUpdated,
      }
      if (existingIdx >= 0) stateObj.hospitals[existingIdx] = hospitalObj
      else stateObj.hospitals.push(hospitalObj)
    }

    byState.set(state, stateObj)
  }

  // Compute state totals from hospitals
  for (const stateObj of byState.values()) {
    const hospitals = Array.isArray(stateObj.hospitals) ? stateObj.hospitals : []
    const totalBeds = hospitals.reduce((sum, h) => sum + (typeof h.totalBeds === 'number' ? h.totalBeds : 0), 0)
    const bedsAvailable = hospitals.reduce(
      (sum, h) => sum + (typeof h.bedsAvailable === 'number' ? h.bedsAvailable : 0),
      0,
    )

    const anyTotal = hospitals.some((h) => typeof h.totalBeds === 'number')
    const anyAvail = hospitals.some((h) => typeof h.bedsAvailable === 'number')
    stateObj.totalBeds = anyTotal ? totalBeds : undefined
    stateObj.bedsAvailable = anyAvail ? bedsAvailable : undefined

    if (stateObj.hospitals.length === 0) delete stateObj.hospitals
    if (!stateObj.lastUpdated) delete stateObj.lastUpdated
    if (!stateObj.sourceUrl) delete stateObj.sourceUrl
    if (typeof stateObj.totalBeds !== 'number') delete stateObj.totalBeds
    if (typeof stateObj.bedsAvailable !== 'number') delete stateObj.bedsAvailable
    if (typeof stateObj.casesHandled !== 'number') delete stateObj.casesHandled
    if (typeof stateObj.avgResponseTimeHours !== 'number') delete stateObj.avgResponseTimeHours
  }

  const output = {
    updatedAt: nowIso(),
    sourceUrl: undefined,
    states: Array.from(byState.values()).sort((a, b) => a.state.localeCompare(b.state)),
  }

  const outPath = path.join(process.cwd(), 'data', 'healthcare.json')
  await fs.writeFile(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8')

  console.log(`Wrote ${outPath}`)
  console.log(`States: ${output.states.length}`)
}

main().catch((e) => {
  console.error(e?.stack || String(e))
  process.exit(1)
})
