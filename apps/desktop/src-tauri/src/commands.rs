use tauri::State;
use std::sync::Mutex;
use rusqlite::Connection;
use crate::models::{Workspace, Agent};
use crate::pty::PtyManager;
use serde_json::json;
use std::collections::HashMap;

pub struct DbState {
    pub conn: Mutex<Connection>,
}

#[tauri::command]
pub fn get_workspaces(state: State<'_, DbState>) -> Result<Vec<Workspace>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, path, goal, has_uncommitted_changes FROM workspaces")
        .map_err(|e| e.to_string())?;
        
    let iter = stmt.query_map([], |row| {
        let path: String = row.get(2)?;
        
        // Dynamically fetch the actual git branch
        let fetch_branch = || -> Option<String> {
            let output = std::process::Command::new("git")
                .args(["rev-parse", "--abbrev-ref", "HEAD"])
                .current_dir(&path)
                .output()
                .ok()?;
                
            if output.status.success() {
                let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !branch.is_empty() {
                    return Some(branch);
                }
            }
            None
        };

        let branch = fetch_branch().unwrap_or_else(|| "main".to_string());

        Ok(Workspace {
            id: row.get(0)?,
            name: row.get(1)?,
            path,
            branch,
            goal: row.get(3).unwrap_or_default(),
            has_uncommitted_changes: row.get::<_, i32>(4)? != 0,
            agents: vec![], // Hydrated later if needed, or in a JOIN
        })
    }).map_err(|e| e.to_string())?;

    let mut workspaces = Vec::new();
    for row in iter {
        workspaces.push(row.map_err(|e| e.to_string())?);
    }
    
    Ok(workspaces)
}

#[tauri::command]
pub fn create_workspace(state: State<'_, DbState>, name: String, path: String) -> Result<Workspace, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    
    conn.execute(
        "INSERT INTO workspaces (id, name, path, branch, goal, has_uncommitted_changes) VALUES (?1, ?2, ?3, 'main', '', 0)",
        (&id, &name, &path),
    ).map_err(|e| e.to_string())?;

    Ok(Workspace {
        id,
        name,
        path,
        branch: "main".to_string(),
        goal: "".to_string(),
        has_uncommitted_changes: false,
        agents: vec![],
    })
}

