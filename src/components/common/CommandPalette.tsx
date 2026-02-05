import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

type CommandLink = {
  group: string;
  title: string;
  href: string;
  keywords?: string;
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      const isCmdK = (e.ctrlKey || e.metaKey) && isK;
      if (!isCmdK) return;

      const target = e.target as HTMLElement | null;
      const tag = (target?.tagName || "").toLowerCase();
      const isTypingTarget =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable;

      if (isTypingTarget) return;

      e.preventDefault();
      setOpen((prev) => !prev);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const links = useMemo<CommandLink[]>(
    () => [
      { group: "Indraai", title: "Orders", href: "/admin/orders", keywords: "order" },
      { group: "Indraai", title: "Subscriptions", href: "/admin/subscriptions", keywords: "subscription" },
      { group: "Indraai", title: "Delivery", href: "/admin/delivery", keywords: "deliveries" },

      { group: "Member", title: "Customer", href: "/admin/members", keywords: "member members customers" },

      { group: "Master", title: "Transfers", href: "/admin/transfers" },
      { group: "Master", title: "Purchases", href: "/admin/purchases" },
      { group: "Master", title: "Depot Varients", href: "/admin/depot-variants", keywords: "depot variants" },
      { group: "Master", title: "Variant Stock", href: "/admin/variantstock" },
      { group: "Master", title: "Wastage", href: "/admin/wastages" },
      { group: "Master", title: "Areas", href: "/admin/areamasters", keywords: "area masters" },
      { group: "Master", title: "Depots", href: "/admin/depots" },
      { group: "Master", title: "Farmers", href: "/admin/vendors", keywords: "vendor vendors farmers" },
      { group: "Master", title: "Banners", href: "/admin/banners" },
      { group: "Master", title: "Purchase Payments", href: "/admin/purchase-payments" },
      { group: "Products", title: "Categories", href: "/admin/categories" },
      { group: "Master", title: "Cities", href: "/admin/cities" },
      { group: "Master", title: "Locations", href: "/admin/locations" },
      { group: "Products", title: "Products", href: "/admin/products" },
      { group: "Indraai", title: "Delivery Agencies", href: "/admin/agencies", keywords: "agency agencies" },
      { group: "Indraai", title: "Supervisors", href: "/admin/supervisors", keywords: "supervisor supervisors" },

      { group: "Reports", title: "Purchase Order Report", href: "/admin/reports/purchase-orders" },
      { group: "Reports", title: "Delivery Agency Report", href: "/admin/reports/delivery-agencies" },
      { group: "Reports", title: "Delivery Summaries", href: "/admin/reports/delivery-summaries" },
      { group: "Reports", title: "Subscription Reports", href: "/admin/reports/subscriptions" },
      { group: "Reports", title: "Sale Register", href: "/admin/reports/sale-register" },
      { group: "Reports", title: "Revenue Report", href: "/admin/reports/revenue" },
      { group: "Reports", title: "Wallet Report", href: "/admin/reports/wallet" },
      { group: "Reports", title: "Exception Report", href: "/admin/reports/exceptions" },

      { group: "System", title: "Users", href: "/admin/users", keywords: "user users" },
    ],
    []
  );

  const grouped = useMemo(() => {
    const map = new Map<string, CommandLink[]>();
    links.forEach((l) => {
      const arr = map.get(l.group) || [];
      arr.push(l);
      map.set(l.group, arr);
    });
    return Array.from(map.entries());
  }, [links]);

  const onSelect = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {grouped.map(([group, items], groupIdx) => (
          <div key={group}>
            <CommandGroup heading={group}>
              {items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${item.title} ${item.href} ${item.keywords || ""}`}
                  onSelect={() => onSelect(item.href)}
                >
                  <span>{item.title}</span>
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            {groupIdx < grouped.length - 1 ? <CommandSeparator /> : null}
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
