import { annotateProtoethikAnalysis } from '../ethics/protoethik.js';
export function protoethikPlugin(options) {
    return {
        name: 'protoethik',
        setup(ctx) {
            const weights = options?.weights;
            const unsub = ctx.on('export', ({ trace }) => {
                annotateProtoethikAnalysis(trace, { weights });
            });
            return () => unsub();
        },
    };
}
//# sourceMappingURL=protoethik.js.map