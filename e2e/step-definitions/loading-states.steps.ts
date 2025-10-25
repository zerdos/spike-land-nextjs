import { Given, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import * as fs from 'fs';
import * as path from 'path';

Given('the loading components are implemented', function (this: CustomWorld) {
  // This is a given state - loading components exist in the codebase
});

Then('loading.tsx should exist for my-apps route', function (this: CustomWorld) {
  const loadingPath = path.join(process.cwd(), 'src/app/my-apps/loading.tsx');
  expect(fs.existsSync(loadingPath)).toBe(true);
});

Then('loading.tsx should exist for my-apps\\/new route', function (this: CustomWorld) {
  const loadingPath = path.join(process.cwd(), 'src/app/my-apps/new/loading.tsx');
  expect(fs.existsSync(loadingPath)).toBe(true);
});

Then('loading.tsx should exist for profile route', function (this: CustomWorld) {
  const loadingPath = path.join(process.cwd(), 'src/app/profile/loading.tsx');
  expect(fs.existsSync(loadingPath)).toBe(true);
});

Then('loading.tsx should exist for settings route', function (this: CustomWorld) {
  const loadingPath = path.join(process.cwd(), 'src/app/settings/loading.tsx');
  expect(fs.existsSync(loadingPath)).toBe(true);
});

Then('skeleton.tsx should exist in components\\/ui', function (this: CustomWorld) {
  const skeletonPath = path.join(process.cwd(), 'src/components/ui/skeleton.tsx');
  expect(fs.existsSync(skeletonPath)).toBe(true);
});

Then('skeleton component should have tests', function (this: CustomWorld) {
  const testPath = path.join(process.cwd(), 'src/components/ui/skeleton.test.tsx');
  expect(fs.existsSync(testPath)).toBe(true);
});

Then('app-card-skeleton.tsx should exist', function (this: CustomWorld) {
  const componentPath = path.join(process.cwd(), 'src/components/skeletons/app-card-skeleton.tsx');
  expect(fs.existsSync(componentPath)).toBe(true);
});

Then('wizard-step-skeleton.tsx should exist', function (this: CustomWorld) {
  const componentPath = path.join(process.cwd(), 'src/components/skeletons/wizard-step-skeleton.tsx');
  expect(fs.existsSync(componentPath)).toBe(true);
});

Then('profile-skeleton.tsx should exist', function (this: CustomWorld) {
  const componentPath = path.join(process.cwd(), 'src/components/skeletons/profile-skeleton.tsx');
  expect(fs.existsSync(componentPath)).toBe(true);
});

Then('settings-skeleton.tsx should exist', function (this: CustomWorld) {
  const componentPath = path.join(process.cwd(), 'src/components/skeletons/settings-skeleton.tsx');
  expect(fs.existsSync(componentPath)).toBe(true);
});

Then('all loading files should have corresponding test files', function (this: CustomWorld) {
  const loadingFiles = [
    'src/app/my-apps/loading.tsx',
    'src/app/my-apps/new/loading.tsx',
    'src/app/profile/loading.tsx',
    'src/app/settings/loading.tsx',
  ];

  const testFiles = [
    'src/app/my-apps/loading.test.tsx',
    'src/app/my-apps/new/loading.test.tsx',
    'src/app/profile/loading.test.tsx',
    'src/app/settings/loading.test.tsx',
  ];

  loadingFiles.forEach((file, index) => {
    const filePath = path.join(process.cwd(), file);
    const testPath = path.join(process.cwd(), testFiles[index]);

    if (fs.existsSync(filePath)) {
      expect(fs.existsSync(testPath)).toBe(true);
    }
  });
});

Then('all skeleton components should have corresponding test files', function (this: CustomWorld) {
  const componentFiles = [
    'src/components/skeletons/app-card-skeleton.tsx',
    'src/components/skeletons/wizard-step-skeleton.tsx',
    'src/components/skeletons/profile-skeleton.tsx',
    'src/components/skeletons/settings-skeleton.tsx',
  ];

  const testFiles = [
    'src/components/skeletons/app-card-skeleton.test.tsx',
    'src/components/skeletons/wizard-step-skeleton.test.tsx',
    'src/components/skeletons/profile-skeleton.test.tsx',
    'src/components/skeletons/settings-skeleton.test.tsx',
  ];

  componentFiles.forEach((file, index) => {
    const filePath = path.join(process.cwd(), file);
    const testPath = path.join(process.cwd(), testFiles[index]);

    if (fs.existsSync(filePath)) {
      expect(fs.existsSync(testPath)).toBe(true);
    }
  });
});
