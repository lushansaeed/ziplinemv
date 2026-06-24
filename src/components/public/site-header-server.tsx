import { getLogoData } from "@/components/shared/site-logo";
import { SiteHeader } from "./site-header";

export async function SiteHeaderServer() {
  const logo = await getLogoData();
  return <SiteHeader logo={logo} />;
}
