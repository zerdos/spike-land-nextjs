import { Link as ViewTransitionLink } from "next-view-transitions";

type LinkProps = React.ComponentProps<typeof ViewTransitionLink>;

export function Link(props: LinkProps) {
  return <ViewTransitionLink {...props} />;
}
