#!/usr/bin/env node

/**
 * Aggregated test runner for Lao Cinema monorepo
 * Runs all test suites and provides a summary at the end
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const testSuites = [
  { name: 'Web (Jest)', command: 'npm', args: ['test'], cwd: join(rootDir, 'web') },
  { name: 'API (Vitest)', command: 'npm', args: ['test'], cwd: join(rootDir, 'api') },
];

const results = [];

function runTest(suite) {
  return new Promise((resolve) => {
    console.log(`\n${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}Running: ${suite.name}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    const startTime = Date.now();
    const child = spawn(suite.command, suite.args, {
      cwd: suite.cwd,
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const passed = code === 0;
      
      results.push({
        name: suite.name,
        passed,
        exitCode: code,
        duration,
      });

      resolve();
    });

    child.on('error', (error) => {
      console.error(`${colors.red}Error running ${suite.name}:${colors.reset}`, error);
      results.push({
        name: suite.name,
        passed: false,
        exitCode: 1,
        duration: '0.00',
        error: error.message,
      });
      resolve();
    });
  });
}

async function runAllTests() {
  console.log(`${colors.bright}${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║   Lao Cinema Test Suite Runner         ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);

  // Run all test suites sequentially
  for (const suite of testSuites) {
    await runTest(suite);
  }

  // Print summary
  printSummary();

  // Exit with error code if any tests failed
  const hasFailures = results.some(r => !r.passed);
  process.exit(hasFailures ? 1 : 0);
}

function printSummary() {
  console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}                          TEST SUMMARY${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  const passedSuites = results.filter(r => r.passed);
  const failedSuites = results.filter(r => !r.passed);
  const totalDuration = results.reduce((sum, r) => sum + parseFloat(r.duration), 0).toFixed(2);

  // Print individual suite results
  results.forEach(result => {
    const status = result.passed 
      ? `${colors.green}✓ PASSED${colors.reset}` 
      : `${colors.red}✗ FAILED${colors.reset}`;
    const duration = `${colors.yellow}${result.duration}s${colors.reset}`;
    
    console.log(`  ${status}  ${colors.bright}${result.name}${colors.reset} (${duration})`);
    
    if (result.error) {
      console.log(`         ${colors.red}Error: ${result.error}${colors.reset}`);
    }
  });

  console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  // Print overall summary
  if (failedSuites.length === 0) {
    console.log(`  ${colors.green}${colors.bright}✓ All test suites passed!${colors.reset}`);
  } else {
    console.log(`  ${colors.red}${colors.bright}✗ ${failedSuites.length} test suite(s) failed:${colors.reset}`);
    failedSuites.forEach(suite => {
      console.log(`    ${colors.red}• ${suite.name}${colors.reset}`);
    });
  }

  console.log(`\n  ${colors.bright}Total Suites:${colors.reset} ${results.length}`);
  console.log(`  ${colors.green}Passed:${colors.reset} ${passedSuites.length}`);
  console.log(`  ${colors.red}Failed:${colors.reset} ${failedSuites.length}`);
  console.log(`  ${colors.yellow}Duration:${colors.reset} ${totalDuration}s`);

  console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

// Run the tests
runAllTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
