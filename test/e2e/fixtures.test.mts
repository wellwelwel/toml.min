import { describe, it } from 'poku';
import { parse, read } from '../__helpers__/index.mts';

describe('Fixture files', () => {
  it('parses example.toml', () =>
    parse(read('fixture-files--example.toml'), {
      title: 'TOML Example',
      owner: {
        name: 'Tom Preston-Werner',
        organization: 'GitHub',
        bio: 'GitHub Cofounder & CEO\n\tLikes "tater tots" and beer and backslashes: \\',
        dob: new Date('1979-05-27T07:32:00Z'),
      },
      database: {
        server: '192.168.1.1',
        ports: [8001, 8001, 8003],
        connection_max: 5000,
        connection_min: -2,
        max_temp: 87.1,
        min_temp: -17.76,
        enabled: true,
      },
      servers: {
        alpha: { ip: '10.0.0.1', dc: 'eqdc10' },
        beta: { ip: '10.0.0.2', dc: 'eqdc10' },
      },
      clients: {
        data: [
          ['gamma', 'delta'],
          [1, 2],
        ],
      },
    }));

  it('parses hard_example.toml', () =>
    parse(read('fixture-files--hard-example.toml'), {
      the: {
        hard: {
          another_test_string: ' Same thing, but with a string #',
          'bit#': {
            multi_line_array: [']'],
            'what?': "You don't think some user won't do that?",
          },
          harder_test_string:
            ' And when "\'s are in the string, along with # "',
          test_array: ['] ', ' # '],
          test_array2: ['Test #11 ]proved that', 'Experiment #9 was a success'],
        },
        test_string: "You'll hate me after this - #",
      },
    }));

  it('parses easy table arrays', () =>
    parse(read('fixture-files--easy-table-arrays.toml'), {
      products: [
        { name: 'Hammer', sku: 738594937 },
        {},
        { name: 'Nail', sku: 284758393, color: 'gray' },
      ],
    }));

  it('parses hard table arrays', () =>
    parse(read('fixture-files--hard-table-arrays.toml'), {
      fruit: [
        { name: 'durian', variety: [] },
        {
          name: 'apple',
          physical: { color: 'red', shape: 'round' },
          variety: [{ name: 'red delicious' }, { name: 'granny smith' }],
        },
        {},
        { name: 'banana', variety: [{ name: 'plantain' }] },
        { name: 'orange', physical: { color: 'orange', shape: 'round' } },
      ],
    }));
});
