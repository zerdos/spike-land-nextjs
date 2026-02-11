// @ts-expect-error - Vitest expect and Testing Library compatibility
import { expect } from 'vitest';
// @ts-expect-error - Jest-dom matchers types
import * as matchers from '@testing-library/jest-dom/matchers';

// Extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Cleanup after each test case (e.g. clearing jsdom)
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
