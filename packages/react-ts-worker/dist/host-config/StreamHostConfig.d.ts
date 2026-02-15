import type { HostConfig } from './HostConfigInterface.js';
export interface VNode {
    type: string;
    props: Record<string, any>;
    children: (VNode | VTextNode)[];
}
export interface VTextNode {
    text: string;
}
interface StreamHostContext {
    namespace: string;
}
export declare const StreamHostConfig: HostConfig<string, Record<string, any>, VNode, VNode, VTextNode, StreamHostContext, boolean>;
export default StreamHostConfig;
//# sourceMappingURL=StreamHostConfig.d.ts.map