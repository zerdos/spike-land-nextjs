"use client";

import { EnhancementSettings } from "@/components/enhance/EnhancementSettings";
import { Section } from "@/components/storybook";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";

function EnhancementSettingsDemo() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEnhance = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    toast.success("Enhancement completed!");
  };

  return (
    <EnhancementSettings
      onEnhance={handleEnhance}
      currentBalance={15}
      isProcessing={isProcessing}
      completedVersions={[]}
      imageUrl="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop"
      imageName="mountain_view.jpg"
      trigger={<Button>Open Enhancement Settings</Button>}
    />
  );
}

export default function ModalsPage() {
  return (
    <div className="space-y-12">
      <Section
        title="Modal Components"
        description="Dialog, sheet, and alert dialog components"
      >
        {/* Enhancement Settings Dialog */}
        <Card>
          <CardHeader>
            <CardTitle>Enhancement Settings Dialog</CardTitle>
            <CardDescription>
              Modal dialog with card-based tier selection for image enhancement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnhancementSettingsDemo />
          </CardContent>
        </Card>

        {/* Sheet */}
        <Card>
          <CardHeader>
            <CardTitle>Sheet</CardTitle>
            <CardDescription>Slide-out panel for navigation or settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">Open Sheet (Right)</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Settings</SheetTitle>
                    <SheetDescription>Manage your account settings.</SheetDescription>
                  </SheetHeader>
                  <div className="py-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Dark Mode</Label>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Notifications</Label>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </CardContent>
        </Card>

        {/* Alert Dialog */}
        <Card>
          <CardHeader>
            <CardTitle>Alert Dialog</CardTitle>
            <CardDescription>Confirmation dialog for destructive actions</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Image</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the image and all its
                    enhanced versions.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
