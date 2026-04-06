import { readFileSync } from 'node:fs';
import { parse } from 'toml.min';

const content = readFileSync(
  new URL('./snapshot.toml', import.meta.url),
  'utf-8'
);

for (let i = 0; i < 5_000; i++) parse(content);
