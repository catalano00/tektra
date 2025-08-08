import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className = "", ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={[
      "inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-slate-100 p-1 text-slate-600",
      className,
    ].join(" ")}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className = "", ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={[
      "inline-flex min-w-[96px] items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium",
      "data-[state=active]:bg-white data-[state=active]:text-slate-900",
      "data-[state=inactive]:opacity-70",
      "focus:outline-none focus:ring-2 focus:ring-emerald-500/60",
      className,
    ].join(" ")}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className = "", ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={["mt-3 focus:outline-none", className].join(" ")}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";