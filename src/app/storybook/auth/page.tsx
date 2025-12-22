import { AuthButtons } from "@/components/auth/auth-buttons";
import { SignInButton } from "@/components/auth/sign-in-button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { UserAvatar } from "@/components/auth/user-avatar";
import { Section } from "@/components/storybook";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthPage() {
  return (
    <div className="space-y-12">
      <Section
        title="Authentication"
        description="Components for handling user authentication and identity"
      >
        {/* Auth Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Auth Buttons</CardTitle>
            <CardDescription>
              Main authentication buttons group
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <AuthButtons />
            </div>
          </CardContent>
        </Card>

        {/* Individual Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Buttons</CardTitle>
            <CardDescription>
              Standalone sign-in and sign-out buttons
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Sign In</span>
                <SignInButton />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Sign Out</span>
                <SignOutButton />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Avatar */}
        <Card>
          <CardHeader>
            <CardTitle>User Avatar</CardTitle>
            <CardDescription>
              Avatar component for displaying user profile images
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-8 items-end">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">With Image</span>
                <UserAvatar
                  user={{
                    name: "Alice Smith",
                    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Fallback (Initials)</span>
                <UserAvatar
                  user={{
                    name: "Bob Jones",
                    image: null,
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">No Name (Fallback Icon)</span>
                <UserAvatar
                  user={{
                    name: null,
                    image: null,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
