import { Token } from './lexer';
export interface ResolvedSource {
    absolutePath: string;
    virtualPath: string;
    content: string;
    tokens: Token[];
}
export interface ResolverOptions {
    basePath: string;
    remappings?: Record<string, string>;
    includePaths?: string[];
}
export declare class ImportResolver {
    private opts;
    private cache;
    constructor(opts: ResolverOptions);
    resolveEntry(entry: string): ResolvedSource;
    resolveGraph(entry: string): Map<string, ResolvedSource>;
    private walk;
    private resolveImport;
    private tryNodeModules;
    private applyRemappings;
    private virtual;
    private load;
}
