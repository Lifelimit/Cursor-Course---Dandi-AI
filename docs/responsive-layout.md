# Responsive Dashboard Layout

Dandi dashboard pages should use the shared dashboard shell instead of per-page layout wrappers.

## DashboardShell

Use `DashboardShell` for authenticated dashboard routes with the sidebar:

```tsx
<DashboardShell
  sidebar={{
    totalUsage,
    plan,
    limit,
    isUnlimited,
    alerts,
    onUpdate,
  }}
>
  {pageContent}
</DashboardShell>
```

The shell owns:

- Page background and text selection colors.
- `max-w-screen-2xl` centered layout.
- Responsive outer padding: `p-4 sm:p-6 md:py-12`.
- Mobile-first stacked layout and `md:flex-row` desktop layout.
- Standard `gap-6 md:gap-8`.
- Sidebar placement.
- Main content width and overflow guard: `w-full min-w-0 flex-1 space-y-8`.

Avoid custom per-page dashboard shells unless a route truly needs a different product surface.

## DashboardPageHeader

Use `DashboardPageHeader` for dashboard page titles:

```tsx
<DashboardPageHeader
  eyebrow="Account / Financials"
  title="Billing"
  description="Manage subscription plans, invoices, and payment methods."
  rightAction={action}
>
  {tabs}
</DashboardPageHeader>
```

Header expectations:

- Title uses `text-4xl sm:text-5xl`; do not force `text-5xl` on mobile.
- Card uses `rounded-[28px] md:rounded-[32px]`.
- Card padding uses `p-5 sm:p-8`.
- Header actions should wrap instead of forcing one row.
- Tabs and wide controls should use internal `overflow-x-auto`.

## Breakpoint Expectations

- At `320`, `375`, `390`, and `430`, the sidebar mobile header should show the logo, current page name, and menu button.
- Mobile sidebar labels should use compact names when the desktop label is long, for example `API Playground` renders as `Playground`.
- At `768` and above, the shell switches to sidebar plus content columns.
- Page content inside the shell should not introduce additional fixed-width side columns at `md` unless the content still fits beside the sidebar. Prefer `lg`/`xl` for secondary panels such as Playground snippets and result sidebars.
- At `1024` and `1440`, content should remain inside the `max-w-screen-2xl` shell.
- Tables should scroll inside their own card, never the full page.
- Payment, wallet, modal, and header action groups should stack or wrap on mobile.
- Code snippets, JSON viewers, terminal logs, and docs tables should use internal `overflow-x-auto`.

## Manual QA Checklist

Run these routes at widths `320`, `375`, `390`, `425`, `430`, `768`, `1024`, `1280`, and `1440`:

- `/dashboards`
- `/usage`
- `/billing`
- `/account`
- `/docs`
- `/playground`

Verify at each width:

- No horizontal page scroll.
- Page title is visible.
- Sidebar/mobile nav spacing and current page label are consistent.
- Content cards fit the viewport.
- Modals fit within the viewport and scroll internally when needed.
- Tab bars scroll internally when needed.
- Billing wallet/payment sections stack predictably.
- Invoice and API-key tables use internal horizontal scrolling.

No Playwright responsive smoke setup exists in `package.json` today, so this checklist is the current layout QA source of truth.
