use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub provider_id: String,
    pub agent_type: String, // 'primary' | 'subagent'
    pub status: String,     // 'active' | 'thinking' | 'awaiting-input' | 'idle' | 'error'
    pub current_task: Option<String>,
    pub parent_id: Option<String>,
    pub children: Vec<String>,
    pub last_active_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub path: String,
    pub branch: String,
    pub goal: String,
    pub has_uncommitted_changes: bool,
    pub agents: Vec<Agent>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: String,
    pub agent_id: String,
    pub role: String,
    pub content: String,
    pub timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub agent_id: String,
    pub title: String,
    pub status: String,
    pub priority: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Artifact {
    pub id: String,
    pub agent_id: String,
    pub name: String,
    pub artifact_type: String, // 'code' | 'file' | 'output'
    pub content: String,
    pub changes: Option<String>,
    pub timestamp: i64,
}
