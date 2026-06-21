import type { Dispatch, SetStateAction } from "react";
import { CommandPanel } from "@/components/command";
import type { ToastType } from "@/hooks/useToast";

const GITHUB_REPOSITORY_OPTIONS = [
  "dandi-ai/summarizer-sdk",
  "my-username/nextjs-boilerplate",
  "my-username/python-engine",
  "my-username/ecom-dashboard",
  "my-username/dandi-analytics-plugin",
  "my-username/docker-configurations"
];

type AccountEnvironmentPanelProps = {
  githubConnected: boolean;
  isConnectingGithub: boolean;
  githubScope: "all" | "selected";
  selectedRepos: string[];
  searchQuery: string;
  onToggleGithub: () => void;
  setGithubScope: Dispatch<SetStateAction<"all" | "selected">>;
  setSelectedRepos: Dispatch<SetStateAction<string[]>>;
  onSearchQueryChange: (value: string) => void;
  showToast: (type: ToastType, message: string) => void;
};

export function AccountEnvironmentPanel({
  githubConnected,
  isConnectingGithub,
  githubScope,
  selectedRepos,
  searchQuery,
  onToggleGithub,
  setGithubScope,
  setSelectedRepos,
  onSearchQueryChange,
  showToast,
}: AccountEnvironmentPanelProps) {
  const filteredGithubRepositoryOptions = GITHUB_REPOSITORY_OPTIONS.filter(repo =>
    repo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <CommandPanel id="account-integrations-panel" role="tabpanel" aria-labelledby="integrations-tab" className="space-y-8 p-8 md:p-10">
      <div className="space-y-1">
        <h3 className="font-serif text-xl font-bold text-white sm:text-2xl">Git Provider Connections</h3>
        <p className="text-sm text-slate-400">Manage OAuth access for repository summaries.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
        <div
          className="relative overflow-hidden rounded-3xl border border-white/5 p-6 flex flex-col justify-between bg-slate-950/40 min-h-[220px] group shadow-xl backdrop-blur-xl"
          style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white border border-white/10 shadow-sm">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
              </div>
              {githubConnected ? (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 border border-emerald-500/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-300">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1 border border-white/5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Offline</span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">GitHub Integration</h4>
              <p className="text-[11px] leading-relaxed text-zinc-400">
                Connect GitHub so Dandi can summarize authorized private repositories.
              </p>
            </div>
          </div>
          <button
            onClick={onToggleGithub}
            disabled={isConnectingGithub}
            className={`w-full rounded-full py-3.5 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
              githubConnected
                ? "bg-slate-900 border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 text-slate-400"
                : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(52,211,153,0.3)] active:scale-95"
            }`}
          >
            {isConnectingGithub ? "Syncing Integration..." : githubConnected ? "Disconnect Integration" : "Connect with GitHub"}
          </button>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/5 border-dashed p-6 flex flex-col justify-between bg-slate-950/20 min-h-[220px] opacity-40 select-none">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-zinc-500 border border-white/5">
                <span className="text-xs font-serif font-black italic">G</span>
              </div>
              <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-zinc-500">Available Soon</span>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-zinc-500">GitLab Integration</h4>
              <p className="text-[11px] leading-relaxed text-zinc-500/80">
                Unlock integrated repository scanning for self-managed and cloud-hosted GitLab project spaces.
              </p>
            </div>
          </div>
          <button disabled className="w-full rounded-full border border-white/5 py-3.5 text-[10px] font-black uppercase tracking-widest text-zinc-600 cursor-not-allowed">
            Coming Soon
          </button>
        </div>
      </div>

      {githubConnected && (
        <div className="border-t border-white/5 pt-10 space-y-6 max-w-4xl animate-in fade-in duration-300">
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">GitHub Repository Access Scopes</h4>
            <p className="text-xs text-zinc-400">Choose which repositories Dandi can access through your GitHub connection.</p>
          </div>

          <div className="rounded-3xl border border-white/5 p-6 bg-slate-950/40 space-y-6 shadow-xl backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => {
                  setGithubScope("all");
                  showToast("success", "Authorized scope updated to: All Repositories.");
                }}
                className={`flex-1 rounded-2xl border p-5 flex flex-col justify-between text-left transition-all cursor-pointer ${
                  githubScope === "all"
                    ? "border-emerald-500/30 bg-slate-900 shadow-md ring-2 ring-emerald-500/10"
                    : "border-white/5 bg-slate-950/20 hover:bg-slate-950/40"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                    githubScope === "all" ? "text-emerald-400" : "text-zinc-500"
                  }`}>Scope A</span>
                  {githubScope === "all" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                  )}
                </div>
                <div className="mt-4 space-y-1">
                  <h5 className={`text-sm font-bold transition-colors ${
                    githubScope === "all" ? "text-white" : "text-zinc-400"
                  }`}>All Repositories</h5>
                  <p className="text-[10px] text-zinc-500 leading-normal">Grants Dandi access to scan and distill all public and authorized private repositories.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGithubScope("selected");
                  showToast("success", "Authorized scope updated to: Selected Repositories.");
                }}
                className={`flex-1 rounded-2xl border p-5 flex flex-col justify-between text-left transition-all cursor-pointer ${
                  githubScope === "selected"
                    ? "border-emerald-500/30 bg-slate-900 shadow-md ring-2 ring-emerald-500/10"
                    : "border-white/5 bg-slate-950/20 hover:bg-slate-950/40"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                    githubScope === "selected" ? "text-emerald-400" : "text-zinc-500"
                  }`}>Scope B</span>
                  {githubScope === "selected" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                  )}
                </div>
                <div className="mt-4 space-y-1">
                  <h5 className={`text-sm font-bold transition-colors ${
                    githubScope === "selected" ? "text-white" : "text-zinc-400"
                  }`}>Selected Repositories Only</h5>
                  <p className="text-[10px] text-zinc-500 leading-normal">Limit access to a custom list of selected private repositories.</p>
                </div>
              </button>
            </div>

            {githubScope === "selected" && (
              <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in duration-300">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search repositories..."
                    value={searchQuery}
                    onChange={(event) => onSearchQueryChange(event.target.value)}
                    className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors"
                  />
                </div>

                <div className="rounded-2xl border border-white/5 bg-slate-950/40 divide-y divide-white/5 max-h-[180px] overflow-y-auto scrollbar-hide">
                  {filteredGithubRepositoryOptions.length === 0 ? (
                    <div className="p-5 text-center">
                      <p className="text-xs font-bold text-slate-300">No repositories match this search.</p>
                      <p className="mt-1 text-[11px] font-medium leading-5 text-zinc-500">
                        Clear the filter to review the repositories available through this GitHub connection.
                      </p>
                      <button
                        type="button"
                        onClick={() => onSearchQueryChange("")}
                        className="mt-4 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-300/15"
                      >
                        Clear Search
                      </button>
                    </div>
                  ) : (
                    filteredGithubRepositoryOptions.map(repo => {
                      const isChecked = selectedRepos.includes(repo);
                      return (
                        <label
                          key={repo}
                          className="flex items-center justify-between p-3.5 px-4 cursor-pointer hover:bg-white/5 text-xs font-semibold tracking-wide"
                        >
                          <span className={isChecked ? "text-emerald-400 font-bold" : "text-zinc-400"}>{repo}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedRepos(prev => prev.filter(r => r !== repo));
                                showToast("success", `De-authorized repository: ${repo}`);
                              } else {
                                setSelectedRepos(prev => [...prev, repo]);
                                showToast("success", `Authorized repository: ${repo}`);
                              }
                            }}
                            className="h-4 w-4 rounded bg-slate-950 border-white/10 text-emerald-500 accent-emerald-500 focus:ring-emerald-500/20 cursor-pointer"
                          />
                        </label>
                      );
                    })
                  )}
                </div>

                <div className="space-y-1.5 ml-1 pt-2">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Currently Selected Repositories</span>
                  {selectedRepos.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRepos.map(repo => (
                        <span key={repo} className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                          {repo}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRepos(prev => prev.filter(r => r !== repo));
                              showToast("success", `De-authorized repository: ${repo}`);
                            }}
                            className="text-emerald-400 hover:text-emerald-300 font-serif font-black ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4">
                      <p className="text-xs font-bold text-slate-300">No repositories selected.</p>
                      <p className="mt-1 text-[11px] font-medium leading-5 text-zinc-500">
                        Select at least one repository or switch to all repositories before relying on private repository access.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setGithubScope("all");
                          showToast("success", "Authorized scope updated to: All Repositories.");
                        }}
                        className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 hover:underline"
                      >
                        Use All Repositories
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </CommandPanel>
  );
}
