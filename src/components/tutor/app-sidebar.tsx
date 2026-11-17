"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import {
  BookOpenIcon,
  MessageSquareIcon,
  KeyRoundIcon,
  MonitorIcon,
  MoonIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
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
import { GITHUB_URL } from "@/lib/site"
import { clearSessions, deleteSession, groupByDay, useSessionList } from "@/lib/sessions"
import { Credit } from "./credit"
import { GithubMark } from "./github-icon"
import { UsageCard } from "./usage-card"
import { Logo } from "./logo"

export type Quota = { prompts: { used: number; limit: number } }
export type AppStatus = { mode: "live" | "sample"; model: string | null; voice?: string | null; quota?: Quota | null } | null
type Status = AppStatus

type Props = {
  activeId: string | null
  status: Status
  userKey: string | null
  onManageKey: () => void
  onNew: () => void
  onOpen: (id: string) => void
}

export function AppSidebar({ activeId, status, userKey, onManageKey, onNew, onOpen }: Props) {
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

      <SidebarFooter className="gap-2.5 px-3 pb-3">
        {/* 1. Usage and key: the one thing visitors need to watch */}
        <UsageCard status={status} userKey={userKey} onManageKey={onManageKey} />

        {/* 2. One compact row of buttons: docs, source, settings */}
        <div className="flex items-center gap-1.5">
          <a
            href="/docs"
            target="_blank"
            rel="noopener"
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-sidebar-accent/60 text-xs font-medium transition-colors hover:bg-sidebar-accent"
          >
            <BookOpenIcon className="size-3.5" /> Docs
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-sidebar-accent/60 text-xs font-medium transition-colors hover:bg-sidebar-accent"
          >
            <GithubMark className="size-3.5" /> GitHub
          </a>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Settings"
                  title="Settings"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent/60 transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                />
              }
            >
              <SettingsIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(v) => setTheme(String(v))}>
                  <DropdownMenuRadioItem value="light">
                    <SunIcon /> Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <MoonIcon /> Dark
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <MonitorIcon /> System
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onManageKey}>
                <KeyRoundIcon /> {userKey ? "Manage your API key" : "Use your own API key"}
              </DropdownMenuItem>
              {sessions.length > 0 && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    clearSessions()
                    onNew()
                  }}
                >
                  <Trash2Icon /> Clear all lessons
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 3. Credit */}
        <Credit className="self-center" />
      </SidebarFooter>
    </Sidebar>
  )
}
