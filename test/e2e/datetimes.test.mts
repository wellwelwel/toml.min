import type { LocalDateOrTimeKind } from '../../src/index.ts';
import type { Rejection } from '../__helpers__/index.mts';
import { describe, it, strict } from 'poku';
import {
  LocalDateOrTime,
  OffsetDateTime,
  assertParsesTo,
  parse,
  read,
} from '../__helpers__/index.mts';

type LocalForm = { source: string; kind: LocalDateOrTimeKind; text: string };

describe('Datetimes', () => {
  it('reads a UTC date-time as a Date', () =>
    assertParsesTo(read('datetimes--utc.toml'), {
      a: new OffsetDateTime('1979-05-27T07:32:00Z', '1979-05-27T07:32:00Z'),
    }));

  it('applies the time zone offset of a date-time', () =>
    assertParsesTo(read('datetimes--offsets.toml'), {
      a: new OffsetDateTime(
        '1979-05-27T07:32:00-07:00',
        '1979-05-27T07:32:00-07:00'
      ),
      b: new OffsetDateTime(
        '1979-05-27T07:32:00+02:00',
        '1979-05-27T07:32:00+02:00'
      ),
    }));

  it('reads the fractional seconds of a date-time', () =>
    assertParsesTo(read('datetimes--fractional-seconds.toml'), {
      a: new OffsetDateTime(
        '1979-05-27T00:32:00.999999-07:00',
        '1979-05-27T00:32:00.999999-07:00'
      ),
    }));

  it('accepts a space between the date and the time', () =>
    assertParsesTo(read('datetimes--space-delimited.toml'), {
      a: new OffsetDateTime('1979-05-27T07:32:00Z', '1979-05-27 07:32:00Z'),
    }));

  it('accepts a lowercase z as UTC', () =>
    assertParsesTo(read('datetimes--lowercase-z.toml'), {
      a: new OffsetDateTime('1979-05-27T07:32:00Z', '1979-05-27T07:32:00z'),
    }));

  it('accepts a lowercase t between the date and the time', () =>
    assertParsesTo(read('datetimes--lowercase-t.toml'), {
      a: new OffsetDateTime('1979-05-27T07:32:00Z', '1979-05-27t07:32:00Z'),
    }));

  it('reads back the text Date.prototype.toISOString() writes', () => {
    const text = new Date('2024-02-29T23:59:59.999Z').toISOString();

    assertParsesTo(`a = ${text}`, { a: new OffsetDateTime(text, text) });
  });

  it('keeps the written offset in the text', () =>
    assertParsesTo('a = 1979-05-27T07:32:00+05:30', {
      a: new OffsetDateTime(
        '1979-05-27T02:02:00Z',
        '1979-05-27T07:32:00+05:30'
      ),
    }));

  it('applies the offset of a date-time delimited by a space', () =>
    assertParsesTo('a = 1979-05-27 07:32:00+05:30', {
      a: new OffsetDateTime(
        '1979-05-27T02:02:00Z',
        '1979-05-27 07:32:00+05:30'
      ),
    }));

  it('reads an offset date-time written without seconds', () =>
    assertParsesTo('a = 1979-05-27T07:32Z', {
      a: new OffsetDateTime('1979-05-27T07:32:00Z', '1979-05-27T07:32Z'),
    }));

  it('keeps a fraction finer than a millisecond in the text', () =>
    assertParsesTo('a = 1979-05-27T07:32:00.123456789Z', {
      a: new OffsetDateTime(
        '1979-05-27T07:32:00.123Z',
        '1979-05-27T07:32:00.123456789Z'
      ),
    }));

  it('stays a Date that converts to its UTC instant in JSON', () => {
    const result = parse<Record<string, unknown>>(
      'a = 1979-05-27T07:32:00+05:30'
    );

    strict.ok(result.a instanceof Date);
    strict.equal(JSON.stringify(result), '{"a":"1979-05-27T02:02:00.000Z"}');
  });
});

