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
  BarChart3,
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
  useSidebar,
} from "@/components/ui/sidebar";
import { appName } from "@/config";
import { useLocation, Link } from "react-router-dom";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
        { title: "Customer", url: "/members" },
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
          title: "Farmers",
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
          title: "Supervisors",
          url: "/admin/supervisors",
          icon: UsersRound,
          groupLabel: "Indraai",
        },
        {
          title: "Orders",
          url: "/admin/orders",
          icon: Briefcase,
          groupLabel: "Indraai",
        },
        // {
        //   title: "SNF Orders",
        //   url: "/admin/snf-orders",
        //   icon: FileText,
        //   groupLabel: "Indraai",
        // },
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
          title: "Customer",
          url: "/admin/members",
          icon: Briefcase,
          groupLabel: "Member",
        },
        // Reports section
        {
          title: "Purchase Order Report",
          url: "/admin/reports/purchase-orders",
          icon: BarChart3,
          groupLabel: "Reports",
        },
        {
          title: "Delivery Agency Report",
          url: "/admin/reports/delivery-agencies",
          icon: BarChart3,
          groupLabel: "Reports",
        },
        {
          title: "Delivery Summaries",
          url: "/admin/reports/delivery-summaries",
          icon: BarChart3,
          groupLabel: "Reports",
        },
        {
          title: "Subscription Reports",
          url: "/admin/reports/subscriptions",
          icon: BarChart3,
          groupLabel: "Reports",
        },
        {
          title: "Sale Register",
          url: "/admin/reports/sale-register",
          icon: BarChart3,
          groupLabel: "Reports",
        },
        {
          title: "Revenue Report",
          url: "/admin/reports/revenue",
          icon: BarChart3,
          groupLabel: "Reports",
        },
        {
          title: "Exception Report",
          url: "/admin/reports/exceptions",
          icon: BarChart3,
          groupLabel: "Reports",
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
          items: [{ title: "Farmer", url: "/admin/vendors", icon: Briefcase }],
        },
        {
          title: "Reports",
          url: "#",
          icon: BarChart3,
          groupLabel: "Reports",
          isActive: false,
          items: [
            { title: "Purchase Order Report", url: "/admin/reports/purchase-orders" },
            { title: "Delivery Summaries", url: "/admin/reports/delivery-summaries" },
            { title: "Sale Register", url: "/admin/reports/sale-register" },
            { title: "Revenue Report", url: "/admin/reports/revenue" },
            { title: "Exception Report", url: "/admin/reports/exceptions" },
          ],
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
          groupLabel: "Farmer Portal",
        },
        {
          title: "Purchase Order Report",
          url: "/admin/reports/purchase-orders",
          icon: BarChart3,
          groupLabel: "Reports",
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
        {
          title: "Delivery Agency Report",
          url: "/admin/reports/delivery-agencies",
          icon: BarChart3,
          groupLabel: "Reports",
        },
        {
          title: "Delivery Summaries",
          url: "/admin/reports/delivery-summaries",
          icon: BarChart3,
          groupLabel: "Reports",
        },
      ],
      navMain: [] as any[],
    },
    SUPERVISOR: {
      projects: [
        {
          title: "Orders",
          url: "/admin/orders",
          icon: FileText,
          groupLabel: "Supervisor Portal",
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
  const { state, isMobile } = useSidebar();
  const showCollapsedTooltips = state === "collapsed" && !isMobile;
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
    <Sidebar
      collapsible="icon"
      {...props}
      className="bg-[#1d398d] border-r border-[#1d398d]/80"
    >
      <SidebarHeader className="border-b border-[#1d398d]/30 bg-[#1d398d]">
        <SidebarMenu className="flex">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip={appName}
              className="data-[slot=sidebar-menu-button]:!p-2 hover:bg-white/10 transition-colors rounded-lg"
            >
              <div className="flex items-center gap-2 justify-between">
                <Link to="/admin/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                  <ArrowUpCircleIcon className="h-5 w-5 text-white" />
                  <span className="text-sm font-medium text-white group-data-[collapsible=icon]:hidden">
                    {appName}
                  </span>
                </Link>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="space-y-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-[#1d398d]">
        {data.isOB && (
          <div className="mb-4 group-data-[collapsible=icon]:hidden">
            <div className="px-3 py-2 text-xs font-medium text-blue-200 border-b border-[#1d398d]/30 mb-2 group-data-[collapsible=icon]:hidden">
              Office Bearer Menu
            </div>
            {data.obNav.map((navGroup) => (
              <div key={navGroup.title} className="mb-3">
                <div className="px-3 py-2 text-sm font-medium text-blue-200 flex items-center gap-2">
                  <navGroup.icon className="h-4 w-4 text-blue-300" />
                  <span className="group-data-[collapsible=icon]:hidden">{navGroup.title}</span>
                </div>
                <div className="ml-6">
                  {navGroup.items?.map((item) => (
                    <Link
                      key={item.url}
                      to={item.url}
                      className={cn(
                        "block w-full px-3 py-2 text-sm transition-colors",
                        pathname === item.url
                          ? "bg-white text-[#1d398d] rounded-md font-medium shadow-sm"
                          : "text-blue-100 hover:bg-white/15 hover:text-white rounded-md"
                      )}
                    >
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grouped navigation items */}
        <div className="space-y-2">
          {Object.entries(groupedItems).map(([groupLabel, items]) => (
            <div key={groupLabel} className="mb-2">
              <Collapsible
                open={openGroups[groupLabel]}
                onOpenChange={() => toggleGroup(groupLabel)}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CollapsibleTrigger className="w-full">
                      <div className="px-3 py-2 flex items-center justify-between text-sm font-medium text-blue-200 hover:bg-white/10 cursor-pointer transition-colors rounded-md group-data-[collapsible=icon]:justify-center">
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={`h-4 w-4 transition-transform text-blue-300 ${
                              openGroups[groupLabel] ? "rotate-0" : "-rotate-90"
                            }`}
                          />
                          <span className="group-data-[collapsible=icon]:hidden">{groupLabel}</span>
                        </div>
                        <span className="text-xs text-blue-100 bg-white/20 px-2 py-1 rounded-full font-medium group-data-[collapsible=icon]:hidden">
                          {items.length}
                        </span>
                      </div>
                    </CollapsibleTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" hidden={!showCollapsedTooltips}>
                    {groupLabel}
                  </TooltipContent>
                </Tooltip>
                <CollapsibleContent>
                  <div className="ml-6 mt-1 group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:px-1">
                    {items.map((item) => (
                      <Tooltip key={item.url}>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.url}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 text-sm transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-2",
                              pathname === item.url
                                ? "bg-white text-[#1d398d] rounded-md font-medium shadow-sm"
                                : "text-blue-100 hover:bg-white/15 hover:text-white rounded-md"
                            )}
                          >
                            {item.icon && (
                              <item.icon
                                className={cn(
                                  "h-4 w-4 flex-shrink-0 group-data-[collapsible=icon]:mx-auto",
                                  pathname === item.url
                                    ? "text-[#1d398d]"
                                    : "text-blue-200"
                                )}
                              />
                            )}
                            <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center" hidden={!showCollapsedTooltips}>
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
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
            <div className="px-3 py-2 text-xs font-medium text-blue-200 border-b border-[#1d398d]/30 mt-4 mb-2 group-data-[collapsible=icon]:hidden">
              Management
            </div>
            {data.navMain.map((item) => (
              <Tooltip key={item.url}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.url}
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2",
                      pathname === item.url
                        ? "bg-white text-[#1d398d] rounded-md font-medium shadow-sm"
                        : "text-blue-100 hover:bg-white/15 hover:text-white rounded-md"
                    )}
                  >
                    {item.icon && (
                      <item.icon
                        className={cn(
                          "h-4 w-4",
                          pathname === item.url ? "text-[#1d398d]" : "text-blue-200"
                        )}
                      />
                    )}
                    <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" align="center" hidden={!showCollapsedTooltips}>
                  {item.title}
                </TooltipContent>
              </Tooltip>
            ))}
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-[#1d398d]/30 bg-[#1d398d]">
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
