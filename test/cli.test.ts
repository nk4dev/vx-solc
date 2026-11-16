import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
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
      '--metadata',
      '--remap',
      '@openzeppelin/=node_modules/@openzeppelin/',
    ]);
    expect(args.entry).toBe('contracts/Token.sol');
    expect(args.out).toBe('build');
    expect(args.optimize).toBe(true);
    expect(args.runs).toBe(1000);
    expect(args.evm).toBe('cancun');
    expect(args.base).toBe('/custom/base');
    expect(args.metadata).toBe(true);
    expect(args.remappings['@openzeppelin/']).toBe('node_modules/@openzeppelin/');
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
});
