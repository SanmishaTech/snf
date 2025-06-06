import * as React from "react";
import {
  ArrowUpCircleIcon,
  AudioWaveform,
  BookOpen,
  Command,
  UsersRound,
  GalleryVerticalEnd,
  PieChart,
  SquareTerminal,
  FileText,
  Briefcase,
} from "lucide-react";

import { NavMain } from "@/components/common/nav-main";
import { NavUser } from "@/components/common/nav-user";
import { Search } from "lucide-react";
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
         { title: "Vendors", url: "/admin/vendors", icon: Briefcase, groupLabel: "Services" },
        { title: "Agency", url: "/admin/agencies", icon: Briefcase, groupLabel: "Services" },
         { title: "Products", url: "/admin/products", icon: Briefcase, groupLabel: "Services" },
         { title: "Orders", url: "/admin/orders", icon: Briefcase, groupLabel: "Services" },
         { title: "Subscriptions", url: "/admin/subscriptions", icon: Briefcase, groupLabel: "Services" },
         { title: "Delivery", url: "/admin/delivery", icon: FileText, groupLabel: "Services" },
         { title: "Wallet", url: "/admin/wallet", icon: FileText, groupLabel: "Services" },

         { title: "Users", url: "/admin/users", icon: Briefcase, groupLabel: "Master" },

      ],
      navMain: [
        
      ],
    },
    admin: {
      projects: [
        {
          title: "Master",
          url: "#",
          icon: SquareTerminal,
          groupLabel: "Master",
          isActive: false,
          items: [
           
            { title: "Vendors", url: "/admin/vendors", icon: Briefcase },
             
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
        // { title: "Dashboard", url: "/vendor/dashboard", icon: PieChart, groupLabel: "Vendor Portal" },
        // { title: "Products", url: "/vendor/products", icon: Briefcase, groupLabel: "Vendor Portal" },
        { title: "Orders", url: "/admin/orders", icon: FileText, groupLabel: "Vendor Portal" },
        // Add other vendor-specific links here
      ],
      navMain: [] as any[],
    },
    AGENCY: {
      projects: [
         { title: "Orders", url: "/admin/orders", icon: FileText, groupLabel: "Agency Portal" },
         { title: "Delivery", url: "/admin/delivery", icon: FileText, groupLabel: "Agency Portal" },

         // Add other agency-specific links here
      ],
      navMain: [] as any[],
    }
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

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [data, setData] = React.useState({
    ...initialData,
    projects: [] as typeof initialData.roles.super_admin.projects,
    navMain: [] as any[],
    obNav: [] as typeof initialData.obNavigation,
    isOB: false,
  });

  React.useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedRoles = localStorage.getItem("roles");
    let isUserOB = false;

    // Check if user is an OB from the roles data
    if (
      storedRoles &&
      storedRoles !== "undefined" &&
      storedRoles.trim() !== ""
    ) {
      try {
        const parsedRoles = JSON.parse(storedRoles);
        // Check if any role is "OB" and validate parsedRoles is an array
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
        // Clear invalid data from localStorage
        localStorage.removeItem("roles");
      }
    }

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.avatarName = parsedUser.name?.charAt(0).toUpperCase() || "U";

        // Default to admin if no role is specified, then fallback to super_admin for safety
        let role =
          (parsedUser.role as keyof typeof initialData.roles) || "admin";

        // If role doesn't exist in our initialData, default to super_admin
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
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        // If there's an error, set default projects for navigation
        setData((prevData) => ({
          ...prevData,
          projects: initialData.roles.super_admin.projects,
          navMain: initialData.roles.super_admin.navMain,
          obNav: [],
          isOB: false,
        }));
      }
    } else {
      // No user in localStorage, show default navigation
      setData((prevData) => ({
        ...prevData,
        projects: initialData.roles.super_admin.projects,
        navMain: initialData.roles.super_admin.navMain,
        obNav: [],
        isOB: false,
      }));
    }
  }, []);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* <TeamSwitcher teams={data.teams} /> */}
        <SidebarMenu className="flex  ">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <div className="flex items-center gap-2  justify-between">
                <a 
                href="/"
                className="flex items-center gap-2">
                  <ArrowUpCircleIcon className="h-5 w-5" />
                  <span className="text-base font-semibold">{appName}</span>
                </a>
              
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1 bg-white"
            >
              <a href="/dashboard">
                <Search className="h-5 w-5 " />
                <Input localhost:3000 className="border-0 " />
               </a>
              
            </SidebarMenuButton>
            
          </SidebarMenuItem> */}
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {data.isOB && (
          <div className="mb-4">
            <NavMain items={data.obNav || []} groupLabel="Office Bearer Menu" />
          </div>
        )}
        <NavMain items={data.projects || []} groupLabel="Services" />
        <NavMain items={data.navMain || []} groupLabel="Management" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export { AppSidebar };
