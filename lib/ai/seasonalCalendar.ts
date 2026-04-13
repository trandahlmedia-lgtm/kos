/**
 * Seasonal and holiday context for home services content.
 * All date logic is static — no external APIs.
 */

type FixedEvent = {
  kind: 'fixed'
  month: number // 0-based
  day: number
  label: string
  relevance: string
}

type FloatingEvent = {
  kind: 'floating'
  getDate: (year: number) => Date
  label: string
  relevance: string
}

type SeasonalRange = {
  kind: 'range'
  startMonth: number // 0-based
  startDay: number
  endMonth: number
  endDay: number
  label: string
  relevance: string
}

type CalendarEntry = FixedEvent | FloatingEvent | SeasonalRange

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Returns the nth weekday of a given month/year. nth is 1-based; -1 = last. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date {
  if (nth >= 0) {
    const first = new Date(year, month, 1)
    const firstWeekday = first.getDay()
    const day = 1 + ((weekday - firstWeekday + 7) % 7) + (nth - 1) * 7
    return new Date(year, month, day)
  } else {
    const last = new Date(year, month + 1, 0)
    const lastWeekday = last.getDay()
    const day = last.getDate() - ((lastWeekday - weekday + 7) % 7)
    return new Date(year, month, day)
  }
}

/** True if `date` falls within [windowStart, windowStart + windowDays] (inclusive). */
function withinWindow(date: Date, windowStart: Date, windowDays: number): boolean {
  const windowEnd = addDays(windowStart, windowDays)
  return date >= windowStart && date <= windowEnd
}

/**
 * True if `date` falls within a calendar range.
 * Handles year-spanning ranges (e.g., Dec 1 – Feb 28).
 */
function inSeasonRange(date: Date, sm: number, sd: number, em: number, ed: number): boolean {
  const m = date.getMonth()
  const d = date.getDate()

  if (sm <= em) {
    // Normal same-year range
    if (m > sm && m < em) return true
    if (m === sm && d >= sd) return true
    if (m === em && d <= ed) return true
    return false
  } else {
    // Spans year boundary
    if (m > sm || m < em) return true
    if (m === sm && d >= sd) return true
    if (m === em && d <= ed) return true
    return false
  }
}