describe('Local dates and times', () => {
  const forms: LocalForm[] = [
    {
      source: 'a = 1979-05-27T07:32:00',
      kind: 'date-time',
      text: '1979-05-27T07:32:00',
    },
    {
      source: 'a = 1979-05-27 07:32:00',
      kind: 'date-time',
      text: '1979-05-27 07:32:00',
    },
    {
      source: 'a = 1979-05-27t07:32',
      kind: 'date-time',
      text: '1979-05-27t07:32',
    },
    { source: 'a = 1979-05-27', kind: 'date', text: '1979-05-27' },
    { source: 'a = 07:32', kind: 'time', text: '07:32' },
    { source: 'a = 07:32:00', kind: 'time', text: '07:32:00' },
    {
      source: 'a = 07:32:00.123456789',
      kind: 'time',
      text: '07:32:00.123456789',
    },
  ];

  it('tells an unquoted date apart from the same text in quotes', () => {
    const result = parse<Record<string, unknown>>(
      'command = 1979-05-27\nquoted = "1979-05-27"'
    );

    strict.ok(result.command instanceof LocalDateOrTime);
    strict.equal(result.quoted, '1979-05-27');
  });

  for (const form of forms)
    it(`keeps the kind and the exact text of "${form.source}"`, () =>
      assertParsesTo(form.source, {
        a: new LocalDateOrTime(form.kind, form.text),
      }));

  it('converts to its exact text in strings and in JSON', () => {
    const result = parse<Record<string, unknown>>('a = 07:32');

    strict.equal(`${result.a}`, '07:32');
    strict.equal(JSON.stringify(result), '{"a":"07:32"}');
  });

  for (const source of [
    'a = 1979-05-27\na.b = 1',
    'a = 1979-05-27\n[a.b]',
    'a = { b = 07:32, b.c = 1 }',
  ])
    it(`is never treated as a table: ${JSON.stringify(source)}`, () =>
      strict.throws(() => parse(source), {
        name: 'TomlError',
        code: 'DUPLICATE_KEY',
      }));
});

describe('Date validation', () => {
  const rejections: Rejection[] = [
    {
      name: 'month 13',
      fixture: 'date-validation--invalid-month-13.toml',
      code: 'INVALID_DATE',
    },
    {
      name: 'day 0',
      fixture: 'date-validation--day-zero.toml',
      code: 'INVALID_DATE',
    },
    {
      name: 'February 29 in a common year',
      fixture: 'date-validation--feb-29-non-leap.toml',
      code: 'INVALID_DATE',
    },
    {
      name: 'hour 24',
      fixture: 'date-validation--hour-24.toml',
      code: 'INVALID_TIME',
    },
    {
      name: 'minute 60',
      fixture: 'date-validation--minute-60.toml',
      code: 'INVALID_TIME',
    },
    {
      name: 'second 60',
      fixture: 'date-validation--second-60.toml',
      code: 'INVALID_TIME',
    },
    {
      name: 'an offset of 25 hours',
      fixture: 'date-validation--invalid-offset-hour.toml',
      code: 'INVALID_TIME',
    },
    {
      name: 'an offset of 61 minutes',
      fixture: 'date-validation--invalid-offset-minute.toml',
      code: 'INVALID_TIME',
    },
    {
      name: 'a date followed by T and no valid time',
      fixture: 'date-validation--invalid-time-after-t.toml',
      code: 'EXPECTED_NEWLINE',
    },
    {
      name: 'a date-time followed by an incomplete offset',
      fixture: 'date-validation--incomplete-offset.toml',
      code: 'EXPECTED_NEWLINE',
    },
    {
      name: 'a date with a one-digit month',
      fixture: 'date-validation--one-digit-month.toml',
      code: 'EXPECTED_NEWLINE',
    },
    {
      name: 'a time with a one-digit minute',
      fixture: 'date-validation--one-digit-minute.toml',
      code: 'EXPECTED_NEWLINE',
    },
  ];

  it('accepts February 29 in a leap year', () =>
    assertParsesTo(read('date-validation--feb-29-leap.toml'), {
      a: new OffsetDateTime('2024-02-29T00:00:00Z', '2024-02-29T00:00:00Z'),
    }));

  it('accepts February 29 in a century leap year', () =>
    assertParsesTo(read('date-validation--feb-29-century-leap.toml'), {
      a: new OffsetDateTime('2000-02-29T00:00:00Z', '2000-02-29T00:00:00Z'),
    }));

  for (const { name, fixture, code } of rejections)
    it(`rejects ${name}`, () =>
      strict.throws(() => parse(read(fixture)), { name: 'TomlError', code }));
});
