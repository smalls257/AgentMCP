import { CheckCircle2, Clock, Circle, AlertCircle, FileCode, File, Terminal } from "lucide-react";
import { Task, Agent, Artifact } from "../types";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface TasksArtifactsPanelProps {
  tasks: Task[];
  artifacts: Artifact[];
  agents: Agent[];
  selectedAgents: string[];
}

export default function TasksArtifactsPanel({
  tasks,
  artifacts,
  agents,
  selectedAgents,
}: TasksArtifactsPanelProps) {
  const filteredTasks = tasks.filter(
    (task) =>
      selectedAgents.includes(task.agentId) &&
      task.status !== "completed"
  );

  const filteredArtifacts = artifacts.filter((artifact) =>
    selectedAgents.includes(artifact.agentId)
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in-progress":
        return <Clock className="size-4 text-blue-600" />;
      case "blocked":
        return <AlertCircle className="size-4 text-red-600" />;
      case "pending":
        return <Circle className="size-4 text-gray-400" />;
      default:
        return <Circle className="size-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-progress":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "blocked":
        return "bg-red-100 text-red-700 border-red-200";
      case "pending":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name || "Unknown Agent";
  };

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case "code":
        return <FileCode className="size-4" />;
      case "file":
        return <File className="size-4" />;
      case "output":
        return <Terminal className="size-4" />;
      default:
        return <File className="size-4" />;
    }
  };

  const getArtifactTypeColor = (type: string) => {
    switch (type) {
      case "code":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "file":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "output":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const inProgressTasks = filteredTasks.filter(
    (t) => t.status === "in-progress"
  );
  const pendingTasks = filteredTasks.filter((t) => t.status === "pending");
  const blockedTasks = filteredTasks.filter((t) => t.status === "blocked");

  return (
    <div className="w-96 border-l bg-gray-50 flex flex-col">
      <Tabs defaultValue="tasks" className="flex flex-col h-full">
        <div className="p-4 border-b bg-white">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks">
              Tasks ({filteredTasks.length})
            </TabsTrigger>
            <TabsTrigger value="artifacts">
              Artifacts ({filteredArtifacts.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tasks" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle2 className="size-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No active tasks</p>
                  <p className="text-xs mt-1">All tasks completed</p>
                </div>
              ) : (
                <>
                  {/* In Progress Section */}
                  {inProgressTasks.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2 px-1">
                        In Progress ({inProgressTasks.length})
                      </h3>
                      <div className="space-y-2">
                        {inProgressTasks.map((task) => (
                          <div
                            key={task.id}
                            className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start gap-2 mb-2">
                              {getStatusIcon(task.status)}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium mb-1">
                                  {task.title}
                                </h4>
                                <p className="text-xs text-gray-500 mb-2">
                                  {getAgentName(task.agentId)}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getPriorityColor(
                                task.priority
                              )}`}
                            >
                              {task.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Blocked Section */}
                  {blockedTasks.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2 px-1">
                        Blocked ({blockedTasks.length})
                      </h3>
                      <div className="space-y-2">
                        {blockedTasks.map((task) => (
                          <div
                            key={task.id}
                            className="bg-white border border-red-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start gap-2 mb-2">
                              {getStatusIcon(task.status)}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium mb-1">
                                  {task.title}
                                </h4>
                                <p className="text-xs text-gray-500 mb-2">
                                  {getAgentName(task.agentId)}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getPriorityColor(
                                task.priority
                              )}`}
                            >
                              {task.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending Section */}
                  {pendingTasks.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2 px-1">
                        Pending ({pendingTasks.length})
                      </h3>
                      <div className="space-y-2">
                        {pendingTasks.map((task) => (
                          <div
                            key={task.id}
                            className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start gap-2 mb-2">
                              {getStatusIcon(task.status)}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium mb-1">
                                  {task.title}
                                </h4>
                                <p className="text-xs text-gray-500 mb-2">
                                  {getAgentName(task.agentId)}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getPriorityColor(
                                task.priority
                              )}`}
                            >
                              {task.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="artifacts" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {filteredArtifacts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <File className="size-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No artifacts yet</p>
                  <p className="text-xs mt-1">Agent outputs will appear here</p>
                </div>
              ) : (
                filteredArtifacts.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getArtifactIcon(artifact.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm truncate">
                            {artifact.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getArtifactTypeColor(
                              artifact.type
                            )}`}
                          >
                            {artifact.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          {artifact.content}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{getAgentName(artifact.agentId)}</span>
                          {artifact.changes && (
                            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {artifact.changes}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {artifact.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
