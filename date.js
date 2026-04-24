const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_KEYS = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

export const APP_TIMEZONE = "America/Sao_Paulo";

const DATE_PARTS_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function pad(value) {
  return String(value).padStart(2, "0");
}

function toDateOnlyUtc(year, month, day) {
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1, 12, 0, 0));
}

function readDateParts(value) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = DATE_PARTS_FORMATTER.formatToParts(date);

  return {
    year: Number(parts.find((entry) => entry.type === "year")?.value || "0"),
    month: Number(parts.find((entry) => entry.type === "month")?.value || "1"),
    day: Number(parts.find((entry) => entry.type === "day")?.value || "1"),
  };
}

export function getCurrentISODate(reference = new Date()) {
  const { year, month, day } = readDateParts(reference);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function getCurrentYear(reference = new Date()) {
  return Number(getCurrentISODate(reference).slice(0, 4));
}

export function parseISODate(value) {
  if (value instanceof Date) {
    return parseISODate(formatISODate(value));
  }

  const normalized = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split("-").map(Number);
    return toDateOnlyUtc(year, month, day);
  }

  if (normalized) {
    return parseISODate(new Date(normalized));
  }

  return toDateOnlyUtc(1970, 1, 1);
}

export function formatISODate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const { year, month, day } = value instanceof Date
    ? readDateParts(value)
    : readDateParts(parseISODate(value));

  return `${year}-${pad(month)}-${pad(day)}`;
}

export function addDays(value, amount) {
  const date = parseISODate(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return date;
}

export function startOfWeek(value) {
  const date = parseISODate(value);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

export function endOfWeek(value) {
  return addDays(startOfWeek(value), 6);
}

export function getWeekDates(value) {
  const start = startOfWeek(value);
  return Array.from({ length: 7 }, (_, index) =>
    formatISODate(addDays(start, index)),
  );
}

export function differenceInDays(left, right) {
  return Math.round(
    (parseISODate(left).getTime() - parseISODate(right).getTime()) / DAY_MS,
  );
}

export function isBeforeDate(left, right) {
  return parseISODate(left).getTime() < parseISODate(right).getTime();
}

export function getWeekdayKey(value) {
  return WEEKDAY_KEYS[parseISODate(value).getUTCDay()];
}

export function formatLongDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIMEZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(parseISODate(value));
}

export function formatShortDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
  }).format(parseISODate(value));
}

export function formatWeekday(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIMEZONE,
    weekday: "long",
  }).format(parseISODate(value));
}

export function getMonthLabel(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIMEZONE,
    month: "long",
    year: "numeric",
  }).format(parseISODate(value));
}

export function getQuarterLabel(value) {
  const date = parseISODate(value);
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `Q${quarter} ${date.getUTCFullYear()}`;
}

export function createLocalDateTime(dateLike, time) {
  const [hours, minutes] = String(time).split(":").map(Number);
  return `${formatISODate(dateLike)}T${pad(hours || 0)}:${pad(minutes || 0)}:00-03:00`;
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
