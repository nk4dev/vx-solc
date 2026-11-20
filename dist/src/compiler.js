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
exports.VXCompiler = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const resolver_1 = require("./resolver");
const lexer_1 = require("./lexer");
class VXCompiler {
    constructor(backend) {
        this.backend = backend;
    }
    getBackend() {
        if (this.backend)
            return this.backend;
        try {
            // Lazy load standard solc package
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const solc = require('solc');
            this.backend = solc;
            return solc;
        }
        catch (err) {
            throw new Error(`VXC: solc backend is not available. Please install solc. (${err})`);
        }
    }
    compile(opts) {
        const basePath = path.resolve(opts.basePath ?? process.cwd());
        const resolver = new resolver_1.ImportResolver({
            basePath,
            remappings: opts.remappings,
            includePaths: opts.includePaths,
        });
        const graph = resolver.resolveGraph(opts.entry);
        const entryResolved = path.resolve(basePath, opts.entry);
        const entrySrc = [...graph.values()].find((s) => path.resolve(s.absolutePath) === entryResolved);
        const pragma = entrySrc ? (0, lexer_1.extractPragmaVersion)(entrySrc.tokens) : null;
        const sources = {};
        for (const [vp, src] of graph) {
            sources[vp] = { content: src.content };
        }
        const standardJson = {
            language: 'Solidity',
            sources,
            settings: {
                optimizer: opts.optimizer ?? { enabled: false, runs: 200 },
                evmVersion: opts.evmVersion,
                ...(opts.viaIR !== undefined ? { viaIR: opts.viaIR } : {}),
                outputSelection: {
                    '*': {
                        '*': [
                            'abi',
                            'evm.bytecode.object',
                            'evm.deployedBytecode.object',
                            ...(opts.metadata ? ['metadata'] : []),
                        ],
                    },
                },
                remappings: opts.remappings
                    ? Object.entries(opts.remappings).map(([k, v]) => `${k}=${v}`)
                    : undefined,
            },
        };
        const backend = this.getBackend();
        const raw = backend.compile(JSON.stringify(standardJson));
        const out = JSON.parse(raw);
        const errors = (out.errors ?? []).map((e) => ({
            severity: e.severity,
            message: e.formattedMessage ?? e.message,
            formattedMessage: e.formattedMessage,
            sourceLocation: e.sourceLocation,
        }));
        const hasError = errors.some((e) => e.severity === 'error');
        const artifacts = [];
        const contracts = out.contracts ?? {};
        for (const [sourcePath, perSource] of Object.entries(contracts)) {
            for (const [name, c] of Object.entries(perSource)) {
                const rawBytecode = c?.evm?.bytecode?.object ?? '';
                const rawDeployed = c?.evm?.deployedBytecode?.object ?? '';
                const bytecode = rawBytecode ? (rawBytecode.startsWith('0x') ? rawBytecode : '0x' + rawBytecode) : '0x';
                const deployedBytecode = rawDeployed ? (rawDeployed.startsWith('0x') ? rawDeployed : '0x' + rawDeployed) : '0x';
                artifacts.push({
                    contractName: name,
                    sourcePath,
                    abi: c?.abi ?? [],
                    bytecode,
                    deployedBytecode,
                    compiler: {
                        name: 'vxc',
                        backend: backend.version ? backend.version() : 'solc',
                        pragma,
                    },
                    ...(opts.metadata && c?.metadata ? { metadata: c.metadata } : {}),
                });
            }
        }
        // Only write artifacts if there are no compilation errors
        if (!hasError && opts.emitArtifacts !== false && opts.outDir) {
            this.writeArtifacts(opts.outDir, artifacts, [...graph.values()]);
        }
        return { artifacts, errors, sources: [...graph.keys()] };
    }
    writeArtifacts(outDir, artifacts, srcs) {
        fs.mkdirSync(outDir, { recursive: true });
        const nameCounts = new Map();
        for (const a of artifacts) {
            nameCounts.set(a.contractName, (nameCounts.get(a.contractName) ?? 0) + 1);
        }
        const contractEntries = [];
        for (const a of artifacts) {
            const hasDuplicate = (nameCounts.get(a.contractName) ?? 0) > 1;
            const safeSource = a.sourcePath.replace(/[^a-zA-Z0-9._-]/g, '_');
            const fileName = hasDuplicate
                ? `${safeSource}_${a.contractName}.json`
                : `${a.contractName}.json`;
            const file = path.join(outDir, fileName);
            fs.writeFileSync(file, JSON.stringify(a, null, 2));
            contractEntries.push({
                name: a.contractName,
                source: a.sourcePath,
                artifact: fileName,
            });
        }
        const manifest = {
            compiler: 'vxc',
            generatedAt: new Date().toISOString(),
            sources: srcs.map((s) => s.virtualPath),
            contracts: contractEntries,
        };
        fs.writeFileSync(path.join(outDir, 'vxc.manifest.json'), JSON.stringify(manifest, null, 2));
    }
}
exports.VXCompiler = VXCompiler;
