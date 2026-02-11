import { Link as ViewTransitionLink } from "next-view-transitions";
import { forwardRef } from "react";

type LinkProps = React.ComponentProps<typeof ViewTransitionLink>;

export const Link = forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => {
  return <ViewTransitionLink {...props} ref={ref} />;
});

Link.displayName = "Link";
