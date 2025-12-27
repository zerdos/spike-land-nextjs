# Implementation Plan for Issue #421: Add Apple Authentication

## Summary

Add "Continue with Apple" button to the authentication page at `/auth/signin`. Apple OAuth provider is already configured in backend (`auth.config.ts`), so this task focuses on adding the Apple button to the frontend `AuthButtons` component.

## Current Auth Implementation

### Backend (Already Configured)

- `/src/auth.config.ts` lines 12, 104-107: Apple provider configured
- Uses `AUTH_APPLE_ID` and `AUTH_APPLE_SECRET` environment variables
- **No backend changes required**

### Frontend

- `/src/components/auth/auth-buttons.tsx`: Currently has Google and GitHub buttons
- Pattern: `signIn("provider", { callbackUrl: getCallbackUrl() })`
- Button styling: `variant="outline"` with `bg-card hover:bg-card/80`

## Apple Icon SVG

```tsx
function AppleIcon({ className }: { className?: string; }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516s1.52.087 2.475-1.258.762-2.391.728-2.43m3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422s1.675-2.789 1.698-2.854-.597-.79-1.254-1.157a3.7 3.7 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56s.625 1.924 1.273 2.796c.576.984 1.34 1.667 1.659 1.899s1.219.386 1.843.067c.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758q.52-1.185.473-1.282" />
    </svg>
  );
}
```

## Apple Button Component

```tsx
<Button
  onClick={() => signIn("apple", { callbackUrl: getCallbackUrl() })}
  variant="outline"
  className="w-full h-12 bg-black hover:bg-black/90 border-black text-white"
  size="lg"
>
  <AppleIcon className="mr-2 h-5 w-5" />
  Continue with Apple
</Button>;
```

**Design Notes** (Apple HIG compliant):

- Black background with white text/logo
- Works well in both light and dark modes
- `fill="currentColor"` inherits white from `text-white`

## Implementation Steps

### Step 1: Add AppleIcon Component

Add after GitHubIcon function (~line 49) in auth-buttons.tsx

### Step 2: Add Apple Button

Insert after GitHub button (lines 473-481). Order: Google, GitHub, Apple

### Step 3: Update OAuth-Only Message

Update message in `renderOAuthOnlyStep()` to include Apple:
"This account was created with Google, Apple, Facebook, or GitHub..."

### Step 4: Add Tests

```tsx
it("should render Apple social button", () => {
  render(<AuthButtons />);
  expect(screen.getByRole("button", { name: /continue with apple/i }))
    .toBeInTheDocument();
});

it("should call signIn with apple", async () => {
  const user = userEvent.setup();
  render(<AuthButtons />);
  await user.click(screen.getByRole("button", { name: /continue with apple/i }));
  expect(signIn).toHaveBeenCalledWith("apple", { callbackUrl: "/apps/pixel" });
});

it("should have correct Apple button styling", () => {
  render(<AuthButtons />);
  const appleButton = screen.getByRole("button", { name: /continue with apple/i });
  expect(appleButton).toHaveClass("bg-black", "text-white");
});
```

## Questions

1. **Button Order**: Apple third (after GitHub) or second (between Google and GitHub)?
2. **Light Mode Variant**: Should button switch to white in light mode?
3. **Facebook Button**: Backend has Facebook configured but no frontend button - add alongside Apple?

## Critical Files

- `/src/components/auth/auth-buttons.tsx` - Add AppleIcon and Apple Button
- `/src/components/auth/auth-buttons.test.tsx` - Add tests
- `/src/auth.config.ts` - Reference only (already configured)
- `/src/components/ui/button.tsx` - Styling reference
