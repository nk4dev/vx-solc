#!/usr/bin/env node
export interface CliArgs {
    entry?: string;
    out: string;
    optimize: boolean;
    runs: number;
    evm?: string;
    base?: string;
    viaIR: boolean;
    metadata: boolean;
    remappings: Record<string, string>;
    includePaths: string[];
}
export declare function parseArgs(argv: string[]): CliArgs;
export declare function printHelp(): void;
export declare function runCli(argv?: string[]): number;
