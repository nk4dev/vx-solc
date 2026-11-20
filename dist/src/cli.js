#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseArgs = parseArgs;
exports.printHelp = printHelp;
exports.runCli = runCli;
const path = __importStar(require("path"));
const compiler_1 = require("./compiler");
function requireOptionValue(argv, index, flag) {
    if (index + 1 >= argv.length) {
        throw new Error(`Missing value for ${flag}`);
    }
    return argv[index + 1];
}
function addRemapping(remappings, raw, flag) {
    const eqIdx = raw.indexOf('=');
    if (eqIdx <= 0) {
        throw new Error(`Invalid remapping "${raw}" for ${flag}; expected k=v`);
    }
    const k = raw.slice(0, eqIdx);
    const v = raw.slice(eqIdx + 1);
    remappings[k] = v;
}
function parseArgs(argv) {
    const args = {
        out: 'artifacts/vxc',
        optimize: false,
        runs: 200,
        viaIR: false,
        metadata: false,
        remappings: {},
        includePaths: [],
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--out' || a === '-o') {
            args.out = requireOptionValue(argv, i, a);
            i++;
        }
        else if (a === '--optimize') {
            args.optimize = true;
        }
        else if (a === '--runs') {
            const raw = requireOptionValue(argv, i, a);
            i++;
            const val = Number(raw);
            if (!Number.isInteger(val) || val < 0) {
                throw new Error(`Invalid value for --runs: "${raw}"`);
            }
            args.runs = val;
        }
        else if (a === '--evm') {
            args.evm = requireOptionValue(argv, i, a);
            i++;
        }
        else if (a === '--base') {
            args.base = requireOptionValue(argv, i, a);
            i++;
        }
        else if (a === '--via-ir') {
            args.viaIR = true;
        }
        else if (a === '--metadata') {
            args.metadata = true;
        }
        else if (a === '--include' || a === '-I') {
            args.includePaths.push(requireOptionValue(argv, i, a));
            i++;
        }
        else if (a === '--remap') {
            const raw = requireOptionValue(argv, i, a);
            i++;
            addRemapping(args.remappings, raw, a);
        }
        else if (a.startsWith('--remap=')) {
            const raw = a.slice('--remap='.length);
            addRemapping(args.remappings, raw, '--remap');
        }
        else if (a.startsWith('-')) {
            throw new Error(`Unknown option: ${a}`);
        }
        else if (!args.entry) {
            args.entry = a;
        }
    }
    return args;
}
function printHelp() {
    console.log(`vxc — VX3 custom Solidity compiler

Usage:
  vxc <entry.sol> [options]

Options:
  -o, --out <dir>      Output directory for artifacts (default: artifacts/vxc)
      --optimize       Enable the optimizer (default: off)
      --runs <n>       Optimizer runs (default: 200)
      --evm <version>  Target EVM version (e.g. cancun)
      --base <dir>     Base path for import resolution (default: cwd)
      --via-ir         Compile via Yul IR pipeline (default: off)
      --metadata       Emit Solidity metadata in artifacts (default: off)
  -I, --include <dir>  Add an import search path (repeatable)
      --remap k=v      Add an import remapping (repeatable)
  -h, --help           Show help
`);
}
function runCli(argv = process.argv.slice(2)) {
    if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
        printHelp();
        return 0;
    }
    let args;
    try {
        args = parseArgs(argv);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[error] ${msg}`);
        return 1;
    }
    if (!args.entry) {
        console.error('vxc: missing entry file');
        return 1;
    }
    const compiler = new compiler_1.VXCompiler();
    try {
        const result = compiler.compile({
            entry: args.entry,
            basePath: args.base ? path.resolve(args.base) : process.cwd(),
            outDir: args.out,
            optimizer: { enabled: args.optimize, runs: args.runs },
            evmVersion: args.evm,
            viaIR: args.viaIR,
            remappings: args.remappings,
            includePaths: args.includePaths,
            metadata: args.metadata,
        });
        let hasError = false;
        for (const e of result.errors) {
            if (e.severity === 'error') {
                hasError = true;
                console.error(`[error] ${e.message}`);
            }
            else {
                console.warn(`[${e.severity}] ${e.message}`);
            }
        }
        if (hasError) {
            return 1;
        }
        console.log(`vxc: compiled ${result.artifacts.length} contract(s) from ${result.sources.length} source(s) → ${args.out}`);
        return 0;
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[error] ${msg}`);
        return 1;
    }
}
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    const code = runCli();
    if (code !== 0) {
        process.exit(code);
    }
}
