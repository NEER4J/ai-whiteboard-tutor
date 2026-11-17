"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type Props = React.ComponentProps<typeof Button> & { label: string; shortcut?: string }

/** Ghost icon button with an accessible label and a tooltip. */
export function IconButton({ label, shortcut, children, variant = "ghost", size = "icon-sm", ...props }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant={variant} size={size} aria-label={label} {...props} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}
