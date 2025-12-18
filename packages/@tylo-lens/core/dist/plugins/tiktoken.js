import { estimateTokens } from '../collectors/token-estimator.js';
/**
 * Optional “heavy tokenizer” plugin.
 *
 * This plugin uses `@dqbd/tiktoken` if available, otherwise falls back to the built-in heuristic estimator.
 *
 * Why optional?
 * - keeps the default install lightweight
 * - avoids bundling WASM unless users opt in
 */
export function tiktokenTokenizerPlugin(options) {
    const warnIfMissing = options?.warnIfMissing ?? true;
    return {
        name: 'tokenizer:tiktoken',
        setup(ctx) {
            let freed = false;
            let enc = null;
            const setFallback = () => ctx.setTokenEstimator(estimateTokens);
            void (async () => {
                try {
                    const mod = await import('@dqbd/tiktoken');
                    enc = options?.model ? mod.encoding_for_model(options.model) : mod.get_encoding(options?.encoding ?? 'cl100k_base');
                    ctx.setTokenEstimator((text) => {
                        try {
                            return enc.encode(text).length;
                        }
                        catch {
                            return estimateTokens(text);
                        }
                    });
                }
                catch (err) {
                    setFallback();
                    if (warnIfMissing) {
                        // eslint-disable-next-line no-console
                        console.warn('[tylo-lens] tiktokenTokenizerPlugin: optional dependency "@dqbd/tiktoken" not found. Falling back to estimateTokens().');
                        // eslint-disable-next-line no-console
                        console.warn('[tylo-lens] Install it via: pnpm add -D @dqbd/tiktoken');
                    }
                }
            })();
            return () => {
                if (enc?.free && !freed) {
                    try {
                        enc.free();
                    }
                    catch {
                        // ignore
                    }
                }
                freed = true;
                enc = null;
                setFallback();
            };
        },
    };
}
//# sourceMappingURL=tiktoken.js.map