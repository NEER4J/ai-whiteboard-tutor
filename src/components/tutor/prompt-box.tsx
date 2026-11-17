"use client";

import * as React from "react";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  busy?: boolean;
  onStop?: () => void;
  disabled?: boolean;
  addon?: React.ReactNode;
  endAddon?: React.ReactNode;
  /** rendered above the text (e.g. attachment chips) */
  header?: React.ReactNode;
  /** allow sending with no text (e.g. when a file is attached) */
  allowEmpty?: boolean;
  /** visual size: 'lg' is the tall hero box on the home screen */
  size?: "md" | "lg";
  className?: string;
  autoFocus?: boolean;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
};

/** Chat input built on shadcn Input Group (AI Elements prompt-input pattern). */
export function PromptBox({
  value,
  onChange,
  onSubmit,
  placeholder,
  busy,
  onStop,
  disabled,
  addon,
  endAddon,
  header,
  allowEmpty,
  size = "md",
  className,
  autoFocus,
  textareaRef,
}: Props) {
  const canSend = (allowEmpty || value.trim().length > 1) && !busy && !disabled;
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSubmit();
      }}
    >
      {/* lg: a translucent halo around the box */}
      <div
        className={
          size === "lg"
            ? "rounded-[1.75rem] bg-foreground/[0.045] p-1.5"
            : undefined
        }
      >
        <InputGroup
          className={cn(
            // The send button is disabled while empty; don't let that fade the whole box.
            "rounded-2xl border-transparent bg-muted/70 shadow-[0_2px_8px_-3px_rgb(0_0_0/0.12)] has-disabled:bg-muted/70 has-disabled:opacity-100 dark:bg-muted/50 dark:has-disabled:bg-muted/50",
            size === "lg" &&
              "rounded-3xl border-border/80 bg-card shadow-[0_2px_10px_-4px_rgb(0_0_0/0.08)] has-disabled:bg-card dark:bg-card/70 dark:has-disabled:bg-card/70",
          )}
        >
          {header && (
            <InputGroupAddon
              align="block-start"
              className="flex-wrap gap-1.5 px-4 pt-3.5 pb-0"
            >
              {header}
            </InputGroupAddon>
          )}
          <InputGroupTextarea
            ref={textareaRef}
            value={value}
            autoFocus={autoFocus}
            maxLength={500}
            rows={1}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                if (canSend) onSubmit();
              }
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            className={cn(
              "max-h-40 px-4 pt-3.5 text-[15px] md:text-[15px]",
              size === "lg"
                ? "min-h-[4.5rem] px-5 pt-4 text-base md:text-base"
                : "min-h-12",
            )}
          />
          <InputGroupAddon
            align="block-end"
            className={cn("px-2.5 pb-2.5", size === "lg" && "px-3.5 pb-3.5")}
          >
            {addon}
            <div className="flex-1" />
            {endAddon}
            {busy && onStop ? (
              <InputGroupButton
                size="icon-sm"
                variant="secondary"
                className="rounded-full"
                aria-label="Stop"
                onClick={onStop}
              >
                <SquareIcon className="size-3 fill-current" />
              </InputGroupButton>
            ) : (
              <InputGroupButton
                type="submit"
                size="icon-sm"
                variant="default"
                className="rounded-full"
                disabled={!canSend}
                aria-label="Send"
              >
                <ArrowUpIcon />
              </InputGroupButton>
            )}
          </InputGroupAddon>
        </InputGroup>
      </div>
    </form>
  );
}
