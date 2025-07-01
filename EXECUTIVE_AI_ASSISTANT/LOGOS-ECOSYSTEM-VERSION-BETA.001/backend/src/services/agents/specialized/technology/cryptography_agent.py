"""Cryptography and Security Specialist Agent for LOGOS ECOSYSTEM."""

from typing import List, Dict, Any, Optional, Type
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator

from ....base_agent import (, AgentStatus, PricingModel
    BaseAIAgent, AgentMetadata, AgentCategory, PricingModel,
    AgentStatus, AgentInput, AgentOutput
)
from ....shared.utils.logger import get_logger

logger = get_logger(__name__)


class CryptographyInput(BaseModel):
    """Input schema for cryptography and security analysis."""
    task_type: str = Field(..., description="Type of cryptographic task")
    algorithm_category: str = Field(..., description="Category of cryptographic algorithm")
    security_level: str = Field(default="high", description="Required security level")
    use_case: str = Field(..., description="Specific use case or application")
    key_size: Optional[int] = Field(None, description="Key size in bits")
    performance_requirements: Optional[Dict[str, Any]] = Field(None, description="Performance constraints")
    compliance_standards: List[str] = Field(default=[], description="Required compliance standards")
    quantum_resistant: bool = Field(default=False, description="Require quantum resistance")
    
    @field_validator('task_type')
    @classmethod
    def validate_task_type(cls, v):
        valid_types = [
            'encryption', 'digital_signature', 'key_exchange', 'authentication',
            'hash_function', 'random_generation', 'protocol_design', 'cryptanalysis',
            'implementation_review', 'security_audit', 'zero_knowledge'
        ]
        if v.lower() not in valid_types:
            raise ValueError(f"Task type must be one of {valid_types}")
        return v.lower()
    
    @field_validator('algorithm_category')
    @classmethod
    def validate_algorithm_category(cls, v):
        valid_categories = [
            'symmetric', 'asymmetric', 'hash', 'mac', 'kdf', 'prng',
            'post_quantum', 'homomorphic', 'multiparty', 'blockchain'
        ]
        if v.lower() not in valid_categories:
            raise ValueError(f"Algorithm category must be one of {valid_categories}")
        return v.lower()


class CryptographyOutput(BaseModel):
    """Output schema for cryptography solutions."""
    recommendation_summary: str = Field(..., description="Summary of cryptographic recommendations")
    recommended_algorithms: List[Dict[str, Any]] = Field(..., description="Recommended algorithms with details")
    security_analysis: Dict[str, Any] = Field(..., description="Security strength analysis")
    implementation_guide: Dict[str, str] = Field(..., description="Implementation guidelines")
    key_management: Dict[str, Any] = Field(..., description="Key management recommendations")
    protocol_specification: Optional[Dict[str, Any]] = Field(None, description="Protocol design if applicable")
    attack_resistance: Dict[str, str] = Field(..., description="Resistance to various attacks")
    performance_metrics: Dict[str, Any] = Field(..., description="Expected performance characteristics")
    compliance_mapping: Dict[str, bool] = Field(..., description="Compliance with standards")
    code_examples: Dict[str, str] = Field(..., description="Implementation code examples")
    best_practices: List[str] = Field(..., description="Security best practices")
    warnings: List[str] = Field(..., description="Important security warnings")


