import { useState } from "react";
import WorkspaceSidebar from "./WorkspaceSidebar";
import ConversationPanel from "./ConversationPanel";
import TasksArtifactsPanel from "./TasksArtifactsPanel";
import TasksModal from "./TasksModal";
import { workspaces, messages, artifacts, tasks } from "../data/mockData";
import { Agent } from "../types";
import { LayoutGrid } from "lucide-react";

export default function MainLayout() {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    "ws-1"
  );
  const [selectedAgents, setSelectedAgents] = useState<string[]>(["agent-1"]);
  const [taskModalAgent, setTaskModalAgent] = useState<string | null>(null);

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgents((prev) => {
      if (prev.includes(agentId)) {
        return prev.filter((id) => id !== agentId);
      }
      // Limit to 3 simultaneous conversations
      if (prev.length >= 3) {
        return [...prev.slice(1), agentId];
      }
      return [...prev, agentId];
    });
  };

  const handleCloseAgent = (agentId: string) => {
    setSelectedAgents((prev) => prev.filter((id) => id !== agentId));
  };

  const handleOpenTasks = (agentId: string) => {
    setTaskModalAgent(agentId);
  };

  const getAgent = (agentId: string): Agent | undefined => {
    for (const workspace of workspaces) {
      for (const project of workspace.projects) {
        const agent = project.agents.find((a) => a.id === agentId);
        if (agent) return agent;
      }
    }
    return undefined;
  };

  const taskModalAgentData = taskModalAgent ? getAgent(taskModalAgent) : null;
  const taskModalTasks = taskModalAgent ? tasks[taskModalAgent] || [] : [];

  // Get all agents for task panel
  const allAgents: Agent[] = workspaces.flatMap((ws) =>
    ws.projects.flatMap((proj) => proj.agents)
  );

  // Get all tasks for selected agents
  const allTasksForPanel = selectedAgents.flatMap(
    (agentId) => tasks[agentId] || []
  );

  return (
    <div className="h-screen flex overflow-hidden bg-white">
      {/* Sidebar */}
      <WorkspaceSidebar
        workspaces={workspaces}
        selectedWorkspace={selectedWorkspace}
        selectedAgents={selectedAgents}
        onWorkspaceSelect={setSelectedWorkspace}
        onAgentSelect={handleAgentSelect}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {selectedAgents.length === 0 ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <LayoutGrid className="size-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">
                No agents selected
              </h2>
              <p className="text-gray-500">
                Select agents from the sidebar to view conversations
              </p>
              <p className="text-sm text-gray-400 mt-2">
                You can view up to 3 conversations simultaneously
              </p>
            </div>
          </div>
        ) : (
          <div
            className="flex-1 grid overflow-hidden min-w-0"
            style={{
              gridTemplateColumns: `repeat(${selectedAgents.length}, 1fr)`,
            }}
          >
            {selectedAgents.map((agentId) => {
              const agent = getAgent(agentId);
              if (!agent) return null;

              return (
                <ConversationPanel
                  key={agentId}
                  agent={agent}
                  messages={messages[agentId] || []}
                  onClose={() => handleCloseAgent(agentId)}
                  onOpenTasks={handleOpenTasks}
                />
              );
            })}
          </div>
        )}

        {/* Tasks & Artifacts Panel */}
        {selectedAgents.length > 0 && (
          <TasksArtifactsPanel
            tasks={allTasksForPanel}
            artifacts={artifacts}
            agents={allAgents}
            selectedAgents={selectedAgents}
          />
        )}
      </div>

      {/* Tasks Modal */}
      <TasksModal
        agent={taskModalAgentData}
        tasks={taskModalTasks}
        isOpen={taskModalAgent !== null}
        onClose={() => setTaskModalAgent(null)}
      />
    </div>
  );
}