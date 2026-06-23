import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      className="border-[#ead8d3] bg-[#f8eeeb] text-[#181313]"
      {...props}
    >
      <SidebarHeader className="border-b border-[#ead8d3] px-5 py-8">
        <Link href="/finances" className="block">
          <span className="block font-heading text-2xl leading-none">
            Tsukiroku
          </span>
          <span className="mt-2 block font-mono text-[11px] tracking-[0.18em] text-[#8b7a76] uppercase">
            Personal Ledger
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="bg-[#f8eeeb] px-2 py-5">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive
                  className="h-11 rounded-none px-4 text-base font-medium data-[active=true]:bg-[#f3dfda] data-[active=true]:text-[#181313]"
                >
                  <Link href="/finances">Finances</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
