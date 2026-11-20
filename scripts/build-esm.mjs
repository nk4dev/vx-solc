import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const esmWrapper = `import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cjs = require('../index.js');

export const lex = cjs.lex;
export const extractPragmaVersion = cjs.extractPragmaVersion;
export const ImportResolver = cjs.ImportResolver;
export const VXCompiler = cjs.VXCompiler;
export const parseArgs = cjs.parseArgs;
export const runCli = cjs.runCli;
export const printHelp = cjs.printHelp;
export default cjs;
`;

const esmPath = path.join(rootDir, 'dist/esm/index.mjs');
fs.mkdirSync(path.dirname(esmPath), { recursive: true });
fs.writeFileSync(esmPath, esmWrapper, 'utf-8');

const cliPath = path.join(rootDir, 'dist/src/cli.js');
if (fs.existsSync(cliPath)) {
  fs.chmodSync(cliPath, 0o755);
}
