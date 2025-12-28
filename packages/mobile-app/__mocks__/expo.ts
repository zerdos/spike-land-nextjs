/**
 * Mock for expo module
 * Prevents winter runtime issues in tests
 */

export function registerRootComponent(component: React.ComponentType): void {
  // No-op in tests
}

export default {
  registerRootComponent,
};
