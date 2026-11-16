# @vx3/solc-compiler

VXC — VX3 Custom Solidity Compiler (`vxc` / `solc-compiler`).

A fully custom **frontend** (lexer, import resolver, dependency-graph builder, artifact pipeline, manifest emitter) with a pluggable **solc backend**.

## Features

- **Robust Lexer**: Strips comments/strings while preserving line counts, handles multiline imports, alias imports (`import "..." as Alias;`), and pragma extraction.
- **Import Resolver**: Dependency graph traversal supporting relative imports, remappings (`--remap k=v`), include paths, and automatic `node_modules` resolution with cycle detection.
- **Compiler Pipeline**: Standard JSON I/O, EVM bytecode extraction, deploy-ready artifacts, and `vxc.manifest.json`.
- **Zero Heavy Config**: Instant standalone CLI or programmatic TypeScript API.

## CLI Usage

```bash
vxc <entry.sol> [options]
```

### Options

| Option | Default | Description |
| --- | --- | --- |
| `-o, --out <dir>` | `artifacts/vxc` | Output directory for artifacts |
| `--optimize` | off | Enable the optimizer |
| `--runs <n>` | `200` | Optimizer runs |
| `--evm <version>` | compiler default | Target EVM version (e.g. `cancun`) |
| `--base <dir>` | current directory | Base path for import resolution |
| `--metadata` | off | Emit Solidity metadata in artifacts |
| `--remap k=v` | — | Add an import remapping (repeatable) |

### Example

```bash
vxc contracts/Token.sol \
  --out build \
  --optimize --runs 1000 \
  --evm cancun \
  --remap @openzeppelin/=node_modules/@openzeppelin/
```

## Programmatic API

```ts
import { VXCompiler } from '@vx3/solc-compiler';

const compiler = new VXCompiler();
const { artifacts, errors, sources } = compiler.compile({
  entry: 'contracts/Token.sol',
  basePath: process.cwd(),
  outDir: 'build',
  optimizer: { enabled: true, runs: 200 },
  remappings: { '@openzeppelin/': 'node_modules/@openzeppelin/' },
  metadata: true,
});

for (const a of artifacts) {
  console.log(a.contractName, a.bytecode.length, 'bytes');
}
```

## Author

[nk4dev](https://nknighta.me/g)