export function RecentActivity() {
  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Repository Scan Completed</p>
          <p className="text-sm text-muted-foreground">web-analytics - 42 events detected</p>
          <p className="text-xs text-muted-foreground">2 hours ago</p>
        </div>
      </div>
      <div className="flex items-center">
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Tracking Plan Updated</p>
          <p className="text-sm text-muted-foreground">Web Analytics - Version 1.2.0</p>
          <p className="text-xs text-muted-foreground">5 hours ago</p>
        </div>
      </div>
      <div className="flex items-center">
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">PR Created</p>
          <p className="text-sm text-muted-foreground">web-analytics - Implement tracking code</p>
          <p className="text-xs text-muted-foreground">Yesterday</p>
        </div>
      </div>
      <div className="flex items-center">
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Repository Added</p>
          <p className="text-sm text-muted-foreground">mobile-app</p>
          <p className="text-xs text-muted-foreground">2 days ago</p>
        </div>
      </div>
    </div>
  )
}
