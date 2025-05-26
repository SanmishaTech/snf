"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
  groupLabel = "Navigation",  // Default section label that can be overridden
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    groupLabel?: string;  // Label to group items under
    items?: {
      title: string;
      url: string;
      icon?: LucideIcon;
    }[];
    isSingleLink?: boolean;  // Property to force item as a single link
  }[];
  groupLabel?: string;  // Section label for all items if not grouped
}) {
  // Filter out empty items array
  const validItems = items.filter(item => item && typeof item === 'object');
  
  // Track unique group labels while preserving original order
  const groupLabels: string[] = [];
  const groupedItems: Record<string, typeof validItems> = {};
  
  // First pass: identify all unique group labels in the order they appear
  validItems.forEach(item => {
    const itemGroupLabel = item.groupLabel || groupLabel;
    if (!groupLabels.includes(itemGroupLabel)) {
      groupLabels.push(itemGroupLabel);
      groupedItems[itemGroupLabel] = [];
    }
  });
  
  // Second pass: add items to their groups
  validItems.forEach(item => {
    const itemGroupLabel = item.groupLabel || groupLabel;
    groupedItems[itemGroupLabel].push(item);
  });
  
  return (
    <>
      {groupLabels.map(currentGroupLabel => (
        groupedItems[currentGroupLabel].length > 0 && (
          <SidebarGroup key={currentGroupLabel}>
            <SidebarGroupLabel>{currentGroupLabel}</SidebarGroupLabel>
            <SidebarMenu>
              {groupedItems[currentGroupLabel].map((item) => {
                // Check if this should be a single link
                // Either explicitly marked as single link or has no sub-items
                const isSingleLink = item.isSingleLink || (!item.items || item.items.length === 0);
                
                // For single links without sub-items
                if (isSingleLink && item.url !== "#") {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        tooltip={item.title}
                      >
                        <Link to={item.url}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                
                // For accordion groups with sub-items
                return (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={item.isActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          className="cursor-pointer"
                        >
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild>
                                <Link to={subItem.url}>
                                  {subItem.icon && <subItem.icon />}
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )
      ))}
    </>
  );
}
