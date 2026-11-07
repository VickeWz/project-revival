// Thin adapter so the imported screens keep their original navigation calls on TanStack Router.
import { forwardRef, useCallback, useMemo, type AnchorHTMLAttributes, type ReactNode } from "react";
import { useRouter, useLocation as useTsLocation } from "@tanstack/react-router";

type NavOpts = { replace?: boolean };

export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (to: string | number, opts?: NavOpts) => {
      if (typeof to === "number") {
        router.history.go(to);
        return;
      }
      router.navigate({ href: to, replace: opts?.replace });
    },
    [router],
  );
}

export function useLocation() {
  return useTsLocation();
}

export function useSearchParams(): [URLSearchParams] {
  const search = useTsLocation({ select: (l) => l.searchStr });
  const params = useMemo(() => new URLSearchParams(search), [search]);
  return [params];
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { to: string; replace?: boolean };

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(({ to, replace, onClick, ...rest }, ref) => {
  const navigate = useNavigate();
  return (
    <a
      ref={ref}
      href={to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to, { replace });
      }}
      {...rest}
    />
  );
});
Link.displayName = "Link";

type NavLinkProps = Omit<LinkProps, "className" | "children"> & {
  className?: string | ((s: { isActive: boolean; isPending: boolean }) => string);
  children?: ReactNode | ((s: { isActive: boolean; isPending: boolean }) => ReactNode);
};

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(({ to, className, children, ...rest }, ref) => {
  const pathname = useTsLocation({ select: (l) => l.pathname });
  const state = { isActive: pathname === to, isPending: false };
  return (
    <Link ref={ref} to={to} className={typeof className === "function" ? className(state) : className} {...rest}>
      {typeof children === "function" ? children(state) : children}
    </Link>
  );
});
NavLink.displayName = "NavLink";
