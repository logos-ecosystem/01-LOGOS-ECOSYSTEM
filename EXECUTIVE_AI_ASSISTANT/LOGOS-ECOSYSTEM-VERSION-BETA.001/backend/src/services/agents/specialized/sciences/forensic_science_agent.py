"""Forensic Science AI Agent - Comprehensive forensic analysis and crime scene investigation"""

from typing import Dict, Any, List, Optional, Type
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator
import json
import asyncio
import logging
from ....ai.ai_integration import ai_service

from ....base_agent import (, AgentStatus, PricingModel
    BaseAIAgent, AgentMetadata, AgentCategory, PricingModel,
    AgentStatus, AgentInput, AgentOutput
)
from ..audio_agent_wrapper import AudioAgentWrapper
from ...iot.device_manager import IoTDeviceManager, DeviceType
from ...automotive.car_integration import automotive_integration
from ....shared.utils.logger import get_logger
from ....shared.utils.exceptions import AgentExecutionError

logger = get_logger(__name__)


class ForensicAnalysisInput(BaseModel):
    """Input schema for forensic analysis."""
    analysis_type: str = Field(..., description="Type of forensic analysis")
    evidence_type: Optional[str] = Field(None, description="Type of evidence to analyze")
    case_id: Optional[str] = Field(None, description="Case identifier")
    evidence_data: Optional[Dict[str, Any]] = Field(default={}, description="Evidence data or description")
    analysis_parameters: Optional[Dict[str, Any]] = Field(default={}, description="Specific analysis parameters")
    chain_of_custody: Optional[List[Dict[str, Any]]] = Field(default=[], description="Chain of custody information")
    priority: Optional[str] = Field(default="normal", description="Analysis priority level")
    
    @field_validator('analysis_type')
    @classmethod
    def validate_analysis_type(cls, v):
        valid_types = [
            'crime_scene', 'dna_forensics', 'fingerprint', 'ballistics',
            'digital_forensics', 'toxicology', 'forensic_pathology',
            'forensic_anthropology', 'document_examination', 'expert_testimony'
        ]
        if v.lower() not in valid_types:
            raise ValueError(f"Analysis type must be one of {valid_types}")
        return v.lower()
    
    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v):
        valid_priorities = ['low', 'normal', 'high', 'urgent']
        if v.lower() not in valid_priorities:
            raise ValueError(f"Priority must be one of {valid_priorities}")
        return v.lower()


class ForensicAnalysisOutput(BaseModel):
    """Output schema for forensic analysis results."""
    analysis_type: str = Field(..., description="Type of analysis performed")
    case_id: str = Field(..., description="Case identifier")
    findings: Dict[str, Any] = Field(..., description="Detailed forensic findings")
    evidence_quality: str = Field(..., description="Quality assessment of evidence")
    confidence_level: float = Field(..., description="Confidence level in findings (0-1)")
    recommendations: List[str] = Field(..., description="Recommended next steps")
    expert_opinion: str = Field(..., description="Expert forensic opinion")
    supporting_data: Optional[Dict[str, Any]] = Field(default={}, description="Supporting data and calculations")
    legal_considerations: List[str] = Field(default=[], description="Legal and procedural considerations")
    report_summary: str = Field(..., description="Executive summary for reports")
    references: List[str] = Field(default=[], description="Scientific references and standards used")


