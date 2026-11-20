import { createRequire } from 'node:module';

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
