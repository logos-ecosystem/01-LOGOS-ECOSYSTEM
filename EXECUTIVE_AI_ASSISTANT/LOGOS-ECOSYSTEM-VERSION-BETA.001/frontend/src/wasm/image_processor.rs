use wasm_bindgen::prelude::*;
use wasm_bindgen::Clamped;
use web_sys::{console, ImageData};
use image::{ImageBuffer, Rgba, DynamicImage, GenericImageView, imageops::FilterType};
use base64::{Engine as _, engine::general_purpose};

#[wasm_bindgen]
pub struct ImageProcessor {
    // Internal cache for processed images
}

#[wasm_bindgen]
impl ImageProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console::log_1(&"Image Processor WASM module initialized".into());
        ImageProcessor {}
    }

    /// Resize image to specified dimensions
    #[wasm_bindgen]
    pub fn resize_image(&self, image_data: &[u8], width: u32, height: u32, maintain_aspect: bool) -> Result<Vec<u8>, JsValue> {
        let img = image::load_from_memory(image_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;
        
        let resized = if maintain_aspect {
            img.resize(width, height, FilterType::Lanczos3)
        } else {
            img.resize_exact(width, height, FilterType::Lanczos3)
        };
        
        let mut output = Vec::new();
        resized.write_to(&mut output, image::ImageOutputFormat::Png)
            .map_err(|e| JsValue::from_str(&format!("Failed to encode image: {}", e)))?;
        
        Ok(output)
    }

    /// Convert image format
    #[wasm_bindgen]
    pub fn convert_format(&self, image_data: &[u8], format: &str) -> Result<Vec<u8>, JsValue> {
        let img = image::load_from_memory(image_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;
        
        let output_format = match format.to_lowercase().as_str() {
            "png" => image::ImageOutputFormat::Png,
            "jpeg" | "jpg" => image::ImageOutputFormat::Jpeg(85),
            "webp" => image::ImageOutputFormat::WebP,
            "bmp" => image::ImageOutputFormat::Bmp,
            _ => return Err(JsValue::from_str("Unsupported format")),
        };
        
        let mut output = Vec::new();
        img.write_to(&mut output, output_format)
            .map_err(|e| JsValue::from_str(&format!("Failed to convert image: {}", e)))?;
        
        Ok(output)
    }

    /// Apply blur filter
    #[wasm_bindgen]
    pub fn apply_blur(&self, image_data: &[u8], sigma: f32) -> Result<Vec<u8>, JsValue> {
        let img = image::load_from_memory(image_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;
        
        let blurred = img.blur(sigma);
        
        let mut output = Vec::new();
        blurred.write_to(&mut output, image::ImageOutputFormat::Png)
            .map_err(|e| JsValue::from_str(&format!("Failed to encode image: {}", e)))?;
        
        Ok(output)
    }

    /// Apply grayscale filter
    #[wasm_bindgen]
    pub fn apply_grayscale(&self, image_data: &[u8]) -> Result<Vec<u8>, JsValue> {
        let img = image::load_from_memory(image_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;
        
        let grayscale = img.grayscale();
        
        let mut output = Vec::new();
        grayscale.write_to(&mut output, image::ImageOutputFormat::Png)
            .map_err(|e| JsValue::from_str(&format!("Failed to encode image: {}", e)))?;
        
        Ok(output)
    }

    /// Adjust brightness
    #[wasm_bindgen]
    pub fn adjust_brightness(&self, image_data: &[u8], value: i32) -> Result<Vec<u8>, JsValue> {
        let img = image::load_from_memory(image_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;
        
        let adjusted = img.brighten(value);
        
        let mut output = Vec::new();
        adjusted.write_to(&mut output, image::ImageOutputFormat::Png)
            .map_err(|e| JsValue::from_str(&format!("Failed to encode image: {}", e)))?;
        
        Ok(output)
    }

    /// Adjust contrast
    #[wasm_bindgen]
    pub fn adjust_contrast(&self, image_data: &[u8], contrast: f32) -> Result<Vec<u8>, JsValue> {
        let img = image::load_from_memory(image_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;
        
        let adjusted = img.adjust_contrast(contrast);
        
        let mut output = Vec::new();
        adjusted.write_to(&mut output, image::ImageOutputFormat::Png)
            .map_err(|e| JsValue::from_str(&format!("Failed to encode image: {}", e)))?;
        
        Ok(output)
    }

    /// Rotate image
    #[wasm_bindgen]
    pub fn rotate(&self, image_data: &[u8], degrees: u32) -> Result<Vec<u8>, JsValue> {
        let img = image::load_from_memory(image_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;
        
        let rotated = match degrees {
            90 => img.rotate90(),
            180 => img.rotate180(),
            270 => img.rotate270(),
            _ => return Err(JsValue::from_str("Only 90, 180, 270 degree rotations supported")),
        };
        
        let mut output = Vec::new();
        rotated.write_to(&mut output, image::ImageOutputFormat::Png)
            .map_err(|e| JsValue::from_str(&format!("Failed to encode image: {}", e)))?;
        
        Ok(output)
    }

    /// Flip image
    #[wasm_bindgen]
    pub fn flip(&self, image_data: &[u8], horizontal: bool) -> Result<Vec<u8>, JsValue> {
        let img = image::load_from_memory(image_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;
        
        let flipped = if horizontal {
            img.fliph()
        } else {
            img.flipv()
        };
        
        let mut output = Vec::new();
        flipped.write_to(&mut output, image::ImageOutputFormat::Png)
            .map_err(|e| JsValue::from_str(&format!("Failed to encode image: {}", e)))?;
        
        Ok(output)
    }

    /// Crop image
    #[wasm_bindgen]
    pub fn crop(&self, image_data: &[u8], x: u32, y: u32, width: u32, height: u32) -> Result<Vec<u8>, JsValue> {
        let mut img = image::load_from_memory(image_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;
        
        let cropped = img.crop(x, y, width, height);
        
        let mut output = Vec::new();
        cropped.write_to(&mut output, image::ImageOutputFormat::Png)
            .map_err(|e| JsValue::from_str(&format!("Failed to encode image: {}", e)))?;
        
        Ok(output)
    }

    /// Compress image with quality setting
    #[wasm_bindgen]
    pub fn compress(&self, image_data: &[u8], quality: u8) -> Result<Vec<u8>, JsValue> {
        let img = image::load_from_memory(image_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;
        
        let mut output = Vec::new();
        img.write_to(&mut output, image::ImageOutputFormat::Jpeg(quality))
            .map_err(|e| JsValue::from_str(&format!("Failed to compress image: {}", e)))?;
        
        Ok(output)
    }

    /// Generate thumbnail
    #[wasm_bindgen]
    pub fn generate_thumbnail(&self, image_data: &[u8], max_width: u32, max_height: u32) -> Result<Vec<u8>, JsValue> {
        let img = image::load_from_memory(image_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;
        
        let thumbnail = img.thumbnail(max_width, max_height);
        
        let mut output = Vec::new();
        thumbnail.write_to(&mut output, image::ImageOutputFormat::Jpeg(80))
            .map_err(|e| JsValue::from_str(&format!("Failed to generate thumbnail: {}", e)))?;
        
        Ok(output)
    }

    /// Get image dimensions
    #[wasm_bindgen]
    pub fn get_dimensions(&self, image_data: &[u8]) -> Result<JsValue, JsValue> {
        let img = image::load_from_memory(image_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;
        
        let (width, height) = img.dimensions();
        
        let result = serde_json::json!({
            "width": width,
            "height": height
        });
        
        JsValue::from_serde(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization failed: {}", e)))
    }

    /// Apply custom filter using convolution matrix
    #[wasm_bindgen]
    pub fn apply_convolution(&self, image_data: &[u8], kernel: &[f32]) -> Result<Vec<u8>, JsValue> {
        if kernel.len() != 9 {
            return Err(JsValue::from_str("Kernel must be 3x3 (9 values)"));
        }
        
        let img = image::load_from_memory(image_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;
        
        // Convert to RGBA8
        let rgba = img.to_rgba8();
        let (width, height) = rgba.dimensions();
        
        let mut output = ImageBuffer::<Rgba<u8>, Vec<u8>>::new(width, height);
        
        // Apply convolution
        for y in 1..height-1 {
            for x in 1..width-1 {
                let mut r = 0.0;
                let mut g = 0.0;
                let mut b = 0.0;
                
                for ky in 0..3 {
                    for kx in 0..3 {
                        let px = rgba.get_pixel(x + kx - 1, y + ky - 1);
                        let k_val = kernel[ky * 3 + kx];
                        
                        r += px[0] as f32 * k_val;
                        g += px[1] as f32 * k_val;
                        b += px[2] as f32 * k_val;
                    }
                }
                
                let pixel = Rgba([
                    r.max(0.0).min(255.0) as u8,
                    g.max(0.0).min(255.0) as u8,
                    b.max(0.0).min(255.0) as u8,
                    rgba.get_pixel(x, y)[3]
                ]);
                
                output.put_pixel(x, y, pixel);
            }
        }
        
        let dynamic_output = DynamicImage::ImageRgba8(output);
        let mut encoded = Vec::new();
        dynamic_output.write_to(&mut encoded, image::ImageOutputFormat::Png)
            .map_err(|e| JsValue::from_str(&format!("Failed to encode image: {}", e)))?;
        
        Ok(encoded)
    }

    /// Convert to base64
    #[wasm_bindgen]
    pub fn to_base64(&self, image_data: &[u8]) -> String {
        general_purpose::STANDARD.encode(image_data)
    }

    /// Convert from base64
    #[wasm_bindgen]
    pub fn from_base64(&self, base64_str: &str) -> Result<Vec<u8>, JsValue> {
        general_purpose::STANDARD
            .decode(base64_str)
            .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))
    }
}

// Export initialization function
#[wasm_bindgen(start)]
pub fn main() {
    console::log_1(&"WASM Image Processor loaded successfully".into());
}