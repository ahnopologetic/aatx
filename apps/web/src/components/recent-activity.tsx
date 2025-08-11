type ActivityItem = {
  title: string
  description?: string
  timeAgo?: string
}

const defaultItems: ActivityItem[] = [
  { title: "Repository Scan Completed", description: "web-analytics - 42 events detected", timeAgo: "2 hours ago" },
  { title: "Tracking Plan Updated", description: "Web Analytics - Version 1.2.0", timeAgo: "5 hours ago" },
  { title: "PR Created", description: "web-analytics - Implement tracking code", timeAgo: "Yesterday" },
  { title: "Repository Added", description: "mobile-app", timeAgo: "2 days ago" },
]

export function RecentActivity({ items }: { items?: ActivityItem[] }) {
  const list = items ?? defaultItems
  return (
    <div className="space-y-8">
      {list.map((item, idx) => (
        <div key={idx} className="flex items-center">
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{item.title}</p>
            {item.description ? (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            ) : null}
            {item.timeAgo ? (
              <p className="text-xs text-muted-foreground">{item.timeAgo}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
