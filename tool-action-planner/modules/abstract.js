const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Human readable elapsed or remaining time (example: 3 minutes ago)
 * @param  {Date|Number|String} date A Date object, timestamp or string parsable with Date.parse()
 * @param  {Date|Number|String} [nowDate] A Date object, timestamp or string parsable with Date.parse()
 * @param  {Intl.RelativeTimeFormat} [trf] A Intl formater
 * @return {string} Human readable elapsed or remaining time
 * @author github.com/victornpb
 * @see https://stackoverflow.com/a/67338038/938822
 */
function fromNow(
    date,
    nowDate = Date.now(),
    rft = new Intl.RelativeTimeFormat(undefined, {
        style: 'long',
        numeric: 'always',
    })
) {
    const intervals = [
        { ge: YEAR, divisor: YEAR, unit: 'year' },
        { ge: MONTH, divisor: MONTH, unit: 'month' },
        { ge: WEEK, divisor: WEEK, unit: 'week' },
        { ge: DAY, divisor: DAY, unit: 'day' },
        { ge: HOUR, divisor: HOUR, unit: 'hour' },
        { ge: MINUTE, divisor: MINUTE, unit: 'minute' },
        { ge: 30 * SECOND, divisor: SECOND, unit: 'seconds' },
        { ge: 0, divisor: 1, text: 'just now' },
    ];
    const now = typeof nowDate === 'object' ? nowDate.getTime() : new Date(nowDate).getTime();
    const diff = now - (typeof date === 'object' ? date : new Date(date)).getTime();
    const diffAbs = Math.abs(diff);
    for (const interval of intervals) {
        if (diffAbs >= interval.ge) {
            const x = Math.round(diffAbs / interval.divisor);
            const isFuture = diff < 0;
            return interval.unit ? rft.format(isFuture ? x : -x, interval.unit) : interval.text;
        }
    }
}

function msToShortTime(diff = 0, showPrefix = false) {
    const intervals = [
        { ge: WEEK, divisor: WEEK, unit: 'w' },
        { ge: DAY, divisor: DAY, unit: 'd' },
        { ge: HOUR, divisor: HOUR, unit: 'h' },
        { ge: MINUTE, divisor: MINUTE, unit: 'm' },
        { ge: SECOND, divisor: SECOND, unit: 's' },
        { ge: 0, divisor: 1, text: 'now' },
    ];
    for (const interval of intervals) {
        if (diff >= interval.ge) {
            const x = Math.round(diff / interval.divisor);
            return interval.unit ? `${showPrefix ? 'in ' : ''}${x}${interval.unit}` : interval.text;
        }
    }
}

function getPseudoUniqueId() {
    return Math.floor(Math.random() * Date.now()).toString(16);
}

function deleteFromDOM(el) {
    el.parentElement.removeChild(el);
}

export {HOUR, deleteFromDOM, fromNow, getPseudoUniqueId, msToShortTime};
