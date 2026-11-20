import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseArgs, runCli } from '../src/cli';

function makeTmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vxc-cli-'));
}

describe('CLI arguments parsing', () => {
  it('parses defaults correctly', () => {
    const args = parseArgs(['Token.sol']);
    expect(args.entry).toBe('Token.sol');
    expect(args.out).toBe('artifacts/vxc');
    expect(args.optimize).toBe(false);
    expect(args.runs).toBe(200);
    expect(args.metadata).toBe(false);
    expect(args.remappings).toEqual({});
  });

  it('parses custom flags', () => {
    const args = parseArgs([
      'contracts/Token.sol',
      '--out',
      'build',
      '--optimize',
      '--runs',
      '1000',
      '--evm',
      'cancun',
      '--base',
      '/custom/base',
      '--via-ir',
      '--metadata',
      '-I',
      'libs',
      '--include',
      'vendor',
      '--remap',
      '@openzeppelin/=node_modules/@openzeppelin/',
    ]);
    expect(args.entry).toBe('contracts/Token.sol');
    expect(args.out).toBe('build');
    expect(args.optimize).toBe(true);
    expect(args.runs).toBe(1000);
    expect(args.evm).toBe('cancun');
    expect(args.base).toBe('/custom/base');
    expect(args.viaIR).toBe(true);
    expect(args.metadata).toBe(true);
    expect(args.includePaths).toEqual(['libs', 'vendor']);
    expect(args.remappings['@openzeppelin/']).toBe('node_modules/@openzeppelin/');
  });

  it('throws on missing option values, invalid runs/remap, and unknown flags', () => {
    expect(() => parseArgs(['--out'])).toThrow(/Missing value for --out/);
    expect(() => parseArgs(['--runs', '-5', 'A.sol'])).toThrow(/Invalid value for --runs/);
    expect(() => parseArgs(['--remap', 'bad', 'A.sol'])).toThrow(/Invalid remapping/);
    expect(() => parseArgs(['--unknown', 'A.sol'])).toThrow(/Unknown option: --unknown/);
  });
});

describe('runCli()', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = makeTmp();
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('returns 0 for --help', () => {
    expect(runCli(['--help'])).toBe(0);
  });

  it('returns 1 when missing entry file', () => {
    expect(runCli([])).toBe(0); // empty argv shows help and returns 0
    expect(runCli(['--optimize'])).toBe(1);
  });

  it('compiles contract via CLI correctly', () => {
    const solPath = path.join(tmp, 'Token.sol');
    fs.writeFileSync(
      solPath,
      '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\ncontract Token { uint256 public val = 1; }'
    );
    const outDir = path.join(tmp, 'artifacts');
    const code = runCli([solPath, '--out', outDir, '--base', tmp]);
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(outDir, 'Token.json'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'vxc.manifest.json'))).toBe(true);
  });

  it('returns 1 on compilation failure', () => {
    const solPath = path.join(tmp, 'Broken.sol');
    fs.writeFileSync(solPath, 'pragma solidity ^0.8.20;\ncontract Broken { syntax_error; }');
    const outDir = path.join(tmp, 'artifacts');
    const code = runCli([solPath, '--out', outDir, '--base', tmp]);
    expect(code).toBe(1);
  });

  it('returns 1 on invalid CLI flags', () => {
    expect(runCli(['--unknown', 'A.sol'])).toBe(1);
    expect(runCli(['--out'])).toBe(1);
  });
});

describe('built dist package (Node CJS, ESM, and CLI)', () => {
  const pkgRoot = path.resolve(__dirname, '..');

  it('runs built dist/src/cli.js --help via Node.js', () => {
    const out = execFileSync('node', [path.join(pkgRoot, 'dist/src/cli.js'), '--help'], {
      encoding: 'utf-8',
    });
    expect(out).toContain('vxc — VX3 custom Solidity compiler');
    expect(out).toContain('--via-ir');
  });

  it('loads CJS dist/index.js and Node ESM dist/esm/index.mjs cleanly', () => {
    const cjsOut = execFileSync(
      'node',
      [
        '-e',
        'const pkg = require("./dist/index.js"); console.log(typeof pkg.VXCompiler, typeof pkg.parseArgs, typeof pkg.lex, typeof pkg.ImportResolver);',
      ],
      { cwd: pkgRoot, encoding: 'utf-8' }
    );
    expect(cjsOut.trim()).toBe('function function function function');

    const esmOut = execFileSync(
      'node',
      [
        '--input-type=module',
        '-e',
        'import { VXCompiler, parseArgs, lex, ImportResolver } from "./dist/esm/index.mjs"; console.log(typeof VXCompiler, typeof parseArgs, typeof lex, typeof ImportResolver);',
      ],
      { cwd: pkgRoot, encoding: 'utf-8' }
    );
    expect(esmOut.trim()).toBe('function function function function');
  });
});
