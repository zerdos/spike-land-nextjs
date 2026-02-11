/**
 * Codespace constants
 *
 * Shared values used across codespace services and API routes.
 */

/**
 * React version used in import maps for embedded apps.
 * Keep in sync with packages/code/src/@/lib/importmap-utils.ts REACT_VERSION.
 */
export const REACT_VERSION = "19.2.4";

/** Base URL for ESM CDN imports */
export const ESM_CDN = "https://esm.sh";

/** Shared deps param to ensure React singleton across all esm.sh packages */
export const ESM_DEPS_PARAM = `deps=react@${REACT_VERSION},react-dom@${REACT_VERSION}`;
