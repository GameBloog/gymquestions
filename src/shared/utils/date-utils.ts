const MS_PER_DAY = 24 * 60 * 60 * 1000

const utcDateOnly = (date: Date) =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())

export const differenceInCalendarDays = (left: Date, right: Date) =>
  Math.round((utcDateOnly(left) - utcDateOnly(right)) / MS_PER_DAY)

export const differenceInDays = (left: Date, right: Date) =>
  Math.floor((left.getTime() - right.getTime()) / MS_PER_DAY)

export const addMonths = (date: Date, months: number) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  )
