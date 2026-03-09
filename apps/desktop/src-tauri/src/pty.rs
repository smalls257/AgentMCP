use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};

pub struct PtyManager {
    sessions: Mutex<HashMap<String, Arc<Mutex<Box<dyn Write + Send>>>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        PtyManager {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn spawn_cli(
        &self,
        app: AppHandle,
        agent_id: String,
        cmd: String,
        args: Vec<String>,
        cwd: String,
        env: HashMap<String, String>,
    ) -> Result<(), String> {
        let pty_system = NativePtySystem::default();
        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        let mut cmd_builder = CommandBuilder::new(&cmd);
        cmd_builder.args(&args);
        cmd_builder.cwd(&cwd);
        for (k, v) in env {
            cmd_builder.env(k, v);
        }

        // Spawn child in PTY
        let _child = pair.slave.spawn_command(cmd_builder).map_err(|e| e.to_string())?;
        
        let reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
        
        self.sessions.lock().unwrap().insert(agent_id.clone(), Arc::new(Mutex::new(writer)));

        let agent_id_clone = agent_id.clone();
        
        // Background thread to read from PTY stdout and emit to Svelte
        thread::spawn(move || {
            let mut reader = reader;
            let mut buf = [0u8; 1024];
            loop {
                match reader.read(&mut buf) {
                    Ok(n) if n > 0 => {
                        let text = String::from_utf8_lossy(&buf[..n]).to_string();
                        // Emit to frontend
                        let event_payload = serde_json::json!({
                            "agentId": agent_id_clone,
                            "type": "terminal_output",
                            "data": text
                        });
                        let _ = app.emit("pty-output", event_payload);
                    }
                    _ => break, // EOF or error
                }
            }
            
            // Emit exit event
            let event_payload = serde_json::json!({
                "agentId": agent_id_clone,
                "type": "terminal_exit"
            });
            let _ = app.emit("pty-output", event_payload);
        });

        Ok(())
    }

    pub fn write_to_pty(&self, agent_id: &str, input: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        if let Some(writer) = sessions.get_mut(agent_id) {
            let mut w = writer.lock().unwrap();
            w.write_all(input.as_bytes()).map_err(|e| e.to_string())?;
            w.flush().map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err(format!("Agent {} not found", agent_id))
        }
    }
}
