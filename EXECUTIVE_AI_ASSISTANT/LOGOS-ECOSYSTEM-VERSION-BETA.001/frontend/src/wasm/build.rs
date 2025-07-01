use std::process::Command;
use std::env;

fn main() {
    println!("Building WASM modules for LOGOS Ecosystem...");
    
    // Get the project root directory
    let project_dir = env::current_dir().expect("Failed to get current directory");
    
    // Build using wasm-pack
    let status = Command::new("wasm-pack")
        .args(&[
            "build",
            "--target", "web",
            "--out-dir", "./src/wasm/pkg",
            "--out-name", "logos_wasm",
            "--no-typescript"
        ])
        .current_dir(&project_dir)
        .status()
        .expect("Failed to execute wasm-pack");
    
    if !status.success() {
        eprintln!("wasm-pack build failed!");
        std::process::exit(1);
    }
    
    println!("WASM build completed successfully!");
    
    // Generate TypeScript definitions
    println!("Generating TypeScript definitions...");
    
    let ts_content = r#"/* tslint:disable */
/* eslint-disable */
export function init(module?: WebAssembly.Module): Promise<void>;

export class CryptoModule {
  free(): void;
  constructor();
  generate_aes_key(): string;
  encrypt_aes(plaintext: string, key_base64: string): string;
  decrypt_aes(ciphertext_base64: string, key_base64: string): string;
  hash_sha256(data: string): string;
  hash_sha512(data: string): string;
  generate_keypair(): any;
  sign_ed25519(message: string, secret_key_base64: string): string;
  verify_ed25519(message: string, signature_base64: string, public_key_base64: string): boolean;
  random_bytes(length: number): string;
  derive_key_pbkdf2(password: string, salt: string, iterations: number): string;
}

export class ImageProcessor {
  free(): void;
  constructor();
  resize_image(image_data: Uint8Array, width: number, height: number, maintain_aspect: boolean): Uint8Array;
  convert_format(image_data: Uint8Array, format: string): Uint8Array;
  apply_blur(image_data: Uint8Array, sigma: number): Uint8Array;
  apply_grayscale(image_data: Uint8Array): Uint8Array;
  adjust_brightness(image_data: Uint8Array, value: number): Uint8Array;
  adjust_contrast(image_data: Uint8Array, contrast: number): Uint8Array;
  rotate(image_data: Uint8Array, degrees: number): Uint8Array;
  flip(image_data: Uint8Array, horizontal: boolean): Uint8Array;
  crop(image_data: Uint8Array, x: number, y: number, width: number, height: number): Uint8Array;
  compress(image_data: Uint8Array, quality: number): Uint8Array;
  generate_thumbnail(image_data: Uint8Array, max_width: number, max_height: number): Uint8Array;
  get_dimensions(image_data: Uint8Array): any;
  apply_convolution(image_data: Uint8Array, kernel: Float32Array): Uint8Array;
  to_base64(image_data: Uint8Array): string;
  from_base64(base64_str: string): Uint8Array;
}

export default init;
"#;
    
    std::fs::write(
        project_dir.join("src/wasm/pkg/logos_wasm.d.ts"),
        ts_content
    ).expect("Failed to write TypeScript definitions");
    
    println!("TypeScript definitions generated!");
}