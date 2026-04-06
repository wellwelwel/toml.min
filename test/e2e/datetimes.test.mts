import { describe, it, strict } from 'poku';
import { createRequire } from 'node:module';
import { parse, read } from '../__helpers__/index.mts';

const require = createRequire(import.meta.url);
const { parse: parseToml } = require('../../src/index.ts') as {
  parse: <T = unknown>(input: string) => T;
};

describe('Datetimes', () => {
  it('parses UTC dates', () =>
    parse(read('datetimes--utc.toml'), {
      a: new Date('1979-05-27T07:32:00Z'),
    }));

  it('parses dates with offsets', () =>
    parse(read('datetimes--offsets.toml'), {
      a: new Date('1979-05-27T07:32:00-07:00'),
      b: new Date('1979-05-27T07:32:00+02:00'),
    }));

  it('parses dates with fractional seconds', () =>
    parse(read('datetimes--fractional-seconds.toml'), {
      a: new Date('1979-05-27T00:32:00.999999-07:00'),
    }));

  it('parses local datetime as string', () =>
    parse(read('datetimes--local-datetime.toml'), {
      a: '1979-05-27T07:32:00',
    }));

  it('parses local date as string', () =>
    parse(read('datetimes--local-date.toml'), {
      a: '1979-05-27',
    }));

  it('parses local time as string', () =>
    parse(read('datetimes--local-time.toml'), { a: '07:32:00' }));

  it('parses time with fractional seconds', () =>
    parse(read('datetimes--time-fractional-seconds.toml'), {
      a: '07:32:00.999',
    }));

  it('parses HH:MM (no seconds)', () =>
    parse(read('datetimes--hh-mm-no-seconds.toml'), {
      a: '07:32:00',
    }));

  it('parses space-delimited datetime', () => {
    const r = parseToml<Record<string, Date>>(
      read('datetimes--space-delimited.toml')
    );
    strict.ok(r.a instanceof Date);
    strict.equal(r.a.toISOString(), '1979-05-27T07:32:00.000Z');
  });

  it('lowercase z offset', () => {
    const r = parseToml<Record<string, Date>>(
      read('datetimes--lowercase-z.toml')
    );
    strict.ok(r.a instanceof Date);
  });

  it('datetime with lowercase t delimiter', () => {
    const r = parseToml<Record<string, Date>>(
      read('remaining-coverage--datetime-lowercase-t.toml')
    );
    strict.ok(r.a instanceof Date);
  });
});

describe('Date validation', () => {
  it('rejects invalid month 13', () =>
    strict.throws(() =>
      parseToml(read('date-validation--invalid-month-13.toml'))
    ));

  it('rejects day 0', () =>
    strict.throws(() => parseToml(read('date-validation--day-zero.toml'))));

  it('rejects Feb 29 on non-leap year', () =>
    strict.throws(() =>
      parseToml(read('date-validation--feb-29-non-leap.toml'))
    ));

  it('accepts Feb 29 on leap year', () => {
    const r = parseToml<Record<string, Date>>(
      read('date-validation--feb-29-leap.toml')
    );
    strict.ok(r.a instanceof Date);
  });

  it('accepts Feb 29 on century leap year (2000)', () => {
    const r = parseToml<Record<string, Date>>(
      read('date-validation--feb-29-century-leap.toml')
    );
    strict.ok(r.a instanceof Date);
  });

  it('rejects hour 24', () =>
    strict.throws(() => parseToml(read('date-validation--hour-24.toml'))));

  it('rejects minute 60', () =>
    strict.throws(() => parseToml(read('date-validation--minute-60.toml'))));

  it('rejects second 60', () =>
    strict.throws(() => parseToml(read('date-validation--second-60.toml'))));

  it('rejects invalid offset hour', () =>
    strict.throws(() =>
      parseToml(read('date-validation--invalid-offset-hour.toml'))
    ));

  it('rejects invalid offset minute', () =>
    strict.throws(() =>
      parseToml(read('date-validation--invalid-offset-minute.toml'))
    ));

  it('rejects invalid time after date+T delimiter', () =>
    strict.throws(() =>
      parseToml(read('remaining-coverage--invalid-time-after-t.toml'))
    ));

  it('rejects incomplete offset after datetime', () =>
    strict.throws(() =>
      parseToml(read('remaining-coverage--incomplete-offset.toml'))
    ));
});
