import { X, CheckCircle2, Clock, AlertCircle, Circle } from "lucide-react";
import { Task, Agent } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";

interface TasksModalProps {
  agent: Agent | null;
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
}

export default function TasksModal({
  agent,
  tasks,
  isOpen,
  onClose,
}: TasksModalProps) {
  if (!agent) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="size-4 text-green-600" />;
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
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
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

  const statusOrder = {
    "in-progress": 0,
    pending: 1,
    blocked: 2,
    completed: 3,
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const statusDiff = statusOrder[a.status as keyof typeof statusOrder] -
      statusOrder[b.status as keyof typeof statusOrder];
    if (statusDiff !== 0) return statusDiff;

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority as keyof typeof priorityOrder] -
      priorityOrder[b.priority as keyof typeof priorityOrder];
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Tasks - {agent.name}</span>
            <Badge variant="outline" className="ml-2">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3 pr-4">
            {sortedTasks.map((task) => (
              <div
                key={task.id}
                className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 mb-2">
                  {getStatusIcon(task.status)}
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{task.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {task.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getStatusColor(task.status)}`}
                      >
                        {task.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getPriorityColor(task.priority)}`}
                      >
                        {task.priority} priority
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
