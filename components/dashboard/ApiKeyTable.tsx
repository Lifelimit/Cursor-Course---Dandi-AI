import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { ApiKey } from "@/types/api";
import { DataTableShell } from "@/components/ui/DataTable";
import { ProgressiveListFooter } from "@/components/ui/ProgressiveListFooter";
import {
  ApiKeyDesktopRow,
  ApiKeyDesktopSearchEmptyRow,
  ApiKeyMobileCard,
  ApiKeyMobileSkeleton,
  ApiKeySearchControls,
  ApiKeySearchEmptyState,
  ApiKeyTableSkeleton,
  QuickStartEmptyState,
} from "@/components/dashboard/ApiKeyTableParts";
import { useProgressiveList } from "@/hooks/useProgressiveList";

const DEFAULT_VISIBLE_KEY_COUNT = 10;

type ApiKeyTableProps = {
  apiKeys: ApiKey[];
  isLoading: boolean;
  onEdit: (key: ApiKey) => void;
  onDelete: (key: ApiKey, options?: { replace?: boolean }) => void;
  onUpgradePrompt: () => void;
  currentPlan: string;
  onOpenCreateModal: () => void;
};

export function ApiKeyTable({
  apiKeys,
  isLoading,
  onEdit,
  onDelete,
  onUpgradePrompt,
  currentPlan,
  onOpenCreateModal,
}: ApiKeyTableProps) {
  const [promptedKeyId, setPromptedKeyId] = useState<string | null>(null);
  const [securityPromptKeyId, setSecurityPromptKeyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const isHobby = currentPlan === "Hobby";

  const normalizedSearchTerm = deferredSearchTerm.toLowerCase();

  const filteredKeys = useMemo(() => {
    return apiKeys.filter(key =>
      key.name.toLowerCase().includes(normalizedSearchTerm) ||
      key.key_value.toLowerCase().includes(normalizedSearchTerm)
    );
  }, [apiKeys, normalizedSearchTerm]);

  const {
    visibleItems: visibleKeys,
    visibleCount,
    totalCount,
    canShowMore,
    canShowLess,
    showMore,
    showLess,
  } = useProgressiveList(filteredKeys, DEFAULT_VISIBLE_KEY_COUNT);

  const togglePrompt = useCallback((keyId: string) => {
    setPromptedKeyId(current => (current === keyId ? null : keyId));
  }, []);

  const toggleSecurityPrompt = useCallback((keyId: string) => {
    setSecurityPromptKeyId(current => (current === keyId ? null : keyId));
  }, []);

  const clearSearch = useCallback(() => setSearchTerm(""), []);
  const closeSecurityPrompt = useCallback(() => setSecurityPromptKeyId(null), []);

  if (!isLoading && apiKeys.length === 0) {
    return <QuickStartEmptyState onOpenCreateModal={onOpenCreateModal} />;
  }

  return (
    <div className="space-y-6">
      <ApiKeySearchControls
        searchTerm={searchTerm}
        matchCount={filteredKeys.length}
        onSearchTermChange={setSearchTerm}
      />

      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <ApiKeyMobileSkeleton />
        ) : filteredKeys.length === 0 ? (
          <ApiKeySearchEmptyState onClearSearch={clearSearch} />
        ) : (
          visibleKeys.map(key => (
            <ApiKeyMobileCard
              key={key.id}
              apiKey={key}
              isHobby={isHobby}
              isPrompted={promptedKeyId === key.id}
              isSecurityPrompted={securityPromptKeyId === key.id}
              onPromptToggle={togglePrompt}
              onSecurityPromptToggle={toggleSecurityPrompt}
              onSecurityPromptClose={closeSecurityPrompt}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      <DataTableShell className="hidden animate-in fade-in duration-300 md:block" minWidth="800px" scrollLabel="API keys table">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm table-fixed">
          <thead className="bg-white/[0.03] text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
            <tr className="border-b border-white/10">
              <th className="px-8 py-5 w-[22%]">API Key</th>
              <th className="px-4 py-5 w-[12%]">Tier</th>
              <th className="px-4 py-5 w-[18%]">Usage</th>
              <th className="px-4 py-5 w-[33%]">Signature</th>
              <th className="px-4 py-5 text-center w-[15%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <ApiKeyTableSkeleton />
            ) : filteredKeys.length === 0 ? (
              <ApiKeyDesktopSearchEmptyRow onClearSearch={clearSearch} />
            ) : (
              visibleKeys.map(key => (
                <ApiKeyDesktopRow
                  key={key.id}
                  apiKey={key}
                  isHobby={isHobby}
                  isPrompted={promptedKeyId === key.id}
                  isSecurityPrompted={securityPromptKeyId === key.id}
                  onPromptToggle={togglePrompt}
                  onSecurityPromptToggle={toggleSecurityPrompt}
                  onSecurityPromptClose={closeSecurityPrompt}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onUpgradePrompt={onUpgradePrompt}
                />
              ))
            )}
          </tbody>
        </table>
      </DataTableShell>

      {!isLoading && filteredKeys.length > 0 && (
        <ProgressiveListFooter
          visibleCount={visibleCount}
          totalCount={totalCount}
          itemLabel="keys"
          canShowMore={canShowMore}
          canShowLess={canShowLess}
          onShowMore={showMore}
          onShowLess={showLess}
        />
      )}
    </div>
  );
}
