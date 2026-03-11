/// <reference types="vite/client" />

declare module "vite-plugin-obfuscator" {
  interface ObfuscatorOptions {
    compact?: boolean;
    controlFlowFlattening?: boolean;
    controlFlowFlatteningThreshold?: number;
    deadCodeInjection?: boolean;
    deadCodeInjectionThreshold?: number;
    debugProtection?: boolean;
    debugProtectionInterval?: number;
    disableConsoleOutput?: boolean;
    identifierNamesGenerator?: "hexadecimal" | "mangled";
    log?: boolean;
    numbersToExpressions?: boolean;
    renameGlobals?: boolean;
    rotateStringArray?: boolean;
    selfDefending?: boolean;
    shuffleStringArray?: boolean;
    simplify?: boolean;
    splitStrings?: boolean;
    splitStringsChunkLength?: number;
    stringArray?: boolean;
    stringArrayEncoding?: string[];
    stringArrayThreshold?: number;
    transformObjectKeys?: boolean;
    unicodeEscapeSequence?: boolean;
  }

  export function viteObfuscateFile(
    options: ObfuscatorOptions,
  ): import("vite").Plugin;
}
