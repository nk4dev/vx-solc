export type SolcBackend = {
    compile(input: string): string;
    version?(): string;
};
export interface CompileOptions {
    entry: string;
    basePath?: string;
    outDir?: string;
    optimizer?: {
        enabled: boolean;
        runs?: number;
    };
    evmVersion?: string;
    viaIR?: boolean;
    remappings?: Record<string, string>;
    includePaths?: string[];
    emitArtifacts?: boolean;
    metadata?: boolean;
}
export interface ContractArtifact {
    contractName: string;
    sourcePath: string;
    abi: unknown[];
    bytecode: string;
    deployedBytecode: string;
    compiler: {
        name: 'vxc';
        backend: string;
        pragma: string | null;
    };
    metadata?: string;
}
export interface CompileError {
    severity: string;
    message: string;
    formattedMessage?: string;
    sourceLocation?: unknown;
}
export interface CompileResult {
    artifacts: ContractArtifact[];
    errors: CompileError[];
    sources: string[];
}
export declare class VXCompiler {
    private backend?;
    constructor(backend?: SolcBackend | undefined);
    private getBackend;
    compile(opts: CompileOptions): CompileResult;
    private writeArtifacts;
}
