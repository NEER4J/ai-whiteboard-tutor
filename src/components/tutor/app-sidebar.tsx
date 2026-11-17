"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import {
  BookOpenIcon,
  MessageSquareIcon,
  MonitorIcon,
  MoonIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  SunIcon,
  Trash2Icon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { clearSessions, deleteSession, groupByDay, useSessionList } from "@/lib/sessions"
import { Credit } from "./credit"
import { Logo } from "./logo"

type Status = { mode: "live" | "sample"; model: string | null } | null

type Props = {
  activeId: string | null
  status: Status
  onNew: () => void
  onOpen: (id: string) => void
}

export function AppSidebar({ activeId, status, onNew, onOpen }: Props) {
  const sessions = useSessionList()
  const [query, setQuery] = React.useState("")
  const { isMobile, setOpenMobile } = useSidebar()
  const { theme, setTheme } = useTheme()

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? sessions.filter((s) => s.title.toLowerCase().includes(q)) : sessions
  }, [sessions, query])
  const groups = React.useMemo(() => groupByDay(filtered), [filtered])

  const closeOnMobile = () => isMobile && setOpenMobile(false)

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader className="gap-3 px-3 pt-4">
        <button
          type="button"
          onClick={() => {
            onNew()
            closeOnMobile()
          }}
          className="flex items-center gap-2.5 rounded-lg px-1 text-left font-semibold tracking-tight"
          aria-label="Chalk home"
        >
          <Logo />
          Chalk
        </button>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeId === null}
              onClick={() => {
                onNew()
                closeOnMobile()
              }}
            >
              <PlusIcon />
              <span>New lesson</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lessons"
            aria-label="Search lessons"
            className="h-8 border-transparent bg-background/60 pl-8 shadow-none"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
            <BookOpenIcon className="size-5 opacity-60" />
            {sessions.length === 0 ? "Your lessons will show up here." : "No lessons match your search."}
          </div>
        ) : (
          groups.map((g) => (
            <SidebarGroup key={g.label} className="py-1">
              <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {g.items.map((s) => (
                    <SidebarMenuItem key={s.id}>
                      <SidebarMenuButton
                        isActive={s.id === activeId}
                        onClick={() => {
                          onOpen(s.id)
                          closeOnMobile()
                        }}
                        title={s.title}
                      >
                        <MessageSquareIcon className="opacity-60" />
                        <span className="truncate">{s.title}</span>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<SidebarMenuAction showOnHover aria-label={`Options for ${s.title}`} />}>
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start">
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              deleteSession(s.id)
                              if (s.id === activeId) onNew()
                            }}
                          >
                            <Trash2Icon /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      <SidebarFooter className="gap-2 px-3 pb-3">
        {/* Settings first, then a compact info card */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton />}>
                {theme === "dark" ? <MoonIcon /> : theme === "light" ? <SunIcon /> : <MonitorIcon />}
                <span>Appearance</span>
                <Badge variant="secondary" className="ml-auto font-normal capitalize">
                  {theme ?? "system"}
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Theme</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(v) => setTheme(String(v))}>
                    <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
                {sessions.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        clearSessions()
                        onNew()
                      }}
                    >
                      <Trash2Icon /> Clear all lessons
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="rounded-xl bg-sidebar-accent/60 px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <span className={status?.mode === "live" ? "size-1.5 rounded-full bg-emerald-500" : "size-1.5 rounded-full bg-amber-500"} />
            {!status ? "Checking…" : status.mode === "live" ? `Live AI · ${status.model?.split("/")[1] ?? ""}` : "Sample mode"}
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {status?.mode === "sample" ? "No AI key is set, so lessons are pre-written. " : ""}
            Your lessons are saved only in this browser.
          </p>
        </div>
        <Credit className="-ml-1 self-start" />
      </SidebarFooter>
    </Sidebar>
  )
}
