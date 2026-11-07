import { forwardRef, type ReactNode } from "react";
import { NavLink as RouterNavLink } from "@/lib/router-compat";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps {
  to: string;
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  children?: ReactNode | ((props: { isActive: boolean; isPending: boolean }) => ReactNode);
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, children, ...props }, ref) => (
    <RouterNavLink
      ref={ref}
      to={to}
      className={({ isActive, isPending }) => cn(className, isActive && activeClassName, isPending && pendingClassName)}
      {...props}
    >
      {children}
    </RouterNavLink>
  ),
);
NavLink.displayName = "NavLink";

export { NavLink };
