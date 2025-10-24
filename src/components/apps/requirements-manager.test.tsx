import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { RequirementsManager } from './requirements-manager';
import type { Requirement } from '@/types/app';

describe('RequirementsManager', () => {
  const mockRequirements: Requirement[] = [
    {
      id: 'req-1',
      text: 'User authentication',
      priority: 'high',
      status: 'pending',
      order: 0,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'req-2',
      text: 'Dashboard layout',
      priority: 'medium',
      status: 'in-progress',
      order: 1,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
    {
      id: 'req-3',
      text: 'API integration',
      priority: 'low',
      status: 'completed',
      order: 2,
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
    },
  ];

  let mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange = vi.fn();
  });

  describe('Rendering', () => {
    it('should render the component with title and description', () => {
      render(
        <RequirementsManager requirements={[]} onRequirementsChange={mockOnChange} />
      );

      expect(screen.getByText('Requirements')).toBeInTheDocument();
      expect(
        screen.getByText('Manage app requirements with priorities and status tracking')
      ).toBeInTheDocument();
    });

    it('should render empty state when no requirements', () => {
      render(
        <RequirementsManager requirements={[]} onRequirementsChange={mockOnChange} />
      );

      expect(
        screen.getByText('No requirements yet. Add your first requirement above.')
      ).toBeInTheDocument();
    });

    it('should render all requirements in order', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const items = screen.getAllByTestId('requirement-item');
      expect(items).toHaveLength(3);

      expect(screen.getByText('User authentication')).toBeInTheDocument();
      expect(screen.getByText('Dashboard layout')).toBeInTheDocument();
      expect(screen.getByText('API integration')).toBeInTheDocument();
    });

    it('should display max requirements count when provided', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
          maxRequirements={5}
        />
      );

      expect(screen.getByText(/\(3\/5\)/)).toBeInTheDocument();
    });

    it('should not render input and add button in readonly mode', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
          readonly
        />
      );

      expect(screen.queryByPlaceholderText('Add new requirement...')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Add requirement')).not.toBeInTheDocument();
    });

    it('should not render edit/delete buttons in readonly mode', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
          readonly
        />
      );

      expect(screen.queryByLabelText('Edit requirement')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Delete requirement')).not.toBeInTheDocument();
    });
  });

  describe('Adding Requirements', () => {
    it('should add a new requirement when text is entered and add button clicked', () => {
      render(
        <RequirementsManager requirements={[]} onRequirementsChange={mockOnChange} />
      );

      const input = screen.getByPlaceholderText('Add new requirement...');
      const addButton = screen.getByLabelText('Add requirement');

      fireEvent.change(input, { target: { value: 'New requirement' } });
      fireEvent.click(addButton);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const newRequirements = mockOnChange.mock.calls[0][0];
      expect(newRequirements).toHaveLength(1);
      expect(newRequirements[0].text).toBe('New requirement');
      expect(newRequirements[0].priority).toBe('medium');
      expect(newRequirements[0].status).toBe('pending');
      expect(newRequirements[0].order).toBe(0);
    });

    it('should add requirement when Enter key is pressed', () => {
      render(
        <RequirementsManager requirements={[]} onRequirementsChange={mockOnChange} />
      );

      const input = screen.getByPlaceholderText('Add new requirement...');

      fireEvent.change(input, { target: { value: 'New requirement' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should not add empty requirement', () => {
      render(
        <RequirementsManager requirements={[]} onRequirementsChange={mockOnChange} />
      );

      const addButton = screen.getByLabelText('Add requirement');
      fireEvent.click(addButton);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should not add requirement with only whitespace', () => {
      render(
        <RequirementsManager requirements={[]} onRequirementsChange={mockOnChange} />
      );

      const input = screen.getByPlaceholderText('Add new requirement...');
      const addButton = screen.getByLabelText('Add requirement');

      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(addButton);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should trim whitespace from requirement text', () => {
      render(
        <RequirementsManager requirements={[]} onRequirementsChange={mockOnChange} />
      );

      const input = screen.getByPlaceholderText('Add new requirement...');
      const addButton = screen.getByLabelText('Add requirement');

      fireEvent.change(input, { target: { value: '  New requirement  ' } });
      fireEvent.click(addButton);

      const newRequirements = mockOnChange.mock.calls[0][0];
      expect(newRequirements[0].text).toBe('New requirement');
    });

    it('should clear input after adding requirement', () => {
      render(
        <RequirementsManager requirements={[]} onRequirementsChange={mockOnChange} />
      );

      const input = screen.getByPlaceholderText(
        'Add new requirement...'
      ) as HTMLInputElement;
      const addButton = screen.getByLabelText('Add requirement');

      fireEvent.change(input, { target: { value: 'New requirement' } });
      fireEvent.click(addButton);

      expect(input.value).toBe('');
    });

    it('should not add requirement when max limit is reached', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
          maxRequirements={3}
        />
      );

      const input = screen.getByPlaceholderText('Add new requirement...');
      const addButton = screen.getByLabelText('Add requirement');

      fireEvent.change(input, { target: { value: 'New requirement' } });
      fireEvent.click(addButton);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should disable input and button when max limit is reached', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
          maxRequirements={3}
        />
      );

      const input = screen.getByPlaceholderText('Add new requirement...');
      const addButton = screen.getByLabelText('Add requirement');

      expect(input).toBeDisabled();
      expect(addButton).toBeDisabled();
    });
  });

  describe('Deleting Requirements', () => {
    it('should delete a requirement when delete button is clicked', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const deleteButtons = screen.getAllByLabelText('Delete requirement');
      fireEvent.click(deleteButtons[0]);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const updatedRequirements = mockOnChange.mock.calls[0][0];
      expect(updatedRequirements).toHaveLength(2);
      expect(updatedRequirements.find((r: Requirement) => r.id === 'req-1')).toBeUndefined();
    });

    it('should reorder remaining requirements after deletion', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const deleteButtons = screen.getAllByLabelText('Delete requirement');
      fireEvent.click(deleteButtons[1]);

      const updatedRequirements = mockOnChange.mock.calls[0][0];
      expect(updatedRequirements[0].order).toBe(0);
      expect(updatedRequirements[1].order).toBe(1);
    });
  });

  describe('Editing Requirements', () => {
    it('should enter edit mode when edit button is clicked', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByLabelText('Edit requirement');
      fireEvent.click(editButtons[0]);

      expect(screen.getByLabelText('Edit requirement text')).toBeInTheDocument();
      expect(screen.getByLabelText('Save edit')).toBeInTheDocument();
      expect(screen.getByLabelText('Cancel edit')).toBeInTheDocument();
    });

    it('should populate input with current text in edit mode', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByLabelText('Edit requirement');
      fireEvent.click(editButtons[0]);

      const input = screen.getByLabelText('Edit requirement text') as HTMLInputElement;
      expect(input.value).toBe('User authentication');
    });

    it('should save edited text when save button is clicked', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByLabelText('Edit requirement');
      fireEvent.click(editButtons[0]);

      const input = screen.getByLabelText('Edit requirement text');
      fireEvent.change(input, { target: { value: 'Updated requirement' } });

      const saveButton = screen.getByLabelText('Save edit');
      fireEvent.click(saveButton);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const updatedRequirements = mockOnChange.mock.calls[0][0];
      expect(updatedRequirements[0].text).toBe('Updated requirement');
    });

    it('should save edited text when Enter key is pressed', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByLabelText('Edit requirement');
      fireEvent.click(editButtons[0]);

      const input = screen.getByLabelText('Edit requirement text');
      fireEvent.change(input, { target: { value: 'Updated requirement' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should cancel edit when cancel button is clicked', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByLabelText('Edit requirement');
      fireEvent.click(editButtons[0]);

      const input = screen.getByLabelText('Edit requirement text');
      fireEvent.change(input, { target: { value: 'Updated requirement' } });

      const cancelButton = screen.getByLabelText('Cancel edit');
      fireEvent.click(cancelButton);

      expect(mockOnChange).not.toHaveBeenCalled();
      expect(screen.queryByLabelText('Edit requirement text')).not.toBeInTheDocument();
    });

    it('should cancel edit when Escape key is pressed', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByLabelText('Edit requirement');
      fireEvent.click(editButtons[0]);

      const input = screen.getByLabelText('Edit requirement text');
      fireEvent.change(input, { target: { value: 'Updated requirement' } });
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

      expect(mockOnChange).not.toHaveBeenCalled();
      expect(screen.queryByLabelText('Edit requirement text')).not.toBeInTheDocument();
    });

    it('should not save empty text', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByLabelText('Edit requirement');
      fireEvent.click(editButtons[0]);

      const input = screen.getByLabelText('Edit requirement text');
      fireEvent.change(input, { target: { value: '' } });

      const saveButton = screen.getByLabelText('Save edit');
      fireEvent.click(saveButton);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should not save whitespace-only text', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByLabelText('Edit requirement');
      fireEvent.click(editButtons[0]);

      const input = screen.getByLabelText('Edit requirement text');
      fireEvent.change(input, { target: { value: '   ' } });

      const saveButton = screen.getByLabelText('Save edit');
      fireEvent.click(saveButton);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should trim whitespace when saving', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByLabelText('Edit requirement');
      fireEvent.click(editButtons[0]);

      const input = screen.getByLabelText('Edit requirement text');
      fireEvent.change(input, { target: { value: '  Updated requirement  ' } });

      const saveButton = screen.getByLabelText('Save edit');
      fireEvent.click(saveButton);

      const updatedRequirements = mockOnChange.mock.calls[0][0];
      expect(updatedRequirements[0].text).toBe('Updated requirement');
    });

    it('should update updatedAt timestamp when saving', () => {
      const dateBefore = new Date();

      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const editButtons = screen.getAllByLabelText('Edit requirement');
      fireEvent.click(editButtons[0]);

      const input = screen.getByLabelText('Edit requirement text');
      fireEvent.change(input, { target: { value: 'Updated requirement' } });

      const saveButton = screen.getByLabelText('Save edit');
      fireEvent.click(saveButton);

      const updatedRequirements = mockOnChange.mock.calls[0][0];
      const dateAfter = new Date();

      expect(updatedRequirements[0].updatedAt.getTime()).toBeGreaterThanOrEqual(
        dateBefore.getTime()
      );
      expect(updatedRequirements[0].updatedAt.getTime()).toBeLessThanOrEqual(
        dateAfter.getTime()
      );
    });
  });

  describe('Priority Management', () => {
    it('should display correct priority badges', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const badges = screen.getAllByText(/^(high|medium|low)$/i);
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should update priority when changed', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const items = screen.getAllByTestId('requirement-item');
      const firstItem = items[0];
      const priorityTriggers = within(firstItem).getAllByRole('combobox');

      fireEvent.click(priorityTriggers[0]);

      const lowOptions = screen.getAllByText('Low');
      fireEvent.click(lowOptions[lowOptions.length - 1]);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const updatedRequirements = mockOnChange.mock.calls[0][0];
      expect(updatedRequirements[0].priority).toBe('low');
    });

    it('should not allow priority changes in readonly mode', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
          readonly
        />
      );

      const items = screen.getAllByTestId('requirement-item');
      const firstItem = items[0];
      const selects = within(firstItem).getAllByRole('combobox');

      selects.forEach((select) => {
        expect(select).toBeDisabled();
      });
    });
  });

  describe('Status Management', () => {
    it('should display correct status badges', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
      expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    });

    it('should update status when changed', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const items = screen.getAllByTestId('requirement-item');
      const firstItem = items[0];
      const statusTriggers = within(firstItem).getAllByRole('combobox');

      fireEvent.click(statusTriggers[1]);

      const completedOptions = screen.getAllByText('Completed');
      fireEvent.click(completedOptions[completedOptions.length - 1]);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const updatedRequirements = mockOnChange.mock.calls[0][0];
      expect(updatedRequirements[0].status).toBe('completed');
    });
  });

  describe('Drag and Drop', () => {
    it('should render drag handles when allowReorder is true', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
          allowReorder
        />
      );

      const dragHandles = screen.getAllByLabelText('Drag handle');
      expect(dragHandles).toHaveLength(3);
    });

    it('should not render drag handles when allowReorder is false', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
          allowReorder={false}
        />
      );

      expect(screen.queryByLabelText('Drag handle')).not.toBeInTheDocument();
    });

    it('should not render drag handles in readonly mode', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
          readonly
        />
      );

      expect(screen.queryByLabelText('Drag handle')).not.toBeInTheDocument();
    });

    it('should reorder items on drag and drop', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
          allowReorder
        />
      );

      const items = screen.getAllByTestId('requirement-item');

      fireEvent.dragStart(items[0]);
      fireEvent.dragOver(items[2]);
      fireEvent.drop(items[2]);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const updatedRequirements = mockOnChange.mock.calls[0][0];
      expect(updatedRequirements[0].id).toBe('req-2');
      expect(updatedRequirements[1].id).toBe('req-3');
      expect(updatedRequirements[2].id).toBe('req-1');
    });

    it('should not reorder when dropping on same item', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
          allowReorder
        />
      );

      const items = screen.getAllByTestId('requirement-item');

      fireEvent.dragStart(items[0]);
      fireEvent.dragOver(items[0]);
      fireEvent.drop(items[0]);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should handle drag end event', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
          allowReorder
        />
      );

      const items = screen.getAllByTestId('requirement-item');

      fireEvent.dragStart(items[0]);
      fireEvent.dragEnd(items[0]);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should update order values after reordering', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
          allowReorder
        />
      );

      const items = screen.getAllByTestId('requirement-item');

      fireEvent.dragStart(items[0]);
      fireEvent.dragOver(items[2]);
      fireEvent.drop(items[2]);

      const updatedRequirements = mockOnChange.mock.calls[0][0];
      expect(updatedRequirements[0].order).toBe(0);
      expect(updatedRequirements[1].order).toBe(1);
      expect(updatedRequirements[2].order).toBe(2);
    });
  });

  describe('Integration', () => {
    it('should handle complete workflow: add, edit, change priority, change status, delete', () => {
      const { rerender } = render(
        <RequirementsManager requirements={[]} onRequirementsChange={mockOnChange} />
      );

      const input = screen.getByPlaceholderText('Add new requirement...');
      fireEvent.change(input, { target: { value: 'New requirement' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      let requirements = mockOnChange.mock.calls[0][0];
      expect(requirements).toHaveLength(1);

      rerender(
        <RequirementsManager
          requirements={requirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const editButton = screen.getByLabelText('Edit requirement');
      fireEvent.click(editButton);

      const editInput = screen.getByLabelText('Edit requirement text');
      fireEvent.change(editInput, { target: { value: 'Updated requirement' } });
      fireEvent.keyDown(editInput, { key: 'Enter' });

      requirements = mockOnChange.mock.calls[1][0];
      expect(requirements[0].text).toBe('Updated requirement');

      rerender(
        <RequirementsManager
          requirements={requirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const item = screen.getByTestId('requirement-item');
      const selects = within(item).getAllByRole('combobox');

      fireEvent.click(selects[0]);
      const highOptions = screen.getAllByText('High');
      fireEvent.click(highOptions[highOptions.length - 1]);

      requirements = mockOnChange.mock.calls[2][0];
      expect(requirements[0].priority).toBe('high');

      rerender(
        <RequirementsManager
          requirements={requirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const selectsAgain = within(screen.getByTestId('requirement-item')).getAllByRole(
        'combobox'
      );
      fireEvent.click(selectsAgain[1]);
      const completedOptions = screen.getAllByText('Completed');
      fireEvent.click(completedOptions[completedOptions.length - 1]);

      requirements = mockOnChange.mock.calls[3][0];
      expect(requirements[0].status).toBe('completed');

      rerender(
        <RequirementsManager
          requirements={requirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const deleteButton = screen.getByLabelText('Delete requirement');
      fireEvent.click(deleteButton);

      requirements = mockOnChange.mock.calls[4][0];
      expect(requirements).toHaveLength(0);
    });

    it('should maintain requirement order across operations', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      const items = screen.getAllByTestId('requirement-item');
      const firstText = within(items[0]).getByText('User authentication');
      const secondText = within(items[1]).getByText('Dashboard layout');
      const thirdText = within(items[2]).getByText('API integration');

      expect(firstText).toBeInTheDocument();
      expect(secondText).toBeInTheDocument();
      expect(thirdText).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty requirements array', () => {
      render(
        <RequirementsManager requirements={[]} onRequirementsChange={mockOnChange} />
      );

      expect(
        screen.getByText('No requirements yet. Add your first requirement above.')
      ).toBeInTheDocument();
    });

    it('should generate unique IDs for new requirements', () => {
      const { rerender } = render(
        <RequirementsManager requirements={[]} onRequirementsChange={mockOnChange} />
      );

      const input = screen.getByPlaceholderText('Add new requirement...');
      const addButton = screen.getByLabelText('Add requirement');

      fireEvent.change(input, { target: { value: 'First requirement' } });
      fireEvent.click(addButton);

      const firstRequirements = mockOnChange.mock.calls[0][0];
      const firstId = firstRequirements[0].id;

      rerender(
        <RequirementsManager
          requirements={firstRequirements}
          onRequirementsChange={mockOnChange}
        />
      );

      fireEvent.change(input, { target: { value: 'Second requirement' } });
      fireEvent.click(addButton);

      const secondRequirements = mockOnChange.mock.calls[1][0];
      const secondId = secondRequirements[1].id;

      expect(firstId).not.toBe(secondId);
    });

    it('should handle requirements with same text', () => {
      const duplicateReqs: Requirement[] = [
        {
          id: 'req-1',
          text: 'Same requirement',
          priority: 'high',
          status: 'pending',
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'req-2',
          text: 'Same requirement',
          priority: 'medium',
          status: 'pending',
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      render(
        <RequirementsManager
          requirements={duplicateReqs}
          onRequirementsChange={mockOnChange}
        />
      );

      const items = screen.getAllByTestId('requirement-item');
      expect(items).toHaveLength(2);
    });

    it('should not allow dragging during edit mode', () => {
      render(
        <RequirementsManager
          requirements={mockRequirements}
          onRequirementsChange={mockOnChange}
          allowReorder
        />
      );

      const editButton = screen.getAllByLabelText('Edit requirement')[0];
      fireEvent.click(editButton);

      expect(screen.queryByLabelText('Drag handle')).not.toBeInTheDocument();
    });

    it('should handle very long requirement text', () => {
      const longText = 'A'.repeat(500);
      const longReq: Requirement = {
        id: 'req-1',
        text: longText,
        priority: 'high',
        status: 'pending',
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(
        <RequirementsManager
          requirements={[longReq]}
          onRequirementsChange={mockOnChange}
        />
      );

      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should handle special characters in requirement text', () => {
      const specialText = '<script>alert("test")</script> & special chars!@#$%^&*()';
      const specialReq: Requirement = {
        id: 'req-1',
        text: specialText,
        priority: 'high',
        status: 'pending',
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(
        <RequirementsManager
          requirements={[specialReq]}
          onRequirementsChange={mockOnChange}
        />
      );

      expect(screen.getByText(specialText)).toBeInTheDocument();
    });
  });
});
