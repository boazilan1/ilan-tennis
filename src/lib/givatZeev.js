// Givat Zeev attendance tracking. Those children register and pay through the
// community center (מתנ"ס), not through this site — so they must NOT be regular
// activities (those show up on the public registration page and in the payments
// report). Instead each group is an admin calendar event (admin_events) whose
// title starts with GZ_PREFIX, its children are players (admin_event_roster) and
// attendance per date lives in admin_event_players — the same tables the admin
// calendar already uses, so no database change is needed.

export const GZ_PREFIX = 'גבעת זאב'
// Marks players that exist only for Givat Zeev tracking, so they can be hidden
// from the trainees list (they're not customers of this site).
export const GZ_NOTE = 'גבעת זאב — מעקב נוכחות בלבד'

export const DAYS_HE = {
  sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי',
  wednesday: 'רביעי', thursday: 'חמישי', friday: 'שישי', saturday: 'שבת',
}
export const DAYS_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// "גבעת זאב — כיתות א-ב"  →  "כיתות א-ב"
export function groupName(title) {
  const rest = (title || '').slice(GZ_PREFIX.length).replace(/^[\s–—:·|-]+/, '').trim()
  return rest || title || GZ_PREFIX
}

export function groupTitle(name) {
  return `${GZ_PREFIX} — ${name.trim()}`
}

export const isoToDate = iso => new Date(`${iso}T00:00:00`)
export const dayKeyOf = iso => DAYS_ORDER[isoToDate(iso).getDay()]
export const dmy = iso => iso.split('-').reverse().join('.')
export function dateToISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function shiftISO(iso, days) {
  const d = isoToDate(iso)
  d.setDate(d.getDate() + days)
  return dateToISO(d)
}

// Does this group meet on the given date? (weekly groups by weekday, one-off events by date)
export function meetsOn(ev, iso) {
  if (ev.is_recurring) return ev.day_of_week === dayKeyOf(iso) && (!ev.end_date || iso <= ev.end_date)
  return ev.event_date === iso
}

// Turns pasted text into a clean, de-duplicated list of names. Accepts one name
// per line, numbered lists ("1. דני"), and rows pasted from a spreadsheet
// (only the first column is used).
export function parseNames(text) {
  const seen = new Set()
  const names = []
  for (const raw of String(text || '').split(/\r?\n/)) {
    const name = raw.split(/\t|,|;/)[0].replace(/^\s*\d+\s*[.)-]\s*/, '').replace(/\s+/g, ' ').trim()
    const key = name.toLowerCase()
    if (name && !seen.has(key)) { seen.add(key); names.push(name) }
  }
  return names
}

const STATUS_LABEL = { true: 'נוכח/ת', false: 'נעדר/ת', undefined: 'לא סומן' }

// groups: [{ name, time, kids: [{ name, present: true|false|undefined }] }]
export function summarize(groups) {
  let present = 0, total = 0, unmarked = 0
  const perGroup = groups.map(g => {
    const p = g.kids.filter(k => k.present === true).length
    const u = g.kids.filter(k => k.present === undefined).length
    present += p; total += g.kids.length; unmarked += u
    return { name: g.name, present: p, total: g.kids.length, unmarked: u }
  })
  return { perGroup, present, total, unmarked }
}

export function reportText(date, groups) {
  const { perGroup, present, total, unmarked } = summarize(groups)
  const day = DAYS_HE[dayKeyOf(date)]
  const lines = [`נוכחות גבעת זאב — יום ${day}, ${dmy(date)}`]
  perGroup.forEach(g => lines.push(`• ${g.name}: ${g.present} מתוך ${g.total}`))
  lines.push(`סה״כ: ${present} מתוך ${total}`)
  if (unmarked) lines.push(`(${unmarked} לא סומנו)`)
  return lines.join('\n')
}

// Builds the Excel file (right-to-left sheet, one row per child) as a File.
// write-excel-file is loaded on demand so it doesn't weigh down the main bundle.
export async function buildAttendanceFile(date, groups) {
  const { default: writeExcelFile } = await import('write-excel-file/universal')
  const { perGroup, present, total, unmarked } = summarize(groups)
  const day = DAYS_HE[dayKeyOf(date)]

  const head = { fontWeight: 'bold', backgroundColor: '#e3eee6' }
  const rows = [
    [{ value: `גבעת זאב — נוכחות ליום ${day}, ${dmy(date)}`, fontWeight: 'bold', fontSize: 14 }],
    [],
    [{ value: '#', ...head }, { value: 'שם', ...head }, { value: 'קבוצה', ...head }, { value: 'שעה', ...head }, { value: 'נוכחות', ...head }],
  ]
  let n = 0
  for (const g of groups) {
    for (const k of g.kids) {
      n += 1
      const style = k.present === true ? { backgroundColor: '#dcfce7' } : k.present === false ? { backgroundColor: '#fee2e2' } : {}
      rows.push([
        { value: n, type: Number },
        { value: k.name },
        { value: g.name },
        { value: g.time || '' },
        { value: STATUS_LABEL[String(k.present)], ...style },
      ])
    }
  }
  rows.push([], [{ value: 'סיכום', fontWeight: 'bold' }])
  perGroup.forEach(g => rows.push([{ value: '' }, { value: g.name }, { value: `${g.present} מתוך ${g.total}` }]))
  rows.push([{ value: '' }, { value: 'סה״כ', fontWeight: 'bold' }, { value: `${present} מתוך ${total}`, fontWeight: 'bold' }])
  if (unmarked) rows.push([{ value: '' }, { value: 'לא סומנו' }, { value: String(unmarked) }])

  const blob = await writeExcelFile(rows, {
    sheet: `נוכחות ${dmy(date)}`,
    rightToLeft: true,
    columns: [{ width: 5 }, { width: 26 }, { width: 24 }, { width: 9 }, { width: 12 }],
  }).toBlob()

  const fileName = `נוכחות גבעת זאב ${dmy(date).replace(/\./g, '-')}.xlsx`
  return new File([blob], fileName, { type: XLSX_MIME })
}
