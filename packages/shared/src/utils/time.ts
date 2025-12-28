import { parse } from 'date-fns';

export function convertTimeToWords(time?: string | number): string {
  if (time == null) return '0 seconds';

  let totalSeconds: number;

  if (typeof time === 'number') {
    totalSeconds = time;
  } else if (typeof time === 'string') {
    const parsedDate = parse(time, 'mm:ss', new Date(0));
    totalSeconds = parsedDate.getMinutes() * 60 + parsedDate.getSeconds();
  } else {
    return '0 seconds';
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const minuteText = minutes === 1 ? 'minute' : 'minutes';
  const secondText = seconds === 1 ? 'second' : 'seconds';

  if (minutes > 0 && seconds > 0) {
    return `${minutes} ${minuteText} and ${seconds} ${secondText}`;
  } else if (minutes > 0) {
    return `${minutes} ${minuteText}`;
  } else if (seconds > 0) {
    return `${seconds} ${secondText}`;
  } else {
    return '0 seconds';
  }
}
