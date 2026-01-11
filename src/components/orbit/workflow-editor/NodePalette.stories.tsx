
import type { Meta, StoryObj } from '@storybook/react';
import NodePalette from './NodePalette';

const meta: Meta<typeof NodePalette> = {
  title: 'Components/Orbit/Workflow Editor/NodePalette',
  component: NodePalette,
};

export default meta;
type Story = StoryObj<typeof NodePalette>;

export const Default: Story = {};
