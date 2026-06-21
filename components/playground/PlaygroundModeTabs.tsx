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
        { id: "summary", label: "Repository Summary", controlsId: "playground-summary-panel" },
        { id: "rag", label: "Ask a Repository", controlsId: "playground-rag-panel" },
      ]}
      activeId={activeTab}
      onChange={(id) => onChange(id as PlaygroundMode)}
      variant="pills"
    />
  );
}
