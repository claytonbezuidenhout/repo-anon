#!/usr/bin/env node

const { program } = require('commander');
const { anonymize, deanonymize } = require('./../lib/processor');
const { version } = require('../package.json');

program
  .version(version)
  .description('Repository Anonymizer CLI');

program
  .command('anonymize')
  .description('Anonymize project based on .phrases file')
  .action(anonymize);

program
  .command('deanonymize')
  .description('De-anonymize project based on .phrases file')
  .action(deanonymize);

program.parse(process.argv);
