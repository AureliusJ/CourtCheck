import SunCalc from 'suncalc';

export interface SunWindow {
  sunrise: Date;
  sunset: Date;
  isAfterSunset: boolean;
  isBeforeSunrise: boolean;
  minutesUntilSunset: number | null;
  hueState: 'day' | 'pre-sunset' | 'post-sunset';
}

export function getSunWindow(
  lat: number,
  lon: number,
  now: Date = new Date(),
): SunWindow {
  const times = SunCalc.getTimes(now, lat, lon);
  const minutesUntilSunset = (times.sunset.getTime() - now.getTime()) / 60_000;

  let hueState: SunWindow['hueState'] = 'day';
  if (now > times.sunset) hueState = 'post-sunset';
  else if (minutesUntilSunset <= 30) hueState = 'pre-sunset';

  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    isAfterSunset: now > times.sunset,
    isBeforeSunrise: now < times.sunrise,
    minutesUntilSunset: minutesUntilSunset > 0 ? Math.round(minutesUntilSunset) : null,
    hueState,
  };
}