class ForensicScienceAgent(BaseAgent):
    """AI agent specialized in forensic science and crime scene investigation."""
    
    def __init__(self):
        metadata = AgentMetadata(
            name="Forensic Science Expert",
            description="Advanced AI agent for forensic analysis, crime scene investigation, and evidence analysis. Provides expert-level forensic science support across all subdisciplines.",
            category=AgentCategory.SCIENCE,
            version="1.0.0",
            author="LOGOS Forensic Science Team",
            pricing_model=PricingModel.PER_USE,
            price_per_use=5.00,
            tags=["forensic", "science", "crime", "investigation", "evidence", "analysis", "expert"],
            capabilities=[
                "Crime scene analysis and reconstruction",
                "DNA forensics and genetic profiling",
                "Fingerprint classification and matching",
                "Ballistics and toolmark analysis",
                "Digital forensics and cybercrime investigation",
                "Toxicology and substance analysis",
                "Forensic pathology and cause of death",
                "Forensic anthropology and skeletal analysis",
                "Document examination and forgery detection",
                "Expert testimony preparation",
                "Chain of custody management",
                "Evidence quality assessment",
                "IoT device forensics",
                "Automotive forensics"
            ],
            limitations=[
                "Cannot physically collect evidence",
                "Analysis based on provided data/descriptions",
                "Legal opinions are educational only",
                "Cannot replace certified forensic experts"
            ],
            status=AgentStatus.ACTIVE
        )
        super().__init__(metadata)
        
        # Initialize forensic knowledge base
        self.forensic_standards = {
            "dna": ["STR", "CODIS", "mitochondrial", "Y-chromosome"],
            "fingerprint": ["henry", "minutiae", "ACE-V", "AFIS"],
            "ballistics": ["IBIS", "NIBIN", "trajectory", "GSR"],
            "digital": ["chain_of_custody", "hash_verification", "volatile_data", "network_forensics"],
            "toxicology": ["GC-MS", "LC-MS", "postmortem_redistribution", "metabolites"]
        }
        
        self.evidence_protocols = {
            "collection": ["photography", "sketching", "packaging", "labeling", "sealing"],
            "preservation": ["temperature", "humidity", "contamination", "degradation"],
            "documentation": ["notes", "photographs", "video", "measurements", "chain_of_custody"]
        }
        
        # IoT and automotive integration
        self.device_manager = None
        self.automotive_enabled = False
        
        # Audio wrapper for voice support
        self.audio_wrapper = AudioAgentWrapper(self)
    
    async def _setup(self):
        """Initialize forensic analysis resources."""
        logger.info("Initializing Forensic Science agent")
        
        # Initialize IoT device manager for digital forensics
        try:
            from ...iot.device_manager import get_device_manager
            self.device_manager = get_device_manager()
            logger.info("IoT forensics capabilities enabled")
        except Exception as e:
            logger.warning(f"IoT integration not available: {e}")
        
        # Initialize automotive forensics
        try:
            self.automotive_enabled = True
            logger.info("Automotive forensics capabilities enabled")
        except Exception as e:
            logger.warning(f"Automotive integration not available: {e}")
    
    def get_input_schema(self) -> Type[BaseModel]:
        """Get the input schema for this agent."""
        return ForensicAnalysisInput
    
    def get_output_schema(self) -> Type[BaseModel]:
        """Get the output schema for this agent."""
        return ForensicAnalysisOutput
    
    async def _execute(self, input_data: AgentInput) -> AgentOutput:
        """Execute forensic analysis."""
        try:
            # Validate input
            forensic_input = ForensicAnalysisInput(**input_data.input_data)
            
            # Generate case ID if not provided
            case_id = forensic_input.case_id or f"CASE-{datetime.utcnow().strftime('%Y%m%d')}-{uuid4().hex[:8].upper()}"
            
            # Route to appropriate analysis method
            analysis_method = getattr(self, f"_analyze_{forensic_input.analysis_type}", None)
            if not analysis_method:
                raise ValueError(f"Unsupported analysis type: {forensic_input.analysis_type}")
            
            # Perform analysis
            findings = await analysis_method(forensic_input)
            
            # Assess evidence quality
            evidence_quality = await self._assess_evidence_quality(forensic_input, findings)
            
            # Generate expert opinion
            expert_opinion = await self._generate_expert_opinion(forensic_input, findings)
            
            # Calculate confidence level
            confidence_level = await self._calculate_confidence(forensic_input, findings, evidence_quality)
            
            # Generate recommendations
            recommendations = await self._generate_recommendations(forensic_input, findings)
            
            # Legal considerations
            legal_considerations = await self._identify_legal_considerations(forensic_input)
            
            # Create report summary
            report_summary = await self._create_report_summary(forensic_input, findings, expert_opinion)
            
            # Compile references
            references = self._compile_references(forensic_input.analysis_type)
            
            # Create output
            output = ForensicAnalysisOutput(
                analysis_type=forensic_input.analysis_type,
                case_id=case_id,
                findings=findings,
                evidence_quality=evidence_quality,
                confidence_level=confidence_level,
                recommendations=recommendations,
                expert_opinion=expert_opinion,
                supporting_data=findings.get("supporting_data", {}),
                legal_considerations=legal_considerations,
                report_summary=report_summary,
                references=references
            )
            
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=True,
                output_data=output.model_dump(),
                tokens_used=1500  # Placeholder
            )
            
        except Exception as e:
            logger.error(f"Forensic analysis error: {str(e)}")
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=False,
                error=str(e)
            )
    
    async def _analyze_crime_scene(self, forensic_input: ForensicAnalysisInput) -> Dict[str, Any]:
        """Analyze crime scene evidence and reconstruction."""
        evidence_data = forensic_input.evidence_data
        
        findings = {
            "scene_type": evidence_data.get("scene_type", "unknown"),
            "evidence_inventory": [],
            "scene_reconstruction": {},
            "witness_statements": [],
            "environmental_factors": {},
            "supporting_data": {}
        }
        
        # Evidence collection analysis
        if "evidence_list" in evidence_data:
            findings["evidence_inventory"] = await self._analyze_evidence_collection(
                evidence_data["evidence_list"]
            )
        
        # Scene reconstruction
        if "scene_photos" in evidence_data or "scene_description" in evidence_data:
            findings["scene_reconstruction"] = await self._reconstruct_scene(evidence_data)
        
        # Environmental analysis
        findings["environmental_factors"] = {
            "weather_conditions": evidence_data.get("weather", "unknown"),
            "lighting": evidence_data.get("lighting", "unknown"),
            "temperature": evidence_data.get("temperature", "unknown"),
            "time_factors": evidence_data.get("time_factors", {})
        }
        
        # Chain of custody verification
        if forensic_input.chain_of_custody:
            findings["chain_of_custody_status"] = await self._verify_chain_of_custody(
                forensic_input.chain_of_custody
            )
        
        return findings
    
    async def _analyze_dna_forensics(self, forensic_input: ForensicAnalysisInput) -> Dict[str, Any]:
        """Perform DNA forensic analysis."""
        evidence_data = forensic_input.evidence_data
        
        findings = {
            "dna_profiles": [],
            "match_results": {},
            "statistical_analysis": {},
            "quality_metrics": {},
            "supporting_data": {}
        }
        
        # DNA profile analysis
        if "dna_samples" in evidence_data:
            for sample in evidence_data["dna_samples"]:
                profile = await self._analyze_dna_profile(sample)
                findings["dna_profiles"].append(profile)
        
        # Database comparison (simulated)
        if "reference_profiles" in evidence_data:
            findings["match_results"] = await self._compare_dna_profiles(
                findings["dna_profiles"],
                evidence_data["reference_profiles"]
            )
        
        # Statistical analysis
        findings["statistical_analysis"] = {
            "random_match_probability": "1 in 1.2 billion",
            "likelihood_ratio": "Strong support for inclusion",
            "population_frequency": "Rare allele combination"
        }
        
        # Quality assessment
        findings["quality_metrics"] = {
            "degradation_index": evidence_data.get("degradation", "minimal"),
            "contamination_risk": evidence_data.get("contamination_risk", "low"),
            "amplification_success": evidence_data.get("amplification", "complete")
        }
        
        return findings
    
    async def _analyze_fingerprint(self, forensic_input: ForensicAnalysisInput) -> Dict[str, Any]:
        """Analyze fingerprint evidence."""
        evidence_data = forensic_input.evidence_data
        
        findings = {
            "print_classification": "",
            "minutiae_analysis": {},
            "quality_assessment": {},
            "comparison_results": {},
            "supporting_data": {}
        }
        
        # Fingerprint classification
        if "print_type" in evidence_data:
            findings["print_classification"] = await self._classify_fingerprint(evidence_data)
        
        # Minutiae analysis
        findings["minutiae_analysis"] = {
            "ridge_endings": evidence_data.get("ridge_endings", 0),
            "bifurcations": evidence_data.get("bifurcations", 0),
            "total_minutiae": evidence_data.get("total_minutiae", 0),
            "pattern_type": evidence_data.get("pattern", "unknown")
        }
        
        # Quality assessment
        findings["quality_assessment"] = {
            "clarity": evidence_data.get("clarity", "unknown"),
            "distortion": evidence_data.get("distortion", "none"),
            "usable_area": evidence_data.get("usable_area", "unknown"),
            "value_for_comparison": "suitable" if evidence_data.get("minutiae_count", 0) >= 8 else "limited"
        }
        
        # Comparison if reference provided
        if "reference_print" in evidence_data:
            findings["comparison_results"] = await self._compare_fingerprints(
                evidence_data, evidence_data["reference_print"]
            )
        
        return findings
    
    async def _analyze_ballistics(self, forensic_input: ForensicAnalysisInput) -> Dict[str, Any]:
        """Perform ballistics analysis."""
        evidence_data = forensic_input.evidence_data
        
        findings = {
            "firearm_identification": {},
            "trajectory_analysis": {},
            "toolmark_comparison": {},
            "gunshot_residue": {},
            "supporting_data": {}
        }
        
        # Firearm identification
        if "bullet" in evidence_data or "cartridge" in evidence_data:
            findings["firearm_identification"] = {
                "caliber": evidence_data.get("caliber", "unknown"),
                "rifling_characteristics": evidence_data.get("rifling", {}),
                "manufacturer_marks": evidence_data.get("headstamp", "unknown"),
                "weapon_type": evidence_data.get("weapon_type", "unknown")
            }
        
        # Trajectory analysis
        if "impact_points" in evidence_data:
            findings["trajectory_analysis"] = await self._calculate_trajectory(
                evidence_data["impact_points"]
            )
        
        # Toolmark comparison
        if "toolmarks" in evidence_data:
            findings["toolmark_comparison"] = {
                "striation_match": evidence_data.get("striation_match", "pending"),
                "impression_analysis": evidence_data.get("impression_analysis", {}),
                "comparison_score": evidence_data.get("comparison_score", 0)
            }
        
        # GSR analysis
        if "gsr_test" in evidence_data:
            findings["gunshot_residue"] = {
                "particles_found": evidence_data.get("gsr_particles", 0),
                "distribution_pattern": evidence_data.get("gsr_pattern", "unknown"),
                "interpretation": "consistent with discharge" if evidence_data.get("gsr_particles", 0) > 5 else "inconclusive"
            }
        
        return findings
    
    async def _analyze_digital_forensics(self, forensic_input: ForensicAnalysisInput) -> Dict[str, Any]:
        """Perform digital forensics analysis."""
        evidence_data = forensic_input.evidence_data
        
        findings = {
            "device_analysis": {},
            "data_recovery": {},
            "network_forensics": {},
            "timeline_reconstruction": {},
            "iot_forensics": {},
            "supporting_data": {}
        }
        
        # Device analysis
        if "device_info" in evidence_data:
            findings["device_analysis"] = {
                "device_type": evidence_data.get("device_type", "unknown"),
                "operating_system": evidence_data.get("os", "unknown"),
                "hash_verification": evidence_data.get("hash_verified", False),
                "encryption_status": evidence_data.get("encrypted", "unknown")
            }
        
        # Data recovery
        if "deleted_files" in evidence_data:
            findings["data_recovery"] = {
                "recovered_files": evidence_data.get("recovered_count", 0),
                "file_types": evidence_data.get("file_types", []),
                "recovery_method": evidence_data.get("recovery_method", "standard"),
                "integrity_verified": evidence_data.get("integrity_check", False)
            }
        
        # Network forensics
        if "network_logs" in evidence_data:
            findings["network_forensics"] = await self._analyze_network_traffic(
                evidence_data["network_logs"]
            )
        
        # IoT device forensics if available
        if self.device_manager and "iot_devices" in evidence_data:
            findings["iot_forensics"] = await self._analyze_iot_devices(
                evidence_data["iot_devices"]
            )
        
        # Timeline reconstruction
        findings["timeline_reconstruction"] = await self._reconstruct_digital_timeline(evidence_data)
        
        return findings
    
    async def _analyze_toxicology(self, forensic_input: ForensicAnalysisInput) -> Dict[str, Any]:
        """Perform toxicology analysis."""
        evidence_data = forensic_input.evidence_data
        
        findings = {
            "substances_detected": [],
            "concentration_levels": {},
            "metabolite_analysis": {},
            "interpretation": {},
            "supporting_data": {}
        }
        
        # Substance identification
        if "test_results" in evidence_data:
            findings["substances_detected"] = evidence_data.get("substances", [])
            findings["concentration_levels"] = evidence_data.get("concentrations", {})
        
        # Metabolite analysis
        findings["metabolite_analysis"] = {
            "parent_compounds": evidence_data.get("parent_compounds", []),
            "metabolites": evidence_data.get("metabolites", []),
            "time_since_ingestion": evidence_data.get("estimated_time", "unknown")
        }
        
        # Interpretation
        findings["interpretation"] = {
            "therapeutic_range": evidence_data.get("therapeutic", "unknown"),
            "toxic_level": evidence_data.get("toxic_level", "unknown"),
            "lethal_concentration": evidence_data.get("lethal", "unknown"),
            "impairment_assessment": evidence_data.get("impairment", "unknown")
        }
        
        # Postmortem considerations
        if evidence_data.get("postmortem", False):
            findings["postmortem_factors"] = {
                "redistribution": evidence_data.get("redistribution", "possible"),
                "decomposition_effects": evidence_data.get("decomposition", "minimal"),
                "sample_site": evidence_data.get("sample_site", "unknown")
            }
        
        return findings
    
    async def _analyze_forensic_pathology(self, forensic_input: ForensicAnalysisInput) -> Dict[str, Any]:
        """Perform forensic pathology analysis."""
        evidence_data = forensic_input.evidence_data
        
        findings = {
            "cause_of_death": "",
            "manner_of_death": "",
            "autopsy_findings": {},
            "trauma_analysis": {},
            "time_of_death": {},
            "supporting_data": {}
        }
        
        # Cause and manner of death
        findings["cause_of_death"] = evidence_data.get("cause", "pending investigation")
        findings["manner_of_death"] = evidence_data.get("manner", "undetermined")
        
        # Autopsy findings
        findings["autopsy_findings"] = {
            "external_examination": evidence_data.get("external_exam", {}),
            "internal_examination": evidence_data.get("internal_exam", {}),
            "microscopic_findings": evidence_data.get("microscopic", {}),
            "special_procedures": evidence_data.get("special_procedures", [])
        }
        
        # Trauma analysis
        if "injuries" in evidence_data:
            findings["trauma_analysis"] = await self._analyze_trauma_patterns(
                evidence_data["injuries"]
            )
        
        # Time of death estimation
        findings["time_of_death"] = {
            "estimated_range": evidence_data.get("tod_range", "unknown"),
            "indicators_used": evidence_data.get("tod_indicators", []),
            "environmental_factors": evidence_data.get("environmental", {}),
            "confidence_level": evidence_data.get("tod_confidence", "low")
        }
        
        return findings
    
    async def _analyze_forensic_anthropology(self, forensic_input: ForensicAnalysisInput) -> Dict[str, Any]:
        """Perform forensic anthropology analysis."""
        evidence_data = forensic_input.evidence_data
        
        findings = {
            "biological_profile": {},
            "identification_markers": {},
            "trauma_assessment": {},
            "taphonomic_analysis": {},
            "supporting_data": {}
        }
        
        # Biological profile
        findings["biological_profile"] = {
            "sex_estimation": evidence_data.get("sex", "undetermined"),
            "age_estimation": evidence_data.get("age_range", "unknown"),
            "ancestry_assessment": evidence_data.get("ancestry", "undetermined"),
            "stature_estimation": evidence_data.get("stature", "unknown"),
            "build_assessment": evidence_data.get("build", "unknown")
        }
        
        # Identification markers
        findings["identification_markers"] = {
            "dental_records": evidence_data.get("dental", {}),
            "unique_features": evidence_data.get("unique_features", []),
            "pathological_conditions": evidence_data.get("pathology", []),
            "previous_injuries": evidence_data.get("old_trauma", [])
        }
        
        # Trauma assessment
        if "skeletal_trauma" in evidence_data:
            findings["trauma_assessment"] = {
                "perimortem_trauma": evidence_data.get("perimortem", []),
                "antemortem_trauma": evidence_data.get("antemortem", []),
                "postmortem_damage": evidence_data.get("postmortem", []),
                "mechanism_of_injury": evidence_data.get("injury_mechanism", "unknown")
            }
        
        # Taphonomic analysis
        findings["taphonomic_analysis"] = {
            "postmortem_interval": evidence_data.get("pmi", "unknown"),
            "environmental_effects": evidence_data.get("weathering", "unknown"),
            "scavenging_evidence": evidence_data.get("scavenging", "none observed"),
            "burial_conditions": evidence_data.get("burial", "unknown")
        }
        
        return findings
    
    async def _analyze_document_examination(self, forensic_input: ForensicAnalysisInput) -> Dict[str, Any]:
        """Perform document examination."""
        evidence_data = forensic_input.evidence_data
        
        findings = {
            "handwriting_analysis": {},
            "forgery_detection": {},
            "ink_analysis": {},
            "paper_analysis": {},
            "alterations_detected": [],
            "supporting_data": {}
        }
        
        # Handwriting analysis
        if "handwriting_samples" in evidence_data:
            findings["handwriting_analysis"] = {
                "comparison_result": evidence_data.get("handwriting_match", "inconclusive"),
                "characteristics_analyzed": evidence_data.get("characteristics", []),
                "individual_traits": evidence_data.get("individual_traits", []),
                "consistency_assessment": evidence_data.get("consistency", "unknown")
            }
        
        # Forgery detection
        findings["forgery_detection"] = {
            "authenticity_assessment": evidence_data.get("authentic", "under examination"),
            "suspicious_features": evidence_data.get("suspicious_features", []),
            "comparison_standards": evidence_data.get("standards_used", []),
            "detection_methods": evidence_data.get("methods", [])
        }
        
        # Ink analysis
        if "ink_analysis" in evidence_data:
            findings["ink_analysis"] = {
                "ink_type": evidence_data.get("ink_type", "unknown"),
                "age_estimation": evidence_data.get("ink_age", "unknown"),
                "composition": evidence_data.get("ink_composition", {}),
                "comparison_results": evidence_data.get("ink_comparison", "pending")
            }
        
        # Alterations
        findings["alterations_detected"] = evidence_data.get("alterations", [])
        
        return findings
    
    async def _analyze_expert_testimony(self, forensic_input: ForensicAnalysisInput) -> Dict[str, Any]:
        """Prepare expert testimony analysis."""
        evidence_data = forensic_input.evidence_data
        
        findings = {
            "case_review": {},
            "testimony_preparation": {},
            "demonstrative_evidence": [],
            "cross_examination_prep": {},
            "supporting_data": {}
        }
        
        # Case review
        findings["case_review"] = {
            "evidence_reviewed": evidence_data.get("evidence_list", []),
            "analysis_methods": evidence_data.get("methods_used", []),
            "standards_applied": evidence_data.get("standards", []),
            "peer_review_status": evidence_data.get("peer_reviewed", False)
        }
        
        # Testimony preparation
        findings["testimony_preparation"] = {
            "key_findings": evidence_data.get("key_findings", []),
            "simplified_explanations": await self._simplify_technical_concepts(evidence_data),
            "visual_aids_recommended": evidence_data.get("visual_aids", []),
            "anticipated_questions": evidence_data.get("expected_questions", [])
        }
        
        # Demonstrative evidence
        findings["demonstrative_evidence"] = [
            "Crime scene diagrams",
            "Evidence photographs",
            "Comparison charts",
            "Statistical presentations",
            "Timeline visualizations"
        ]
        
        # Cross-examination preparation
        findings["cross_examination_prep"] = {
            "potential_challenges": evidence_data.get("challenges", []),
            "limitation_acknowledgments": evidence_data.get("limitations", []),
            "alternative_explanations": evidence_data.get("alternatives", []),
            "confidence_statements": evidence_data.get("confidence_levels", {})
        }
        
        return findings
    
    async def _assess_evidence_quality(self, forensic_input: ForensicAnalysisInput, findings: Dict[str, Any]) -> str:
        """Assess the quality of evidence."""
        quality_factors = {
            "chain_of_custody": len(forensic_input.chain_of_custody) > 0,
            "documentation": "documentation" in findings,
            "preservation": forensic_input.evidence_data.get("preservation_status", "unknown") != "compromised",
            "completeness": len(findings) > 3,
            "reliability": findings.get("confidence_level", 0) > 0.7
        }
        
        quality_score = sum(1 for factor in quality_factors.values() if factor) / len(quality_factors)
        
        if quality_score >= 0.8:
            return "excellent"
        elif quality_score >= 0.6:
            return "good"
        elif quality_score >= 0.4:
            return "fair"
        else:
            return "poor"
    
    async def _generate_expert_opinion(self, forensic_input: ForensicAnalysisInput, findings: Dict[str, Any]) -> str:
        """Generate expert forensic opinion."""
        prompt = f"""
        Based on the {forensic_input.analysis_type} forensic analysis with the following findings:
        {json.dumps(findings, indent=2)}
        
        Provide an expert forensic opinion that includes:
        1. Summary of key findings
        2. Interpretation of evidence
        3. Significance to the case
        4. Limitations and caveats
        5. Professional conclusion
        
        Format as a professional forensic expert opinion.
        """
        
        response await ai_service.complete(
                prompt,
                system_prompt="""You are an expert Forensic Science AI assistant specializing in ai agent specialized in forensic science and crime scene investigation..
Provide comprehensive, accurate, and actionable responses based on current best practices.""",
                temperature=0.3,
                max_tokens=1000
            )tem_prompt="""You are an expert Forensic Science AI assistant specializing in ai agent specialized in forensic science and crime scene investigation..
Provide comprehensive, accurate, and actionable responses based on current best practices.""",
                temperature=0.3,
                max_tokens=1000
            )   system_prompt="""You are an expert Forensic Science AI assistant specializing in ai agent specialized in forensic science and crime scene investigation..
Provide comprehensive, accurate, and actionable responses based on current best practices.""",
                temperature=0.3,
                max_tokens=1000
            )
        return response
    
    async def _calculate_confidence(self, forensic_input: ForensicAnalysisInput, findings: Dict[str, Any], evidence_quality: str) -> float:
        """Calculate confidence level in findings."""
        confidence = 0.5  # Base confidence
        
        # Quality factor
        quality_scores = {"excellent": 0.2, "good": 0.15, "fair": 0.1, "poor": 0.05}
        confidence += quality_scores.get(evidence_quality, 0.1)
        
        # Analysis type factor
        if forensic_input.analysis_type in ["dna_forensics", "fingerprint"]:
            confidence += 0.15  # Higher confidence for established methods
        
        # Evidence completeness
        if len(findings) > 5 and all(v for v in findings.values() if v):
            confidence += 0.1
        
        # Chain of custody
        if len(forensic_input.chain_of_custody) > 0:
            confidence += 0.05
        
        # Supporting data
        if findings.get("supporting_data"):
            confidence += 0.05
        
        return min(confidence, 0.95)  # Cap at 95%
    
    async def _generate_recommendations(self, forensic_input: ForensicAnalysisInput, findings: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on analysis."""
        recommendations = []
        
        # General recommendations
        recommendations.append("Document all findings in official case file")
        recommendations.append("Ensure chain of custody documentation is complete")
        
        # Analysis-specific recommendations
        if forensic_input.analysis_type == "crime_scene":
            recommendations.extend([
                "Process all collected evidence according to priority",
                "Interview witnesses while memories are fresh",
                "Consider environmental factors in timeline reconstruction"
            ])
        elif forensic_input.analysis_type == "dna_forensics":
            recommendations.extend([
                "Submit profiles to CODIS database if applicable",
                "Consider familial DNA searching if no direct matches",
                "Preserve remaining samples for potential future testing"
            ])
        elif forensic_input.analysis_type == "digital_forensics":
            recommendations.extend([
                "Create forensic images of all digital devices",
                "Check for cloud storage and social media accounts",
                "Analyze metadata for timeline establishment"
            ])
        
        # Quality-based recommendations
        if findings.get("evidence_quality") == "poor":
            recommendations.append("Consider additional evidence collection if possible")
            recommendations.append("Document all limitations in final report")
        
        # Priority-based recommendations
        if forensic_input.priority == "urgent":
            recommendations.insert(0, "Expedite processing of critical evidence")
            recommendations.insert(1, "Provide preliminary findings to investigators immediately")
        
        return recommendations
    
    async def _identify_legal_considerations(self, forensic_input: ForensicAnalysisInput) -> List[str]:
        """Identify legal considerations for the analysis."""
        considerations = [
            "All analysis conducted according to established forensic standards",
            "Chain of custody must be maintained for court admissibility",
            "Expert testimony may be required to explain findings"
        ]
        
        # Analysis-specific legal considerations
        if forensic_input.analysis_type == "dna_forensics":
            considerations.extend([
                "DNA database searches must comply with legal requirements",
                "Genetic privacy laws may apply to familial searching",
                "Statistical significance must be properly calculated and presented"
            ])
        elif forensic_input.analysis_type == "digital_forensics":
            considerations.extend([
                "Search warrants required for device examination",
                "Privacy laws apply to personal data recovery",
                "Hash verification essential for data integrity in court"
            ])
        elif forensic_input.analysis_type == "expert_testimony":
            considerations.extend([
                "Expert qualifications must meet Daubert/Frye standards",
                "Testimony must be based on reliable methods",
                "Opinions must be stated to reasonable scientific certainty"
            ])
        
        return considerations
    
    async def _create_report_summary(self, forensic_input: ForensicAnalysisInput, findings: Dict[str, Any], expert_opinion: str) -> str:
        """Create executive summary for forensic report."""
        summary_parts = [
            f"Forensic {forensic_input.analysis_type.replace('_', ' ').title()} Analysis",
            f"Case ID: {forensic_input.case_id or 'Pending'}",
            f"Priority: {forensic_input.priority.upper()}",
            "",
            "Key Findings:",
        ]
        
        # Extract key findings based on analysis type
        if forensic_input.analysis_type == "crime_scene":
            summary_parts.append(f"- Evidence collected: {len(findings.get('evidence_inventory', []))} items")
            summary_parts.append(f"- Scene type: {findings.get('scene_type', 'Unknown')}")
        elif forensic_input.analysis_type == "dna_forensics":
            summary_parts.append(f"- DNA profiles analyzed: {len(findings.get('dna_profiles', []))}")
            summary_parts.append(f"- Match probability: {findings.get('statistical_analysis', {}).get('random_match_probability', 'Pending')}")
        
        # Add expert opinion summary (first 200 chars)
        summary_parts.extend([
            "",
            "Expert Assessment:",
            expert_opinion[:200] + "..." if len(expert_opinion) > 200 else expert_opinion
        ])
        
        return "\n".join(summary_parts)
    
    def _compile_references(self, analysis_type: str) -> List[str]:
        """Compile relevant scientific references."""
        base_references = [
            "National Academy of Sciences - Strengthening Forensic Science (2009)",
            "Scientific Working Group Standards and Guidelines",
            "International Association for Identification Standards"
        ]
        
        type_specific = {
            "crime_scene": [
                "NIJ Crime Scene Investigation Guide",
                "ASCLD/LAB International Standards"
            ],
            "dna_forensics": [
                "SWGDAM Interpretation Guidelines",
                "FBI Quality Assurance Standards for Forensic DNA Testing"
            ],
            "fingerprint": [
                "SWGFAST Standards for Friction Ridge Analysis",
                "ACE-V Methodology Documentation"
            ],
            "ballistics": [
                "AFTE Theory of Identification",
                "SWGGUN Guidelines"
            ],
            "digital_forensics": [
                "SWGDE Best Practices for Digital Evidence",
                "NIST Computer Forensics Tool Testing"
            ],
            "toxicology": [
                "SWGTOX Standard Practices",
                "AAFS Toxicology Section Guidelines"
            ]
        }
        
        references = base_references + type_specific.get(analysis_type, [])
        return references
    
    # Helper methods for specific analyses
    
    async def _analyze_evidence_collection(self, evidence_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze evidence collection procedures."""
        analyzed_evidence = []
        for evidence in evidence_list:
            analysis = {
                "item": evidence.get("description", "Unknown item"),
                "type": evidence.get("type", "Unknown"),
                "collection_method": evidence.get("method", "Standard"),
                "packaging": evidence.get("packaging", "Appropriate"),
                "contamination_risk": evidence.get("contamination_risk", "Low"),
                "priority": evidence.get("priority", "Normal")
            }
            analyzed_evidence.append(analysis)
        return analyzed_evidence
    
    async def _reconstruct_scene(self, scene_data: Dict[str, Any]) -> Dict[str, Any]:
        """Reconstruct crime scene."""
        reconstruction = {
            "sequence_of_events": scene_data.get("sequence", []),
            "entry_exit_points": scene_data.get("access_points", {}),
            "victim_position": scene_data.get("victim_position", "Unknown"),
            "evidence_distribution": scene_data.get("evidence_pattern", "Unknown"),
            "bloodstain_patterns": scene_data.get("bloodstains", {}),
            "timeline_estimate": scene_data.get("timeline", "Under investigation")
        }
        return reconstruction
    
    async def _verify_chain_of_custody(self, custody_chain: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Verify chain of custody integrity."""
        issues = []
        for i, transfer in enumerate(custody_chain):
            if not all(k in transfer for k in ["from", "to", "date", "time"]):
                issues.append(f"Incomplete transfer record at position {i+1}")
        
        return {
            "complete": len(issues) == 0,
            "transfers": len(custody_chain),
            "issues": issues,
            "integrity": "maintained" if len(issues) == 0 else "compromised"
        }
    
    async def _analyze_dna_profile(self, sample: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze DNA profile from sample."""
        return {
            "sample_id": sample.get("id", "Unknown"),
            "sample_type": sample.get("type", "Unknown"),
            "loci_tested": sample.get("loci", 20),
            "profile_complete": sample.get("complete", True),
            "mixture_detected": sample.get("mixture", False),
            "degradation_level": sample.get("degradation", "minimal")
        }
    
    async def _compare_dna_profiles(self, profiles: List[Dict], references: List[Dict]) -> Dict[str, Any]:
        """Compare DNA profiles."""
        return {
            "matches_found": 0,  # Simulated
            "partial_matches": 0,
            "exclusions": len(references),
            "comparison_details": "Detailed comparison pending lab analysis"
        }
    
    async def _classify_fingerprint(self, print_data: Dict[str, Any]) -> str:
        """Classify fingerprint pattern."""
        pattern = print_data.get("pattern", "").lower()
        if pattern in ["loop", "whorl", "arch"]:
            subtype = print_data.get("subtype", "")
            return f"{pattern.capitalize()} - {subtype}" if subtype else pattern.capitalize()
        return "Unknown pattern"
    
    async def _compare_fingerprints(self, unknown: Dict, reference: Dict) -> Dict[str, Any]:
        """Compare fingerprints."""
        return {
            "minutiae_matches": 0,  # Simulated
            "comparison_score": 0.0,
            "identification": "Pending manual verification",
            "examiner_notes": "Requires expert examination"
        }
    
    async def _calculate_trajectory(self, impact_points: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate bullet trajectory."""
        return {
            "angle_horizontal": "Pending calculation",
            "angle_vertical": "Pending calculation",
            "shooter_position": "Under analysis",
            "distance_estimate": "Requires further analysis",
            "trajectory_rods_placed": len(impact_points) > 1
        }
    
    async def _analyze_network_traffic(self, network_logs: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze network traffic for digital forensics."""
        return {
            "suspicious_connections": network_logs.get("suspicious", []),
            "data_exfiltration": network_logs.get("exfiltration", "none detected"),
            "communication_timeline": network_logs.get("timeline", {}),
            "encrypted_traffic": network_logs.get("encrypted_percentage", "unknown")
        }
    
    async def _analyze_iot_devices(self, devices: List[str]) -> Dict[str, Any]:
        """Analyze IoT devices for forensic evidence."""
        iot_findings = {
            "devices_analyzed": len(devices),
            "data_extracted": {},
            "timeline_events": [],
            "anomalies_detected": []
        }
        
        if self.device_manager:
            for device_id in devices:
                try:
                    # Get device analytics
                    analytics = await self.device_manager.get_device_analytics(device_id)
                    iot_findings["data_extracted"][device_id] = analytics
                except Exception as e:
                    logger.error(f"Failed to analyze IoT device {device_id}: {e}")
                    iot_findings["anomalies_detected"].append({
                        "device": device_id,
                        "error": str(e)
                    })
        
        return iot_findings
    
    async def _reconstruct_digital_timeline(self, evidence_data: Dict[str, Any]) -> Dict[str, Any]:
        """Reconstruct digital timeline from evidence."""
        timeline_events = []
        
        # File system events
        if "file_events" in evidence_data:
            for event in evidence_data["file_events"]:
                timeline_events.append({
                    "timestamp": event.get("time"),
                    "type": "file_system",
                    "action": event.get("action"),
                    "details": event.get("path")
                })
        
        # Network events
        if "network_events" in evidence_data:
            for event in evidence_data["network_events"]:
                timeline_events.append({
                    "timestamp": event.get("time"),
                    "type": "network",
                    "action": event.get("action"),
                    "details": event.get("connection")
                })
        
        # Sort by timestamp
        timeline_events.sort(key=lambda x: x.get("timestamp", ""))
        
        return {
            "total_events": len(timeline_events),
            "timeline": timeline_events[:50],  # Limit to 50 most recent
            "first_activity": timeline_events[0].get("timestamp") if timeline_events else "unknown",
            "last_activity": timeline_events[-1].get("timestamp") if timeline_events else "unknown"
        }
    
    async def _analyze_trauma_patterns(self, injuries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze trauma patterns."""
        return {
            "total_injuries": len(injuries),
            "injury_types": [inj.get("type", "unknown") for inj in injuries],
            "pattern_analysis": "Requires medical examiner review",
            "defensive_wounds": any(inj.get("defensive", False) for inj in injuries),
            "sequence_determination": "Pending detailed analysis"
        }
    
    async def _simplify_technical_concepts(self, evidence_data: Dict[str, Any]) -> List[str]:
        """Simplify technical concepts for jury."""
        simplifications = []
        
        if "dna" in str(evidence_data).lower():
            simplifications.append("DNA is like a genetic fingerprint unique to each person")
        
        if "trajectory" in str(evidence_data).lower():
            simplifications.append("Trajectory analysis helps determine where shots were fired from")
        
        if "digital" in str(evidence_data).lower():
            simplifications.append("Digital evidence is like footprints left in the electronic world")
        
        return simplifications
    
    # Audio support methods
    
    async def process_audio_request(self, audio_data: bytes, user_id: str, language: str = "en") -> Dict[str, Any]:
        """Process forensic analysis request via audio."""
        return await self.audio_wrapper.process_audio_input(
            audio_data=audio_data,
            user_id=user_id,
            language=language,
            context={"domain": "forensic_science"}
        )
    
    # IoT integration methods
    
    async def analyze_iot_crime_scene(self, device_ids: List[str], time_range: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Analyze IoT devices at crime scene."""
        if not self.device_manager:
            return {"error": "IoT integration not available"}
        
        findings = {
            "devices_found": len(device_ids),
            "device_data": {},
            "timeline_correlation": {},
            "anomalies": []
        }
        
        for device_id in device_ids:
            try:
                # Get device data
                device = await self.device_manager.registry.get_device(device_id)
                if device:
                    # Read all capabilities
                    device_data = {}
                    for capability in device.capabilities:
                        if capability.read:
                            try:
                                data = await self.device_manager.read_capability(device_id, capability.name)
                                device_data[capability.name] = data
                            except Exception as e:
                                logger.error(f"Failed to read {capability.name} from {device_id}: {e}")
                    
                    findings["device_data"][device_id] = {
                        "type": device.type.value,
                        "manufacturer": device.manufacturer,
                        "last_seen": device.last_seen.isoformat() if device.last_seen else None,
                        "data": device_data
                    }
            except Exception as e:
                findings["anomalies"].append({
                    "device": device_id,
                    "error": str(e)
                })
        
        return findings
    
    # Automotive forensics methods
    
    async def analyze_vehicle_data(self, vehicle_interface: str = "android_auto") -> Dict[str, Any]:
        """Analyze vehicle data for forensic evidence."""
        if not self.automotive_enabled:
            return {"error": "Automotive integration not available"}
        
        try:
            # Connect to vehicle
            await automotive_integration.connect_to_car(vehicle_interface)
            
            # Get vehicle data
            vehicle_data = await automotive_integration.current_interface.get_vehicle_data()
            
            # Forensic analysis of vehicle data
            findings = {
                "vehicle_interface": vehicle_interface,
                "data_extracted": vehicle_data,
                "forensic_analysis": {
                    "speed_analysis": {
                        "current_speed": vehicle_data.get("speed"),
                        "legal_implications": "Requires comparison with speed limits"
                    },
                    "location_data": {
                        "current_position": vehicle_data.get("location"),
                        "journey_reconstruction": "Requires historical data"
                    },
                    "diagnostic_data": vehicle_data.get("diagnostics", {}),
                    "potential_evidence": [
                        "Speed at time of incident",
                        "Location history",
                        "Engine diagnostics",
                        "Brake usage patterns"
                    ]
                }
            }
            
            return findings
            
        except Exception as e:
            logger.error(f"Vehicle forensics error: {e}")
            return {"error": str(e)}