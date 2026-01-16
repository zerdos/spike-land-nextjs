export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>
      <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
        <p className="text-muted-foreground">General settings coming soon.</p>
        <div className="flex flex-col gap-2">
          <a
            href="settings/inbox/routing"
            className="text-blue-600 hover:underline"
          >
            Inbox Smart Routing
          </a>
        </div>
      </div>
    </div>
  );
}
