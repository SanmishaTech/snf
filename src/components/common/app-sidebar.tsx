import * as React from "react";
import {
  ArrowUpCircleIcon,
  AudioWaveform,
  BookOpen,
  Command,
  UsersRound,
  GalleryVerticalEnd,
  SquareTerminal,
  FileText,
  Briefcase,
  ChevronDown,
} from "lucide-react";


import { NavUser } from "@/components/common/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { appName } from "@/config";
import { useLocation } from "react-router-dom";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// This is sample data.
const initialData = {
  // Navigation items for Office Bearers (OB)
  obNavigation: [
    {
      title: "Office Bearers",
      url: "#",
      icon: UsersRound,
      isActive: false,
      items: [
        { title: "Chapter Performance", url: "/chapter-performance" },
        { title: "Members", url: "/members" },
        { title: "Visitors", url: "/chapter-visitors" },
        { title: "Meetings", url: "/chaptermeetings" },
      ],
    },
  ],
  roles: {
    super_admin: {
      projects: [
        //master
        {
          title: "Transfers",
          url: "/admin/transfers",
          icon: FileText,
          groupLabel: "Master",
        },
        {
          title: "Purchases",
          url: "/admin/purchases",
          icon: FileText,
          groupLabel: "Master",
        },
        {
          title: "Depot Varients",
          url: "/admin/depot-variants",
          icon: FileText,
          groupLabel: "Master",
        },
        {
          title: "Variant Stock",
          url: "/admin/variantstock",
          icon: FileText,
          groupLabel: "Master",
        },
        {
          title: "Wastage",
          url: "/admin/wastages",
          icon: FileText,
          groupLabel: "Master",
        },
        {
          title: "Areas",
          url: "/admin/areamasters",
          icon: FileText,
          groupLabel: "Master",
        },

        {
          title: "Depots",
          url: "/admin/depots",
          icon: FileText,
          groupLabel: "Master",
        },
        {
          title: "Vendors",
          url: "/admin/vendors",
          icon: Briefcase,
          groupLabel: "Master",
        },
        {
          title: "Banners",
          url: "/admin/banners",
          icon: GalleryVerticalEnd,
          groupLabel: "Master",
        },
        {
          title: "Purchase Payments",
          url: "/admin/purchase-payments",
          icon: FileText,
          groupLabel: "Master",
        },
        //products
        {
          title: "Categories",
          url: "/admin/categories",
          icon: FileText,
          groupLabel: "Products",
        },
        {
          title: "Cities",
          url: "/admin/cities",
          icon: FileText,
          groupLabel: "Master",
        },
        {
          title: "Locations",
          url: "/admin/locations",
          icon: FileText,
          groupLabel: "Master",
        },
        {
          title: "Products",
          url: "/admin/products",
          icon: Briefcase,
          groupLabel: "Products",
        },
        //indraai
        {
          title: "Delivery Agencies",
          url: "/admin/agencies",
          icon: Briefcase,
          groupLabel: "Indraai",
        },
        {
          title: "Orders",
          url: "/admin/orders",
          icon: Briefcase,
          groupLabel: "Indraai",
        },
        {
          title: "Subscriptions",
          url: "/admin/subscriptions",
          icon: Briefcase,
          groupLabel: "Indraai",
        },
        {
          title: "Delivery",
          url: "/admin/delivery",
          icon: FileText,
          groupLabel: "Indraai",
        },

        {
          title: "Members",
          url: "/admin/members",
          icon: Briefcase,
          groupLabel: "Member",
        },
        {
          title: "Users",
          url: "/admin/users",
          icon: Briefcase,
          groupLabel: "System",
        },
      ],
      navMain: [],
    },
    admin: {
      projects: [
        {
          title: "Master",
          url: "#",
          icon: SquareTerminal,
          groupLabel: "Master",
          isActive: false,
          items: [{ title: "Vendors", url: "/admin/vendors", icon: Briefcase }],
        },
      ],
      navMain: [] as any[],
    },
    member: {
      projects: [
        {
          title: "References",
          url: "/references",
          icon: BookOpen,
          groupLabel: "References",
          isActive: false,
          items: [],
        },
        {
          title: "Done Deals",
          url: "/member/done-deal",
          icon: FileText,
          groupLabel: "Done Deals",
          isActive: false,
          items: [],
        },
        {
          title: "One To Ones",
          url: "/member/one-to-ones",
          groupLabel: "One To Ones",
          icon: BookOpen,
          isActive: false,
          items: [],
        },
        {
          title: "Requirements",
          url: "/member/requirements",
          icon: BookOpen,
          groupLabel: "Requirements",
          isActive: false,
          items: [
            { title: "Requirements", url: "/member/requirements" },
            { title: "View Requirements", url: "/member/viewrequirements" },
          ],
        },
      ],
      navMain: [] as any[],
    },
    VENDOR: {
      projects: [
        {
          title: "Orders",
          url: "/admin/orders",
          icon: FileText,
          groupLabel: "Vendor Portal",
        },
      ],
      navMain: [] as any[],
    },
    DepotAdmin: {
      projects: [
        {
          title: "Purchases",
          url: "/admin/purchases",
          icon: FileText,
          groupLabel: "Depot",
        },
        {
          title: "Wastage",
          url: "/admin/wastages",
          icon: FileText,
          groupLabel: "Depot",
        },
        {
          title: "Depot Variants",
          url: "/admin/depot-variants",
          icon: FileText,
          groupLabel: "Depot",
        },
        {
          title: "Transfers",
          url: "/admin/transfers",
          icon: FileText,
          groupLabel: "Depot",
        },
      ],    
      navMain: [] as any[],
    },
    AGENCY: {
      projects: [
        {
          title: "Orders",
          url: "/admin/orders",
          icon: FileText,
          groupLabel: "Agency Portal",
        },
        {
          title: "Delivery",
          url: "/admin/delivery",
          icon: FileText,
          groupLabel: "Agency Portal",
        },
      ],
      navMain: [] as any[],
    },
  },
  user: {
    name: "",
    email: "",
    avatar: "",
    avatarName: "",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
};

interface AppSidebarProps {}

export function AppSidebar(props: AppSidebarProps) {
  const { pathname } = useLocation();
  const [data, setData] = React.useState({
    ...initialData,
    projects: [] as typeof initialData.roles.super_admin.projects,
    navMain: [] as any[],
    obNav: [] as typeof initialData.obNavigation,
    isOB: false,
  });

  // State to track open/closed groups
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
    {}
  );

  React.useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedRoles = localStorage.getItem("roles");
    let isUserOB = false;

    if (
      storedRoles &&
      storedRoles !== "undefined" &&
      storedRoles.trim() !== ""
    ) {
      try {
        const parsedRoles = JSON.parse(storedRoles);
        if (Array.isArray(parsedRoles)) {
          isUserOB = parsedRoles.some(
            (roleObj: { role: string; chapters: number[] }) =>
              roleObj.role === "OB" &&
              roleObj.chapters &&
              roleObj.chapters.length > 0
          );
        }
      } catch (error) {
        console.error("Failed to parse roles from localStorage", error);
        localStorage.removeItem("roles");
      }
    }

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.avatarName = parsedUser.name?.charAt(0).toUpperCase() || "U";

        let role =
          (parsedUser.role as keyof typeof initialData.roles) || "admin";

        if (!initialData.roles[role]) {
          role = "super_admin";
        }

        const roleData = initialData.roles[role];

        setData((prevData) => ({
          ...prevData,
          projects: roleData?.projects || [],
          navMain: roleData?.navMain || [],
          user: parsedUser,
          obNav: isUserOB ? initialData.obNavigation : [],
          isOB: isUserOB,
        }));

        // Initialize all groups as open by default
        const groups = [
          ...new Set(roleData?.projects.map((p) => p.groupLabel)),
        ];
        const initialOpenState = groups.reduce((acc, group) => {
          acc[group] = true;
          return acc;
        }, {} as Record<string, boolean>);
        setOpenGroups(initialOpenState);
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        setData((prevData) => ({
          ...prevData,
          projects: initialData.roles.super_admin.projects,
          navMain: initialData.roles.super_admin.navMain,
          obNav: [],
          isOB: false,
        }));
      }
    } else {
      setData((prevData) => ({
        ...prevData,
        projects: initialData.roles.super_admin.projects,
        navMain: initialData.roles.super_admin.navMain,
        obNav: [],
        isOB: false,
      }));
    }
  }, []);

  // Toggle group open/closed state
  const toggleGroup = (groupLabel: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  };

  // Group items by groupLabel
  const groupedItems = data.projects.reduce((groups, item) => {
    const group = item.groupLabel || "Other";
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
    return groups;
  }, {} as Record<string, typeof data.projects>);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu className="flex">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5 hover:bg-gray-500"
            >
              <div className="flex items-center gap-2 justify-between">
                <a href="/" className="flex items-center gap-2">
                  <ArrowUpCircleIcon className="h-5 w-5 hover:text-gray-200" />
                  <span className="text-base font-semibold text-gray-200">
                    {appName}
                  </span>
                </a>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="space-y-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {data.isOB && (
          <div className="mb-4">
            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Office Bearer Menu
            </div>
            {data.obNav.map((navGroup) => (
              <div key={navGroup.title} className="mb-2">
                <div className="px-4 py-2 text-sm font-medium  flex items-center gap-2">
                  <navGroup.icon className="h-4 w-4 " />
                  {navGroup.title}
                </div>
                <div className="ml-2 border-l border-gray-200 pl-3">
                  {navGroup.items?.map((item) => (
                    <a
                      key={item.url}
                      href={item.url}
                      className={cn(
                        "block w-full px-3 py-2 text-sm rounded transition-colors",
                        pathname === item.url
                          ? "bg-primary text-primary-foreground"
                          : "text-gray-700 hover:bg-gray-600"
                      )}
                    >
                      {item.title}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grouped navigation items */}
        <div className="space-y-4">
          {Object.entries(groupedItems).map(([groupLabel, items]) => (
            <div key={groupLabel} className="mb-2">
              <Collapsible
                open={openGroups[groupLabel]}
                onOpenChange={() => toggleGroup(groupLabel)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="px-4 py-2 flex items-center justify-between text-sm font-medium  hover:bg-gray-600 rounded cursor-pointer transition-colors">
                    <div className="flex items-center gap-2">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          openGroups[groupLabel] ? "rotate-0" : "-rotate-90"
                        }`}
                      />
                      <span>{groupLabel}</span>
                    </div>
                    {/* <span className="text-xs  text-gray-700 bg-white px-2 py-1 rounded-full">
                      {items.length}
                    </span> */}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-2 border-l border-gray-200 pl-3 mt-1">
                    {items.map((item) => (
                      <a
                        key={item.url}
                        href={item.url}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors",
                          pathname === item.url
                            ? "bg-primary text-primary-foreground"
                            : "text-gray-500 hover:bg-[#3F5BA9] hover:text-white"
                        )}
                      >
                        {item.icon && (
                          <item.icon
                            className={cn(
                              "h-4 w-4 flex-shrink-0 hover:text-white",
                              pathname === item.url
                                ? "text-primary-foreground hover:text-white"
                                : "text-gray-500 hover:text-white"
                            )}
                          />
                        )}
                        <span>{item.title}</span>
                      </a>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
        </div>

        {/* Additional navigation groups */}
        {data.navMain.length > 0 && (
          <>
            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 mt-6">
              Management
            </div>
            {data.navMain.map((item) => (
              <a
                key={item.url}
                href={item.url}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-2 text-sm rounded transition-colors",
                  pathname === item.url
                    ? "bg-primary text-primary-foreground hover:text-white"
                    : "text-gray-700 hover:bg-[#3F5BA9] hover:text-white"
                )}
              >
                {item.icon && (
                  <item.icon
                    className={cn(
                      "h-4 w-4 hover:text-white",
                      pathname === item.url
                        ? "text-primary-foreground hover:text-white"
                        : "text-gray-500 hover:text-white"
                    )}
                  />
                )}
                <span>{item.title}</span>
              </a>
            ))}
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-gray-200">
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
