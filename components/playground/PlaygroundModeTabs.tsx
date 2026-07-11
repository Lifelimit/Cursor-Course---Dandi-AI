import { TabsBar } from "@/components/command";

type PlaygroundMode = "summary" | "rag";

type PlaygroundModeTabsProps = {
  activeTab: PlaygroundMode;
  onChange: (tab: PlaygroundMode) => void;
};

export function PlaygroundModeTabs({ activeTab, onChange }: PlaygroundModeTabsProps) {
  return (
    <TabsBar
      tabs={[
        { id: "summary", label: "Summarize", controlsId: "playground-summary-panel" },
        { id: "rag", label: "Prepare & Ask", controlsId: "playground-rag-panel" },
      ]}
      activeId={activeTab}
      onChange={(id) => onChange(id as PlaygroundMode)}
      variant="pills"
    />
  );
}
