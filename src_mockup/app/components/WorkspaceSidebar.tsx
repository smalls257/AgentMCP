import { GitBranch, FileEdit, Target } from "lucide-react";
import { Workspace } from "../types";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";

interface WorkspaceSidebarProps {
  workspaces: Workspace[];
  selectedWorkspace: string | null;
  selectedAgents: string[];
  onWorkspaceSelect: (workspaceId: string) => void;
  onAgentSelect: (agentId: string) => void;
}

export default function WorkspaceSidebar({
  workspaces,
  selectedWorkspace,
  selectedAgents,
  onWorkspaceSelect,
  onAgentSelect,
}: WorkspaceSidebarProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "thinking":
        return "bg-blue-500";
      case "idle":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "processing":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "awaiting-input":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      case "idle":
        return "text-gray-600 bg-gray-50 border-gray-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case "processing":
        return "Processing";
      case "awaiting-input":
        return "Awaiting Input";
      case "error":
        return "Error";
      case "idle":
        return "Idle";
      default:
        return state;
    }
  };

  return (
    <div className="w-80 border-r bg-gray-50 flex flex-col flex-shrink-0">
      <div className="p-4 border-b bg-white">
        <h1 className="font-semibold text-lg">Agent Workspace</h1>
        <p className="text-sm text-gray-500 mt-1">Multi-agent IDE</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {workspaces.map((workspace) => {
            const allAgents = workspace.projects.flatMap((proj) => proj.agents);
            
            return (
              <div key={workspace.id} className="mb-4">
                <button
                  onClick={() => onWorkspaceSelect(workspace.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedWorkspace === workspace.id
                      ? "bg-blue-50 border border-blue-200"
                      : "bg-white border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-base">{workspace.name}</span>
                    {workspace.hasUncommittedChanges && (
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
                        <FileEdit className="size-3 mr-1" />
                        Uncommitted
                      </Badge>
                    )}
                  </div>
                  {workspace.goal && (
                    <div className="flex items-start gap-2 text-xs text-gray-600 mb-2">
                      <Target className="size-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{workspace.goal}</span>
                    </div>
                  )}
                  <div className="flex items-center text-xs text-gray-600">
                    <GitBranch className="size-3 mr-1" />
                    {workspace.branch}
                  </div>
                </button>

                {selectedWorkspace === workspace.id && (
                  <div className="mt-2 ml-3 pl-3 border-l-2 border-gray-200 space-y-2">
                    {allAgents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => onAgentSelect(agent.id)}
                        className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                          selectedAgents.includes(agent.id)
                            ? "bg-blue-100 border border-blue-300"
                            : "bg-white border border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={`size-2 rounded-full ${getStatusColor(
                              agent.status
                            )} ${
                              agent.status === "thinking"
                                ? "animate-pulse"
                                : ""
                            }`}
                          />
                          <span className="font-medium">{agent.name}</span>
                          {agent.type === "subagent" && (
                            <Badge
                              variant="outline"
                              className="text-xs px-1 py-0"
                            >
                              Sub
                            </Badge>
                          )}
                          {agent.hasUncommittedChanges && (
                            <FileEdit className="size-3 text-yellow-600 ml-auto" />
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getStateColor(agent.state)}`}
                            >
                              {getStateLabel(agent.state)}
                            </Badge>
                            {agent.branch && (
                              <div className="flex items-center text-xs text-gray-500">
                                <GitBranch className="size-3 mr-1" />
                                <span className="font-mono truncate">{agent.branch}</span>
                              </div>
                            )}
                          </div>
                          {agent.currentTask && (
                            <p className="text-xs text-gray-600 line-clamp-1">
                              {agent.currentTask}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{agent.lastActive}</span>
                            {agent.taskCount > 0 && (
                              <span className="text-blue-600">
                                {agent.taskCount} task{agent.taskCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}