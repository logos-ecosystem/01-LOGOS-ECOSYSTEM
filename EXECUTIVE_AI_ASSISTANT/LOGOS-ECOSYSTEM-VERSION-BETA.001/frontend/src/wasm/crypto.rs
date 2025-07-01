use wasm_bindgen::prelude::*;
use web_sys::console;
use sha2::{Sha256, Sha512, Digest};
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce
};
use ed25519_dalek::{Keypair, PublicKey, SecretKey, Signature, Signer, Verifier};
use rand::rngs::OsRng as RandOsRng;
use base64::{Engine as _, engine::general_purpose};

#[wasm_bindgen]
pub struct CryptoModule {
    // Internal state if needed
}

#[wasm_bindgen]
impl CryptoModule {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console::log_1(&"Crypto WASM module initialized".into());
        CryptoModule {}
    }

    /// Generate a new AES-256 encryption key
    #[wasm_bindgen]
    pub fn generate_aes_key() -> Result<String, JsValue> {
        let key = Aes256Gcm::generate_key(&mut OsRng);
        Ok(general_purpose::STANDARD.encode(key))
    }

    /// Encrypt data using AES-256-GCM
    #[wasm_bindgen]
    pub fn encrypt_aes(&self, plaintext: &str, key_base64: &str) -> Result<String, JsValue> {
        let key_bytes = general_purpose::STANDARD
            .decode(key_base64)
            .map_err(|e| JsValue::from_str(&format!("Invalid key: {}", e)))?;
        
        let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
        let cipher = Aes256Gcm::new(key);
        
        let nonce_bytes = rand::random::<[u8; 12]>();
        let nonce = Nonce::from_slice(&nonce_bytes);
        
        let ciphertext = cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| JsValue::from_str(&format!("Encryption failed: {}", e)))?;
        
        // Combine nonce and ciphertext
        let mut result = nonce_bytes.to_vec();
        result.extend_from_slice(&ciphertext);
        
        Ok(general_purpose::STANDARD.encode(result))
    }

    /// Decrypt data using AES-256-GCM
    #[wasm_bindgen]
    pub fn decrypt_aes(&self, ciphertext_base64: &str, key_base64: &str) -> Result<String, JsValue> {
        let key_bytes = general_purpose::STANDARD
            .decode(key_base64)
            .map_err(|e| JsValue::from_str(&format!("Invalid key: {}", e)))?;
        
        let combined = general_purpose::STANDARD
            .decode(ciphertext_base64)
            .map_err(|e| JsValue::from_str(&format!("Invalid ciphertext: {}", e)))?;
        
        if combined.len() < 12 {
            return Err(JsValue::from_str("Invalid ciphertext length"));
        }
        
        let (nonce_bytes, ciphertext) = combined.split_at(12);
        let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
        let cipher = Aes256Gcm::new(key);
        let nonce = Nonce::from_slice(nonce_bytes);
        
        let plaintext = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| JsValue::from_str(&format!("Decryption failed: {}", e)))?;
        
        String::from_utf8(plaintext)
            .map_err(|e| JsValue::from_str(&format!("Invalid UTF-8: {}", e)))
    }

    /// Generate SHA-256 hash
    #[wasm_bindgen]
    pub fn hash_sha256(&self, data: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data.as_bytes());
        let result = hasher.finalize();
        general_purpose::STANDARD.encode(result)
    }

    /// Generate SHA-512 hash
    #[wasm_bindgen]
    pub fn hash_sha512(&self, data: &str) -> String {
        let mut hasher = Sha512::new();
        hasher.update(data.as_bytes());
        let result = hasher.finalize();
        general_purpose::STANDARD.encode(result)
    }

    /// Generate Ed25519 keypair
    #[wasm_bindgen]
    pub fn generate_keypair() -> Result<JsValue, JsValue> {
        let mut csprng = RandOsRng {};
        let keypair = Keypair::generate(&mut csprng);
        
        let result = serde_json::json!({
            "publicKey": general_purpose::STANDARD.encode(keypair.public.as_bytes()),
            "secretKey": general_purpose::STANDARD.encode(keypair.secret.as_bytes())
        });
        
        JsValue::from_serde(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization failed: {}", e)))
    }

    /// Sign data with Ed25519
    #[wasm_bindgen]
    pub fn sign_ed25519(&self, message: &str, secret_key_base64: &str) -> Result<String, JsValue> {
        let secret_bytes = general_purpose::STANDARD
            .decode(secret_key_base64)
            .map_err(|e| JsValue::from_str(&format!("Invalid secret key: {}", e)))?;
        
        let secret_key = SecretKey::from_bytes(&secret_bytes)
            .map_err(|e| JsValue::from_str(&format!("Invalid secret key format: {}", e)))?;
        
        let public_key = PublicKey::from(&secret_key);
        let keypair = Keypair {
            secret: secret_key,
            public: public_key,
        };
        
        let signature = keypair.sign(message.as_bytes());
        Ok(general_purpose::STANDARD.encode(signature.to_bytes()))
    }

    /// Verify Ed25519 signature
    #[wasm_bindgen]
    pub fn verify_ed25519(&self, message: &str, signature_base64: &str, public_key_base64: &str) -> Result<bool, JsValue> {
        let signature_bytes = general_purpose::STANDARD
            .decode(signature_base64)
            .map_err(|e| JsValue::from_str(&format!("Invalid signature: {}", e)))?;
        
        let public_bytes = general_purpose::STANDARD
            .decode(public_key_base64)
            .map_err(|e| JsValue::from_str(&format!("Invalid public key: {}", e)))?;
        
        let signature = Signature::from_bytes(&signature_bytes)
            .map_err(|e| JsValue::from_str(&format!("Invalid signature format: {}", e)))?;
        
        let public_key = PublicKey::from_bytes(&public_bytes)
            .map_err(|e| JsValue::from_str(&format!("Invalid public key format: {}", e)))?;
        
        Ok(public_key.verify(message.as_bytes(), &signature).is_ok())
    }

    /// Generate random bytes
    #[wasm_bindgen]
    pub fn random_bytes(&self, length: usize) -> String {
        let mut bytes = vec![0u8; length];
        getrandom::getrandom(&mut bytes).unwrap();
        general_purpose::STANDARD.encode(bytes)
    }

    /// Derive key from password using PBKDF2
    #[wasm_bindgen]
    pub fn derive_key_pbkdf2(&self, password: &str, salt: &str, iterations: u32) -> String {
        use pbkdf2::pbkdf2_hmac;
        
        let mut key = [0u8; 32];
        pbkdf2_hmac::<Sha256>(
            password.as_bytes(),
            salt.as_bytes(),
            iterations,
            &mut key
        );
        
        general_purpose::STANDARD.encode(key)
    }
}

// Export initialization function
#[wasm_bindgen(start)]
pub fn main() {
    console::log_1(&"WASM Crypto Module loaded successfully".into());
}