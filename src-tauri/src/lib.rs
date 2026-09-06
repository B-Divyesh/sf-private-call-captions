use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder};
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

#[derive(Default)]
struct CaptionEngine {
    model: Mutex<Option<(String, Arc<WhisperContext>)>>,
}

impl CaptionEngine {
    fn context(&self, model_path: &str) -> Result<Arc<WhisperContext>, String> {
        let mut cached = self
            .model
            .lock()
            .map_err(|_| "The local speech model became unavailable.".to_string())?;
        if let Some((cached_path, context)) = cached.as_ref() {
            if cached_path == model_path {
                return Ok(Arc::clone(context));
            }
        }
        let context = Arc::new(
            WhisperContext::new_with_params(model_path, WhisperContextParameters::default())
                .map_err(|error| format!("Could not open local model: {error}"))?,
        );
        *cached = Some((model_path.to_string(), Arc::clone(&context)));
        Ok(context)
    }

    fn transcribe(&self, model_path: &str, samples: &[f32]) -> Result<String, String> {
        if samples.is_empty() {
            return Ok(String::new());
        }
        let context = self.context(model_path)?;
        let mut state = context.create_state().map_err(|error| error.to_string())?;
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_language(Some("en"));
        params.set_translate(false);
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        state
            .full(params, samples)
            .map_err(|error| error.to_string())?;
        let segments = state.full_n_segments().map_err(|error| error.to_string())?;
        let mut result = String::new();
        for index in 0..segments {
            result.push_str(
                &state
                    .full_get_segment_text(index)
                    .map_err(|error| error.to_string())?,
            );
        }
        Ok(result.trim().to_string())
    }
}

#[tauri::command]
async fn transcribe_chunk(
    model_path: String,
    samples: Vec<f32>,
    engine: State<'_, Arc<CaptionEngine>>,
) -> Result<String, String> {
    let engine = Arc::clone(engine.inner());
    tauri::async_runtime::spawn_blocking(move || engine.transcribe(&model_path, &samples))
        .await
        .map_err(|error| format!("Local transcription task failed: {error}"))?
}

#[tauri::command]
fn open_caption_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("caption") {
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }
    WebviewWindowBuilder::new(&app, "caption", WebviewUrl::App("caption.html".into()))
        .title("Private Call Captions · Caption window")
        .inner_size(760.0, 310.0)
        .min_inner_size(360.0, 180.0)
        .resizable(true)
        .build()
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .manage(Arc::new(CaptionEngine::default()))
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            transcribe_chunk,
            open_caption_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running Private Call Captions");
}
