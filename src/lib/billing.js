// Prorated first-payment + standing-order calculator.
//
// Billing model: a standing order charges on the 20th of each month, for the
// month that follows it (e.g. a charge on 20.9 covers October). A student
// who joins mid-cycle pays now only for the lessons left in the current
// month, and the standing order is scheduled so the first automatic charge
// lands on the correct 20th for the correct month — never leaving a gap and
// never double-charging for a month already covered.

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const BILLING_DAY = 20

const MONTHS_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

export function getActivityDaysOfWeek(activity) {
  if (activity.days_of_week?.length) return activity.days_of_week
  return activity.day_of_week ? [activity.day_of_week] : []
}

function countOccurrences(daysOfWeek, startDate, endDate) {
  const daySet = new Set(daysOfWeek)
  let count = 0
  const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  while (d <= end) {
    if (daySet.has(WEEKDAY_KEYS[d.getDay()])) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

function monthLabel(year, monthIndex) {
  return `${MONTHS_HE[((monthIndex % 12) + 12) % 12]} ${year + Math.floor(monthIndex / 12)}`
}

/**
 * @param {Date} registrationDate - when the student is joining
 * @param {string[]} daysOfWeek - e.g. ['monday', 'thursday']
 * @param {number} monthlyPrice
 */
export function computeBillingPlan(registrationDate, daysOfWeek, monthlyPrice) {
  const lessonsPerWeek = daysOfWeek.length || 1
  const lessonsPerMonthStandard = lessonsPerWeek * 4
  const pricePerLesson = monthlyPrice / lessonsPerMonthStandard

  const year = registrationDate.getFullYear()
  const month = registrationDate.getMonth()
  const monthEnd = new Date(year, month + 1, 0)
  const remainingLessons = countOccurrences(daysOfWeek, registrationDate, monthEnd)
  const proratedAmount = Math.round(pricePerLesson * remainingLessons)

  const day = registrationDate.getDate()
  const registeredAfterCutoff = day >= BILLING_DAY

  // Month the prorated payment covers (the registration month itself)
  const currentMonthLabel = monthLabel(year, month)

  let immediateCharge, standingOrderFirstDate, standingOrderCoversDate, standingOrderCoversLabel, extraMonthCharged, extraMonthLabel

  if (!registeredAfterCutoff) {
    // Joined before the 20th: pay only for what's left this month.
    // The very next 20th (still this calendar month) bills next month.
    immediateCharge = proratedAmount
    standingOrderFirstDate = new Date(year, month, BILLING_DAY)
    standingOrderCoversDate = new Date(year, month + 1, 1)
    standingOrderCoversLabel = monthLabel(year, month + 1)
    extraMonthCharged = false
    extraMonthLabel = null
  } else {
    // Joined on/after the 20th: this month's 20th billing has already passed,
    // so pay now for the rest of this month AND next month in full, to avoid
    // a gap. The standing order then resumes on the following 20th.
    immediateCharge = proratedAmount + monthlyPrice
    standingOrderFirstDate = new Date(year, month + 1, BILLING_DAY)
    standingOrderCoversDate = new Date(year, month + 2, 1)
    standingOrderCoversLabel = monthLabel(year, month + 2)
    extraMonthCharged = true
    extraMonthLabel = monthLabel(year, month + 1)
  }

  return {
    lessonsPerWeek,
    lessonsPerMonthStandard,
    pricePerLesson,
    remainingLessons,
    proratedAmount,
    registeredAfterCutoff,
    currentMonthLabel,
    immediateCharge,
    extraMonthCharged,
    extraMonthLabel,
    monthlyPrice,
    standingOrderFirstDate,
    standingOrderFirstDateLabel: standingOrderFirstDate.toLocaleDateString('he-IL'),
    standingOrderCoversDate,
    standingOrderCoversLabel,
  }
}

export function formatDateISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
