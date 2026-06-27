import { ScanInterface } from "@/components/scan/scan-interface";

export const metadata = { title: "Scan Station" };

export default function ScanPage({ params }: { params: { deviceCode: string } }) {
  return <ScanInterface deviceCode={params.deviceCode} />;
}