class CryptographyAgent(BaseAgent):
    """AI agent specialized in cryptography and cryptographic security."""
    
    def __init__(self):
        metadata = AgentMetadata(
            name="Cryptography & Security Expert",
            description="Advanced AI agent for cryptographic algorithm selection, security protocol design, and cryptographic implementation guidance. Covers modern cryptography, post-quantum algorithms, and security best practices.",
            category=AgentCategory.CYBERSECURITY,
            version="1.0.0",
            author="LOGOS Cryptography Team",
            pricing_model=PricingModel.PER_USE,
            price_per_use=3.50,
            tags=["cryptography", "encryption", "security", "blockchain", "post-quantum"],
            capabilities=[
                "Recommend cryptographic algorithms",
                "Design security protocols",
                "Analyze cryptographic strength",
                "Guide secure implementations",
                "Assess quantum resistance",
                "Design key management systems",
                "Review cryptographic code",
                "Provide compliance guidance",
                "Analyze attack vectors",
                "Design zero-knowledge proofs"
            ],
            limitations=[
                "Cannot generate actual cryptographic keys",
                "Implementation requires security audit",
                "Cannot guarantee absolute security",
                "Compliance requires legal review"
            ],
            status=AgentStatus.ACTIVE,
            disclaimer="Cryptographic recommendations require expert review and security auditing before production use. Always use well-tested cryptographic libraries and follow security best practices. Never implement cryptographic primitives from scratch."
        )
        super().__init__(metadata)
        
        self._crypto_algorithms = {}
        self._security_standards = {}
    
    async def _setup(self):
        """Initialize cryptography knowledge base."""
        self._crypto_algorithms = {
            "symmetric": {
                "aes": {"key_sizes": [128, 192, 256], "modes": ["GCM", "CBC", "CTR"]},
                "chacha20": {"key_size": 256, "nonce_size": 96},
                "3des": {"deprecated": True, "reason": "Weak by modern standards"}
            },
            "asymmetric": {
                "rsa": {"key_sizes": [2048, 3072, 4096], "use": "legacy"},
                "ecc": {"curves": ["P-256", "P-384", "P-521", "Curve25519"]},
                "dsa": {"key_sizes": [2048, 3072], "use": "signatures"}
            },
            "post_quantum": {
                "kyber": {"type": "KEM", "nist_level": [1, 3, 5]},
                "dilithium": {"type": "signature", "nist_level": [2, 3, 5]},
                "falcon": {"type": "signature", "compact": True}
            },
            "hash": {
                "sha2": {"variants": ["SHA-256", "SHA-384", "SHA-512"]},
                "sha3": {"variants": ["SHA3-256", "SHA3-384", "SHA3-512"]},
                "blake2": {"variants": ["BLAKE2b", "BLAKE2s"]}
            }
        }
        
        self._security_standards = {
            "nist": ["FIPS 140-2", "FIPS 140-3", "SP 800-90A"],
            "common_criteria": ["EAL4+", "EAL5", "EAL6"],
            "pci": ["PCI-DSS 4.0"],
            "gdpr": ["Encryption requirements", "Key management"]
        }
        
        logger.info("Cryptography agent initialized with algorithm database")
    
    def get_input_schema(self) -> Type[BaseModel]:
        return CryptographyInput
    
    def get_output_schema(self) -> Type[BaseModel]:
        return CryptographyOutput
    
    async def _execute(self, input_data: AgentInput) -> AgentOutput:
        """Execute cryptographic analysis."""
        try:
            crypto_input = CryptographyInput(**input_data.input_data)
            
            prompt = await self._create_crypto_prompt(crypto_input)
            ai_response = # Get real AI analysis from Claude
            from ....ai.ai_integration import ai_service
            
            system_prompt = """You are an expert Cryptography with deep knowledge and experience.
AI agent specialized in cryptography and cryptographic security.

Your responses should be:
- Detailed and technically accurate
- Practical and actionable
- Based on current best practices
- Tailored to the specific query"""
            
            ai_response = await ai_service.complete(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.1,
                max_tokens=4000
            )
            results = await self._parse_crypto_results(ai_response, crypto_input)
            
            output = CryptographyOutput(**results)
            
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=True,
                output_data=output.model_dump(),
                tokens_used=2300
            )
        except Exception as e:
            logger.error(f"Cryptography analysis error: {str(e)}")
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=False,
                error=str(e)
            )
    
    async def _create_crypto_prompt(self, crypto_input: CryptographyInput) -> str:
        """Create cryptography analysis prompt."""
        prompt = f"""
        Analyze cryptographic requirements:
        
        Task: {crypto_input.task_type}
        Algorithm Category: {crypto_input.algorithm_category}
        Security Level: {crypto_input.security_level}
        Use Case: {crypto_input.use_case}
        Quantum Resistant: {crypto_input.quantum_resistant}
        """
        
        if crypto_input.key_size:
            prompt += f"\nKey Size: {crypto_input.key_size} bits"
        
        if crypto_input.compliance_standards:
            prompt += f"\nCompliance: {', '.join(crypto_input.compliance_standards)}"
        
        prompt += """
        
        Provide:
        1. Algorithm recommendations with justification
        2. Security strength analysis
        3. Implementation guidelines
        4. Key management strategy
        5. Protocol design (if applicable)
        6. Attack resistance assessment
        7. Performance expectations
        8. Compliance verification
        9. Code examples
        10. Best practices and warnings
        
        Focus on proven, secure algorithms.
        """
        
        return prompt
    
    async def _parse_crypto_results(
        self,
        ai_response: str,
        crypto_input: CryptographyInput
    ) -> Dict[str, Any]:
        """Parse cryptographic analysis results."""
        results = {
            "recommendation_summary": f"Cryptographic solution for {crypto_input.use_case} with {crypto_input.security_level} security",
            "recommended_algorithms": [],
            "security_analysis": {},
            "implementation_guide": {},
            "key_management": {},
            "protocol_specification": None,
            "attack_resistance": {},
            "performance_metrics": {},
            "compliance_mapping": {},
            "code_examples": {},
            "best_practices": [],
            "warnings": []
        }
        
        # Algorithm recommendations based on task
        if crypto_input.task_type == "encryption":
            if crypto_input.algorithm_category == "symmetric":
                results["recommended_algorithms"] = [
                    {
                        "algorithm": "AES-256-GCM",
                        "reason": "NIST approved, authenticated encryption",
                        "security_bits": 256,
                        "performance": "Hardware accelerated on modern CPUs"
                    },
                    {
                        "algorithm": "ChaCha20-Poly1305",
                        "reason": "Fast in software, used by TLS 1.3",
                        "security_bits": 256,
                        "performance": "Excellent on mobile/embedded"
                    }
                ]
            elif crypto_input.algorithm_category == "asymmetric":
                results["recommended_algorithms"] = [
                    {
                        "algorithm": "ECIES with P-384",
                        "reason": "Strong security, efficient",
                        "security_bits": 192,
                        "performance": "Faster than RSA"
                    }
                ]
                
        elif crypto_input.task_type == "digital_signature":
            results["recommended_algorithms"] = [
                {
                    "algorithm": "Ed25519",
                    "reason": "Fast, secure, deterministic",
                    "security_bits": 128,
                    "performance": "Very fast signing/verification"
                }
            ]
            
            if crypto_input.quantum_resistant:
                results["recommended_algorithms"].append({
                    "algorithm": "Dilithium3",
                    "reason": "NIST PQC standard, balanced security/performance",
                    "security_bits": 128,
                    "performance": "Larger signatures but quantum-safe"
                })
        
        # Security analysis
        results["security_analysis"] = {
            "effective_security_bits": 128 if not crypto_input.quantum_resistant else 256,
            "attack_complexity": "2^128 operations",
            "quantum_security": "Vulnerable" if not crypto_input.quantum_resistant else "Resistant",
            "side_channel_resistance": "Requires constant-time implementation",
            "cryptographic_agility": "Recommended for future-proofing"
        }
        
        # Implementation guide
        results["implementation_guide"] = {
            "library_recommendations": "libsodium, OpenSSL 3.0+, BouncyCastle",
            "language_specific": {
                "python": "cryptography library",
                "java": "BouncyCastle",
                "c++": "Crypto++",
                "javascript": "WebCrypto API"
            },
            "critical_points": [
                "Use cryptographically secure random numbers",
                "Implement constant-time operations",
                "Properly handle key material in memory",
                "Use authenticated encryption modes"
            ]
        }
        
        # Key management
        results["key_management"] = {
            "generation": "Use hardware RNG or /dev/urandom",
            "storage": "Hardware Security Module (HSM) or secure enclave",
            "rotation": "Every 90 days for encryption keys",
            "backup": "Encrypted backups with separate master key",
            "destruction": "Secure overwrite with random data"
        }
        
        # Attack resistance
        results["attack_resistance"] = {
            "brute_force": "Infeasible with 256-bit keys",
            "cryptanalysis": "No known weaknesses in recommended algorithms",
            "side_channel": "Requires careful implementation",
            "quantum": "Resistant" if crypto_input.quantum_resistant else "Use post-quantum algorithms",
            "implementation": "Use well-tested libraries"
        }
        
        # Performance metrics
        results["performance_metrics"] = {
            "aes_256_gcm": {
                "throughput": "3-5 GB/s with AES-NI",
                "latency": "< 1 microsecond per block"
            },
            "ed25519": {
                "sign_time": "~50 microseconds",
                "verify_time": "~150 microseconds"
            }
        }
        
        # Code examples
        results["code_examples"]["python"] = """
# Python example using cryptography library
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

# Generate key
key = AESGCM.generate_key(bit_length=256)

# Encrypt
aesgcm = AESGCM(key)
nonce = os.urandom(12)  # 96-bit nonce for GCM
ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data)

# Decrypt
plaintext = aesgcm.decrypt(nonce, ciphertext, associated_data)
"""
        
        # Best practices
        results["best_practices"] = [
            "Never roll your own crypto",
            "Use established cryptographic libraries",
            "Keep libraries updated",
            "Use secure random number generation",
            "Implement proper key management",
            "Use authenticated encryption",
            "Plan for cryptographic agility"
        ]
        
        # Warnings
        results["warnings"] = [
            "This is educational guidance - get security audit before production",
            "Cryptographic parameters may need adjustment based on threat model",
            "Implementation details are critical for security",
            "Consider post-quantum migration timeline"
        ]
        
        return results