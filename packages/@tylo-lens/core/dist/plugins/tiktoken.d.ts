import type { LensPlugin } from '../types.js';
export type TiktokenTokenizerPluginOptions = {
    /**
     * If set, uses `encoding_for_model(model)` when available.
     * Example: "gpt-4o-mini"
     */
    model?: string;
    /**
     * If set, uses `get_encoding(encoding)` (fallback path).
     * Example: "cl100k_base"
     */
    encoding?: string;
    /**
     * When true, logs a one-time warning if tiktoken is not installed.
     * Default: true.
     */
    warnIfMissing?: boolean;
};
/**
 * Optional “heavy tokenizer” plugin.
 *
 * This plugin uses `@dqbd/tiktoken` if available, otherwise falls back to the built-in heuristic estimator.
 *
 * Why optional?
 * - keeps the default install lightweight
 * - avoids bundling WASM unless users opt in
 */
export declare function tiktokenTokenizerPlugin(options?: TiktokenTokenizerPluginOptions): LensPlugin;
//# sourceMappingURL=tiktoken.d.ts.map