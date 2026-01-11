'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface AutopilotToggleProps {
  isEnabled: boolean;
  isLoading?: boolean;
  onToggle: (checked: boolean) => void;
}

export function AutopilotToggle({ isEnabled, isLoading, onToggle }: AutopilotToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="autopilot-mode"
        checked={isEnabled}
        onCheckedChange={onToggle}
        disabled={isLoading}
      />
      <Label htmlFor="autopilot-mode" className="font-medium cursor-pointer">
        Autopilot
      </Label>
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      ) : (
        <Badge variant={isEnabled ? 'default' : 'outline'} className="text-xs h-5">
          {isEnabled ? 'ON' : 'OFF'}
        </Badge>
      )}
    </div>
  );
}
