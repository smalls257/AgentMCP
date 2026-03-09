pub mod models;
pub mod db;
pub mod commands;
pub mod pty;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // Initialize Database
      let conn = db::init_db(app.handle()).expect("Failed to initialize database");
      
      app.manage(commands::DbState {
          conn: Mutex::new(conn),
      });

      app.manage(pty::PtyManager::new());

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        commands::get_workspaces,
        commands::create_workspace,
        commands::get_agents,
        commands::spawn_agent,
        commands::send_message,
        commands::get_messages,
        commands::get_tasks,
        commands::get_artifacts,
        commands::get_setting,
        commands::set_setting,
        commands::fetch_models
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
