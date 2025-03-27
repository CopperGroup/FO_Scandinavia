"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, StoreIcon } from "lucide-react"
import { Store } from "@/constants/store"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { sidebarLinkGroups } from "@/constants/adminSidebarLinks"

export function AdminSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <Link href="/" className="flex items-center justify-center gap-2 p-4 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:pt-4">
          <div className="flex items-center justify-center h-8 w-8 bg-black text-white rounded-full ">
            <StoreIcon className="h-5 w-5 " />
          </div>
          <span className="text-xl font-semibold group-data-[collapsible=icon]:hidden">{Store.name}</span>
        </Link>
        <p className="text-sm font-medium text-muted-foreground px-4 mb-2 group-data-[collapsible=icon]:hidden">
          Адмін
        </p>
      </SidebarHeader>
      <SidebarContent>
        {sidebarLinkGroups.map((group) => {
          const hasItems = group.items.length > 0
          const isCollapsible = group.collapsible !== false && group.items.length > 1

          return (
            <SidebarGroup key={group.title}>
              {isCollapsible ? (
                <Collapsible defaultOpen className="group/collapsible">
                  <SidebarGroupLabel asChild className="group-data-[collapsible=icon]:hidden">
                    <CollapsibleTrigger className="flex w-full items-center text-sm font-medium px-3 py-2">
                      {group.title}
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {group.items.map((link) => {
                          const isActive =
                            (pathname.includes(link.route) && link.route.length > 1) || pathname === link.route

                          return (
                            <SidebarMenuItem key={link.label}>
                              <SidebarMenuButton asChild isActive={isActive} tooltip={link.label}>
                                <Link
                                  href={link.route}
                                  className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
                                >
                                  <div
                                    className={`rounded-full p-1.5 flex items-center justify-center ${isActive ? "bg-black text-white" : "bg-muted"} group-data-[collapsible=icon]:mx-auto`}
                                  >
                                    <link.icon className="h-4 w-4" />
                                  </div>
                                  <span className="group-data-[collapsible=icon]:hidden">{link.label}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <>
                  {group.items.length === 1 ? (
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {group.items.map((link) => {
                          const isActive =
                            (pathname.includes(link.route) && link.route.length > 1) || pathname === link.route

                          return (
                            <SidebarMenuItem key={link.label}>
                              <SidebarMenuButton asChild isActive={isActive} tooltip={link.label}>
                                <Link
                                  href={link.route}
                                  className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
                                >
                                  <div
                                    className={`rounded-full p-1.5 flex items-center justify-center ${isActive ? "bg-black text-white" : "bg-muted"} group-data-[collapsible=icon]:mx-auto`}
                                  >
                                    <link.icon className="h-4 w-4" />
                                  </div>
                                  <span className="group-data-[collapsible=icon]:hidden">{link.label}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  ) : (
                    <>
                      <SidebarGroupLabel className="text-sm font-medium px-3 py-2 group-data-[collapsible=icon]:hidden">
                        {group.title}
                      </SidebarGroupLabel>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {group.items.map((link) => {
                            const isActive =
                              (pathname.includes(link.route) && link.route.length > 1) || pathname === link.route

                            return (
                              <SidebarMenuItem key={link.label}>
                                <SidebarMenuButton asChild isActive={isActive} tooltip={link.label}>
                                  <Link
                                    href={link.route}
                                    className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
                                  >
                                    <div
                                      className={`rounded-full p-1.5 flex items-center justify-center ${isActive ? "bg-black text-white" : "bg-muted"} group-data-[collapsible=icon]:mx-auto`}
                                    >
                                      <link.icon className="h-4 w-4" />
                                    </div>
                                    <span className="group-data-[collapsible=icon]:hidden">{link.label}</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </>
                  )}
                </>
              )}
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

