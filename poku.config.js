const { coverage } = require('@pokujs/monocart');
const { defineConfig } = require('poku');

module.exports = defineConfig({
  reporter: 'compact',
  plugins: [
    coverage({
      requireFlag: true,
      reports: ['v8', 'text', 'codecov'],
      entryFilter: {
        '**/node_modules/**': false,
        '**/test/**': false,
        '**/src/**': true,
      },
    }),
  ],
});
