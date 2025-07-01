// Re-export modules
pub mod crypto;
pub mod image_processor;

use wasm_bindgen::prelude::*;

// Use `wee_alloc` as the global allocator for smaller WASM size
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// Called when the wasm module is instantiated
#[wasm_bindgen(start)]
pub fn main() {
    // Set panic hook for better error messages in debug mode
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
    
    web_sys::console::log_1(&"LOGOS WASM modules initialized".into());
}