#!/usr/bin/env node

const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const URLExpander = require('./urlExpander');

program
  .name('url-expander')
  .description('Expand shortened URLs in text files using headless browser')
  .version('1.0.0');

program
  .command('process <file>')
  .description('Process a text file to expand shortened URLs')
  .option('-c, --concurrency <number>', 'number of concurrent URL expansions', '5')
  .option('-t, --timeout <seconds>', 'browser timeout in seconds', '30')
  .option('-r, --retries <number>', 'number of retry attempts', '2')
  .action(async (file, options) => {
    const expander = new URLExpander({
      concurrency: parseInt(options.concurrency),
      timeout: parseInt(options.timeout) * 1000,
      retries: parseInt(options.retries)
    });

    try {
      console.log(`Processing file: ${file} (concurrency: ${options.concurrency}, timeout: ${options.timeout}s, retries: ${options.retries})`);

      // Create output filename
      const ext = path.extname(file);
      const baseName = path.basename(file, ext);
      const outputFile = path.join(path.dirname(file), `${baseName}_expanded${ext}`);

      const result = await expander.processFile(file, outputFile);

      if (result.success) {
        console.log(`✅ Success: ${file} → ${outputFile}`);
      } else {
        console.error(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Fatal error: ${error.message}`);
    } finally {
      await expander.close();
    }
  });

program
  .command('gui')
  .description('Start GUI mode (web interface)')
  .action(() => {
    console.log('GUI mode is not yet implemented. Use the CLI for now.');
    console.log('Example: url-expander process your_file.md');
  });

program
  .option('-v, --verbose', 'show verbose output')
  .option('-t, --timeout <seconds>', 'set browser timeout in seconds', '30');

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
