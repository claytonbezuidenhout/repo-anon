#!/usr/bin/env node

const { program } = require('commander');
const { anonymize, deanonymize } = require('./../lib/processor');

program
  .version('1.0.0')
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
