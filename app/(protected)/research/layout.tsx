import { ResearchTabs } from "@/components/research/research-tabs";

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ResearchTabs />
      {children}
    </div>
  );
}
