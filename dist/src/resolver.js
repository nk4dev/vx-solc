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
exports.ImportResolver = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const lexer_1 = require("./lexer");
class ImportResolver {
    constructor(opts) {
        this.opts = opts;
        this.cache = new Map();
    }
    resolveEntry(entry) {
        const abs = path.resolve(this.opts.basePath, entry);
        return this.load(abs, this.virtual(abs));
    }
    resolveGraph(entry) {
        const graph = new Map();
        const root = this.resolveEntry(entry);
        this.walk(root, graph);
        return graph;
    }
    walk(src, graph) {
        if (graph.has(src.virtualPath))
            return;
        graph.set(src.virtualPath, src);
        for (const t of src.tokens) {
            if (t.kind !== 'import')
                continue;
            const child = this.resolveImport(t.path, src.absolutePath);
            this.walk(child, graph);
        }
    }
    resolveImport(spec, fromFile) {
        const remapped = this.applyRemappings(spec);
        if (remapped.startsWith('./') || remapped.startsWith('../')) {
            const abs = path.resolve(path.dirname(fromFile), remapped);
            return this.load(abs, this.virtual(abs));
        }
        // Try candidates: relative to fromFile, in includePaths, or relative to basePath
        const searchDirs = [
            path.dirname(fromFile),
            ...(this.opts.includePaths ?? []),
            this.opts.basePath,
        ];
        for (const dir of searchDirs) {
            const candidate = path.resolve(dir, remapped);
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                return this.load(candidate, this.virtual(candidate));
            }
        }
        // Try looking up node_modules
        const nm = this.tryNodeModules(remapped);
        if (nm) {
            return this.load(nm, remapped);
        }
        throw new Error(`VXC: cannot resolve import "${spec}" from ${fromFile}`);
    }
    tryNodeModules(spec) {
        let dir = this.opts.basePath;
        while (true) {
            const candidate = path.join(dir, 'node_modules', spec);
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                return candidate;
            }
            const parent = path.dirname(dir);
            if (parent === dir)
                return null;
            dir = parent;
        }
    }
    applyRemappings(spec) {
        const entries = Object.entries(this.opts.remappings ?? {}).sort((a, b) => b[0].length - a[0].length);
        for (const [k, v] of entries) {
            if (spec.startsWith(k)) {
                return v + spec.slice(k.length);
            }
        }
        return spec;
    }
    virtual(abs) {
        const rel = path.relative(this.opts.basePath, abs).replace(/\\/g, '/');
        return rel.startsWith('..') ? abs.replace(/\\/g, '/') : rel;
    }
    load(abs, virtualPath) {
        const cached = this.cache.get(abs);
        if (cached)
            return cached;
        if (!fs.existsSync(abs)) {
            throw new Error(`VXC: source not found: ${abs}`);
        }
        const content = fs.readFileSync(abs, 'utf8');
        const src = {
            absolutePath: abs,
            virtualPath,
            content,
            tokens: (0, lexer_1.lex)(content),
        };
        this.cache.set(abs, src);
        return src;
    }
}
exports.ImportResolver = ImportResolver;