#[tauri::command]
pub fn get_agents(state: State<'_, DbState>, workspace_id: String) -> Result<Vec<Agent>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, provider_id, agent_type, status, current_task, parent_id, last_active_at FROM agents WHERE workspace_id = ?1")
        .map_err(|e| e.to_string())?;

    let iter = stmt.query_map([workspace_id], |row| {
        Ok(Agent {
            id: row.get(0)?,
            name: row.get(1)?,
            provider_id: row.get(2)?,
            agent_type: row.get(3)?,
            status: row.get(4)?,
            current_task: row.get(5)?,
            parent_id: row.get(6)?,
            children: vec![], // We can compute children structure on frontend or here
            last_active_at: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut agents = Vec::new();
    for row in iter {
        agents.push(row.map_err(|e| e.to_string())?);
    }

    Ok(agents)
}

#[tauri::command]
pub fn get_messages(state: State<'_, DbState>, agent_id: String) -> Result<Vec<crate::models::Message>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, agent_id, role, content, timestamp FROM messages WHERE agent_id = ?1 ORDER BY timestamp ASC")
        .map_err(|e| e.to_string())?;

    let iter = stmt.query_map([agent_id], |row| {
        Ok(crate::models::Message {
            id: row.get(0)?,
            agent_id: row.get(1)?,
            role: row.get(2)?,
            content: row.get(3)?,
            timestamp: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in iter { items.push(row.map_err(|e| e.to_string())?); }
    Ok(items)
}

#[tauri::command]
pub fn get_tasks(state: State<'_, DbState>, agent_id: String) -> Result<Vec<crate::models::Task>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, agent_id, title, status, priority, created_at FROM tasks WHERE agent_id = ?1 ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;

    let iter = stmt.query_map([agent_id], |row| {
        Ok(crate::models::Task {
            id: row.get(0)?,
            agent_id: row.get(1)?,
            title: row.get(2)?,
            status: row.get(3)?,
            priority: row.get(4)?,
            created_at: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in iter { items.push(row.map_err(|e| e.to_string())?); }
    Ok(items)
}

#[tauri::command]
pub fn get_artifacts(state: State<'_, DbState>, agent_id: String) -> Result<Vec<crate::models::Artifact>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, agent_id, name, type, content, changes, timestamp FROM artifacts WHERE agent_id = ?1 ORDER BY timestamp DESC")
        .map_err(|e| e.to_string())?;

    let iter = stmt.query_map([agent_id], |row| {
        Ok(crate::models::Artifact {
            id: row.get(0)?,
            agent_id: row.get(1)?,
            name: row.get(2)?,
            artifact_type: row.get(3)?,
            content: row.get(4)?,
            changes: row.get(5)?,
            timestamp: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in iter { items.push(row.map_err(|e| e.to_string())?); }
    Ok(items)
}

#[tauri::command]
pub async fn spawn_agent(
    app: tauri::AppHandle,
    db_state: State<'_, DbState>, 
    pty: State<'_, PtyManager>,
    provider_id: String, 
    workspace_path: String, 
    workspace_id: String,
    config: serde_json::Value
) -> Result<String, String> {
    let msg_id = uuid::Uuid::new_v4().to_string();
    
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
    
    // Default name based on provider
    let name = format!("{} Agent", provider_id.to_uppercase());

    {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO agents (id, workspace_id, name, provider_id, agent_type, status, last_active_at) 
             VALUES (?1, ?2, ?3, ?4, 'primary', 'idle', ?5)",
            (&msg_id, &workspace_id, &name, &provider_id, &now),
        ).map_err(|e| e.to_string())?;
    }

    // Merge workspace path into config dictionary provided by frontend
    let mut final_config = config.clone();
    if let Some(obj) = final_config.as_object_mut() {
        obj.insert("workspacePath".to_string(), json!(workspace_path));
    } else {
        final_config = json!({ "workspacePath": workspace_path });
    }

    // Build environment variables from config
    let mut env = HashMap::new();
    if let Some(base_url) = config.get("baseURL").and_then(|v| v.as_str()) {
        env.insert("OPENAI_BASE_URL".to_string(), base_url.to_string());
        env.insert("ANTHROPIC_BASE_URL".to_string(), base_url.to_string());
    }
    if let Some(api_key) = config.get("apiKey").and_then(|v| v.as_str()) {
        env.insert("OPENAI_API_KEY".to_string(), api_key.to_string());
        env.insert("ANTHROPIC_API_KEY".to_string(), api_key.to_string());
    }

    let cmd = match provider_id.as_str() {
        "anthropic" => "claude",
        "openai" => "aider", // Fallback to aider for OpenAI compliant backends
        "copilot" => "gh",
        _ => "sh",
    }.to_string();

    let args = match provider_id.as_str() {
        "copilot" => vec!["copilot".to_string(), "suggest".to_string()],
        _ => vec![],
    };

    pty.spawn_cli(
        app,
        msg_id.clone(),
        cmd,
        args,
        workspace_path,
        env,
    )?;

    Ok(msg_id)
}

#[tauri::command]
pub async fn send_message(pty: State<'_, PtyManager>, agent_id: String, message: String) -> Result<(), String> {
    let mut input = message.clone();
    if !input.ends_with('\n') {
        input.push('\n');
    }
    pty.write_to_pty(&agent_id, &input)?;
    Ok(())
}

#[tauri::command]
pub fn get_setting(state: State<'_, DbState>, key: String) -> Result<Option<String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .map_err(|e| e.to_string())?;

    let mut iter = stmt.query_map([key], |row| {
        Ok(row.get::<_, String>(0)?)
    }).map_err(|e| e.to_string())?;
    
    if let Some(result) = iter.next() {
        return Ok(Some(result.map_err(|e| e.to_string())?));
    }
    
    Ok(None)
}

#[tauri::command]
pub fn set_setting(state: State<'_, DbState>, key: String, value: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) 
         ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (&key, &value),
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn fetch_models(url: String, api_key: Option<String>) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    let target_url = if url.ends_with('/') {
        format!("{}models", url)
    } else {
        format!("{}/models", url)
    };

    let mut req = client.get(&target_url);
    if let Some(key) = api_key {
        if !key.trim().is_empty() {
            req = req.bearer_auth(key);
        }
    }

    let res = req.send().await.map_err(|e| e.to_string())?;
    
    if !res.status().is_success() {
        return Err(format!("HTTP Error: {}", res.status()));
    }

    let body = res.text().await.map_err(|e| e.to_string())?;
    Ok(body)
}