const CALENDAR: CalendarEntry[] = [
  // ── Fixed US Holidays ──────────────────────────────────────────────────────
  {
    kind: 'fixed', month: 0, day: 1,
    label: "New Year's Day",
    relevance: "Strong angle for 'new year, new home' content — annual inspections, system upgrades, fresh-start maintenance.",
  },
  {
    kind: 'fixed', month: 1, day: 14,
    label: "Valentine's Day",
    relevance: "Angle around giving the gift of a comfortable home — HVAC tune-ups or home improvements for the people you love.",
  },
  {
    kind: 'fixed', month: 2, day: 17,
    label: "St. Patrick's Day",
    relevance: "Light seasonal hook — 'don't get unlucky with a breakdown this spring', or a luck-themed spring prep post.",
  },
  {
    kind: 'fixed', month: 6, day: 4,
    label: "Independence Day",
    relevance: "Peak summer cooling content — keeping your home comfortable during the hottest weekend of the year.",
  },
  {
    kind: 'fixed', month: 9, day: 31,
    label: "Halloween",
    relevance: "Fun fall hook — 'don't let a broken furnace haunt you this winter', or a spooky-themed fall prep reminder.",
  },
  {
    kind: 'fixed', month: 10, day: 11,
    label: "Veterans Day",
    relevance: "If this company offers a veteran or military discount, this is a high-trust angle. Otherwise use it as a community appreciation post.",
  },
  {
    kind: 'fixed', month: 11, day: 24,
    label: "Christmas Eve",
    relevance: "Holiday home comfort — reliable heating for family gatherings, last-minute emergency service availability.",
  },
  {
    kind: 'fixed', month: 11, day: 25,
    label: "Christmas Day",
    relevance: "Holiday home comfort — warm home for family gatherings, emergency service if something goes wrong.",
  },
  {
    kind: 'fixed', month: 11, day: 31,
    label: "New Year's Eve",
    relevance: "'Before the new year' maintenance reminder — great for final push on winter prep or booking a January tune-up.",
  },

  // ── Floating US Holidays ───────────────────────────────────────────────────
  {
    kind: 'floating',
    getDate: (year) => nthWeekdayOfMonth(year, 4, 1, -1), // Last Monday of May
    label: "Memorial Day weekend",
    relevance: "Start-of-summer trigger — AC readiness, outdoor project prep, summer home maintenance content.",
  },
  {
    kind: 'floating',
    getDate: (year) => nthWeekdayOfMonth(year, 8, 1, 1), // First Monday of September
    label: "Labor Day weekend",
    relevance: "End-of-summer trigger — fall furnace inspection reminders, gutter cleaning, transition-to-fall prep.",
  },
  {
    kind: 'floating',
    getDate: (year) => nthWeekdayOfMonth(year, 10, 4, 4), // 4th Thursday of November
    label: "Thanksgiving",
    relevance: "Holiday home comfort — warm home for guests, last call for heating tune-up before peak winter.",
  },

  // ── Seasonal Ranges ────────────────────────────────────────────────────────
  {
    kind: 'range',
    startMonth: 2, startDay: 15, endMonth: 4, endDay: 15,
    label: "Spring AC tune-up season",
    relevance: "Timely: schedule your AC tune-up before the summer rush — early booking saves money and avoids breakdowns when temps spike.",
  },
  {
    kind: 'range',
    startMonth: 2, startDay: 20, endMonth: 3, endDay: 30,
    label: "Spring cleaning season",
    relevance: "Timely: spring cleaning angle — HVAC filter changes, dryer vent cleaning, duct cleaning, pressure washing.",
  },
  {
    kind: 'range',
    startMonth: 3, startDay: 1, endMonth: 3, endDay: 30,
    label: "Spring gutter cleaning season",
    relevance: "Timely: clean gutters after winter — remove debris, prevent water damage, protect the foundation before spring rains.",
  },
  {
    kind: 'range',
    startMonth: 8, startDay: 15, endMonth: 10, endDay: 1,
    label: "Fall furnace prep season",
    relevance: "Timely: get the furnace inspected before the cold hits — avoid emergency calls, carbon monoxide risks, and weekend rate surcharges.",
  },
  {
    kind: 'range',
    startMonth: 9, startDay: 1, endMonth: 10, endDay: 15,
    label: "Fall gutter cleaning season",
    relevance: "Timely: clean gutters before leaves pile up — prevent ice dams, roof damage, and water intrusion this winter.",
  },
  {
    kind: 'range',
    startMonth: 10, startDay: 1, endMonth: 11, endDay: 15,
    label: "Holiday lighting installation season",
    relevance: "Timely: get holiday lights installed professionally before slots fill up — safe, fast, and no ladder risk.",
  },
  {
    kind: 'range',
    startMonth: 11, startDay: 1, endMonth: 1, endDay: 28,
    label: "Frozen pipe prevention season",
    relevance: "Timely: protect pipes before temps drop — insulation tips, what to do if a pipe bursts, emergency contact reminders.",
  },
  {
    kind: 'range',
    startMonth: 0, startDay: 2, endMonth: 1, endDay: 15,
    label: "Holiday lighting removal season",
    relevance: "Timely: get holiday lights taken down safely before damage occurs — avoid roof wear and ladder accidents.",
  },
]

const WINDOW_DAYS = 14

/**
 * Returns a string describing any seasonal or holiday context relevant
 * within the next 14 days of the given date. Returns '' if nothing is close.
 */
export function getUpcomingContext(date: Date): string {
  const matches: string[] = []

  for (const entry of CALENDAR) {
    if (entry.kind === 'fixed') {
      const thisYear = new Date(date.getFullYear(), entry.month, entry.day)
      const nextYear = new Date(date.getFullYear() + 1, entry.month, entry.day)
      if (withinWindow(thisYear, date, WINDOW_DAYS) || withinWindow(nextYear, date, WINDOW_DAYS)) {
        matches.push(`${entry.label}: ${entry.relevance}`)
      }
    } else if (entry.kind === 'floating') {
      const thisYear = entry.getDate(date.getFullYear())
      const nextYear = entry.getDate(date.getFullYear() + 1)
      if (withinWindow(thisYear, date, WINDOW_DAYS) || withinWindow(nextYear, date, WINDOW_DAYS)) {
        matches.push(`${entry.label}: ${entry.relevance}`)
      }
    } else {
      // range — active if the date falls within the range
      if (inSeasonRange(date, entry.startMonth, entry.startDay, entry.endMonth, entry.endDay)) {
        matches.push(`${entry.label} (currently active): ${entry.relevance}`)
      }
    }
  }

  if (matches.length === 0) return ''
  return `Seasonal/holiday context for this post date:\n${matches.map((m) => `- ${m}`).join('\n')}`
}
