import { Send, ListTodo, GitBranch, X } from "lucide-react";
import { Agent, Message } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { useState } from "react";

interface ConversationPanelProps {
  agent: Agent;
  messages: Message[];
  onClose: () => void;
  onOpenTasks: (agentId: string) => void;
}

export default function ConversationPanel({
  agent,
  messages,
  onClose,
  onOpenTasks,
}: ConversationPanelProps) {
  const [input, setInput] = useState("");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "thinking":
        return "bg-blue-500 animate-pulse";
      case "idle":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  const handleSend = () => {
    if (input.trim()) {
      // In a real app, this would send the message
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r">
      {/* Header */}
      <div className="border-b p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`size-3 rounded-full ${getStatusColor(agent.status)}`} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{agent.name}</h2>
                {agent.type === "subagent" && (
                  <Badge variant="outline" className="text-xs">
                    Subagent
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500">{agent.status}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenTasks(agent.id)}
              className="gap-2"
            >
              <ListTodo className="size-4" />
              Tasks ({agent.taskCount})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="size-8 p-0"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
        {agent.branch && (
          <div className="flex items-center gap-2 text-xs text-gray-600 bg-white px-3 py-2 rounded border">
            <GitBranch className="size-3" />
            <span className="font-mono">{agent.branch}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.role === "user" ? "text-blue-100" : "text-gray-500"
                  }`}
                >
                  {message.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4 bg-gray-50">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={`Message ${agent.name}...`}
            className="flex-1"
          />
          <Button onClick={handleSend} className="gap-2">
            <Send className="size-4" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
