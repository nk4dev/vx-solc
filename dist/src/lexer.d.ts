export type Token = {
    kind: 'pragma';
    value: string;
    line: number;
} | {
    kind: 'import';
    path: string;
    line: number;
} | {
    kind: 'contract';
    name: string;
    line: number;
};
export declare function lex(source: string): Token[];
export declare function extractPragmaVersion(tokens: Token[]): string | null;
