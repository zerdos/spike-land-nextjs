import * as React from "react";

import { cn } from "@/lib/utils";

const Code = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => {
    return (
      <code
        ref={ref}
        className={cn(
          "relative rounded bg-black/30 px-[0.3rem] py-[0.2rem] font-mono text-sm font-medium text-aurora-green border border-white/10 shadow-sm",
          className,
        )}
        {...props}
      />
    );
  },
);
Code.displayName = "Code";

export { Code };
