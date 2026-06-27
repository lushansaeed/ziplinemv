"use client";

import { useState } from "react";
import { Contact, Home, Image, Palette, Settings2, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { CmsWorkspace } from "@/components/admin/cms/cms-workspace";
import { WebsiteMediaManager } from "@/components/admin/media/website-media-manager";
import { ThemeWorkspace } from "@/components/admin/theme/theme-workspace";

type TabKey = "theme" | "homepage-media" | "page-media" | "text" | "global";

const TABS: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
  { key: "theme", label: "Theme & Branding", icon: Palette },
  { key: "homepage-media", label: "Homepage Media", icon: Home },
  { key: "page-media", label: "Page Media", icon: Image },
  { key: "text", label: "Website Text & Captions", icon: Type },
  { key: "global", label: "Global Settings", icon: Settings2 },
];

const HOMEPAGE_MEDIA_CATEGORIES = ["hero", "feature-hero", "drone-reels", "guest-photos", "gallery"];
const PAGE_MEDIA_CATEGORIES = ["packages", "addons", "story", "gallery"];

interface WebsiteCustomizationWorkspaceProps {
  cmsData: any;
  mediaData: any;
  themeData: any;
  permissions: string[];
}

export function WebsiteCustomizationWorkspace({
  cmsData,
  mediaData,
  themeData,
  permissions,
}: WebsiteCustomizationWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("theme");
  const canCreate = permissions.includes("website_customization.create");
  const canUpdate = permissions.includes("website_customization.update");
  const canDelete = permissions.includes("website_customization.delete");
  const canPublish = permissions.includes("website_customization.publish");
  const permissionProps = { canCreate, canUpdate, canDelete, canPublish };

  return (
    <div className="min-h-full bg-background">
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "inline-flex h-10 flex-shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "theme" && (
        <div className="space-y-6">
          <CmsWorkspace
            {...cmsData}
            visibleTabs={["general"]}
            initialTab="general"
            {...permissionProps}
          />
          <ThemeWorkspace {...themeData} {...permissionProps} />
        </div>
      )}

      {activeTab === "homepage-media" && (
        <WebsiteMediaManager
          {...mediaData}
          categorySlugs={HOMEPAGE_MEDIA_CATEGORIES}
          defaultLocation="hero"
          {...permissionProps}
        />
      )}

      {activeTab === "page-media" && (
        <WebsiteMediaManager
          {...mediaData}
          categorySlugs={PAGE_MEDIA_CATEGORIES}
          defaultLocation="gallery"
          {...permissionProps}
        />
      )}

      {activeTab === "text" && (
        <CmsWorkspace
          {...cmsData}
          visibleTabs={["order", "sections", "pages", "announcements"]}
          initialTab="sections"
          {...permissionProps}
        />
      )}

      {activeTab === "global" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <CmsWorkspace
            {...cmsData}
            visibleTabs={["contact"]}
            initialTab="contact"
            {...permissionProps}
          />
          <div className="p-6">
            <div className="admin-card space-y-3">
              <div className="flex items-center gap-2">
                <Contact className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Public preview</p>
              </div>
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                Preview public website
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
