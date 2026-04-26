import { useState } from "react";
import { ApiKey } from "../../types/api";
import { EyeIcon, EyeOffIcon, CopyIcon, CopyCheckIcon, EditIcon, TrashIcon } from "../icons";

type ApiKeyTableProps = {
  apiKeys: ApiKey[];
  isLoading: boolean;
  onEdit: (key: ApiKey) => void;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
  onCopySuccess: () => void;
  onCopyError: (msg: string) => void;
};

export function ApiKeyTable({
  apiKeys,
  isLoading,
  onEdit,
  onDelete,
  onCopySuccess,
  onCopyError,
}: ApiKeyTableProps) {
  const [visibleKeyIds, setVisibleKeyIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeyIds((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 11) return key;
    return `${key.slice(0, 8)} ... ${key.slice(-4)}`;
  };

  const copyKeyValue = async (id: string, value: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const tempInput = document.createElement("input");
        tempInput.value = value;
        document.body.appendChild(tempInput);
        tempInput.select();
        const didCopy = document.execCommand("copy");
        document.body.removeChild(tempInput);

        if (!didCopy) {
          throw new Error("Copy command failed");
        }
      }
      setCopiedId(id);
      onCopySuccess();
      setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1200);
    } catch {
      onCopyError("Could not copy API key. Please copy it manually.");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await onDelete(id);
    if (result.success) {
      setVisibleKeyIds((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-300 bg-white">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <colgroup>
          <col className="w-[20%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[36%]" />
          <col className="w-[20%]" />
        </colgroup>
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr className="border-b border-zinc-200">
            <th className="px-5 py-3">Name</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Usage</th>
            <th className="px-4 py-3">Key</th>
            <th className="px-4 py-3 text-center">Options</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td className="px-4 py-6 text-sm text-zinc-500" colSpan={5}>
                Loading API keys...
              </td>
            </tr>
          ) : null}
          {apiKeys.map((key) => (
            <tr key={key.id} className="border-b border-zinc-100">
              <td className="px-5 py-4 font-medium">{key.name}</td>
              <td className="px-4 py-3 text-zinc-600">
                {key.type === "production" ? "prod" : "dev"}
              </td>
              <td className="px-4 py-3 text-zinc-600">{key.usage_count}</td>
              <td className="px-4 py-3">
                <div className="flex w-full items-center gap-2">
                  <span
                    className={`block w-full whitespace-nowrap font-mono text-xs ${
                      visibleKeyIds[key.id] ? "overflow-x-auto" : "truncate"
                    }`}
                  >
                    {visibleKeyIds[key.id] ? key.key_value : maskApiKey(key.key_value)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-nowrap items-center justify-center gap-2 text-zinc-600">
                  <button
                    type="button"
                    onClick={() => toggleKeyVisibility(key.id)}
                    className="rounded-md p-1.5 transition hover:bg-zinc-100 hover:text-zinc-900"
                    aria-label={visibleKeyIds[key.id] ? "Hide API key" : "Show API key"}
                    title={visibleKeyIds[key.id] ? "Hide key" : "Show key"}
                  >
                    {visibleKeyIds[key.id] ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyKeyValue(key.id, key.key_value)}
                    className="rounded-md p-1.5 transition hover:bg-zinc-100 hover:text-zinc-900"
                    aria-label="Copy API key"
                    title={copiedId === key.id ? "Copied" : "Copy key"}
                  >
                    {copiedId === key.id ? <CopyCheckIcon /> : <CopyIcon />}
                  </button>
                  <button
                    onClick={() => onEdit(key)}
                    type="button"
                    className="rounded-md p-1.5 transition hover:bg-zinc-100 hover:text-zinc-900"
                    aria-label="Edit API key"
                    title="Edit"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={() => handleDelete(key.id)}
                    type="button"
                    className="rounded-md p-1.5 text-red-500 transition hover:bg-red-50 hover:text-red-700"
                    aria-label="Delete API key"
                    title="Delete"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
