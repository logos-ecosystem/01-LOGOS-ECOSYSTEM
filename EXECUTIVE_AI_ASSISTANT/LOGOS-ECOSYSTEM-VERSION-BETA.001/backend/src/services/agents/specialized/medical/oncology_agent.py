"""Oncology Specialist Agent for LOGOS ECOSYSTEM."""

from typing import List, Dict, Any, Optional, Type, Tuple
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator
import json
import numpy as np
from enum import Enum

from ....base_agent import (, AgentStatus, PricingModel
    BaseAIAgent, AgentMetadata, AgentCategory, PricingModel,
    AgentStatus, AgentInput, AgentOutput
)
from ....shared.utils.logger import get_logger

logger = get_logger(__name__)


class CancerType(str, Enum):
    """Major cancer types."""
    LUNG = "lung"
    BREAST = "breast"
    PROSTATE = "prostate"
    COLORECTAL = "colorectal"
    MELANOMA = "melanoma"
    LYMPHOMA = "lymphoma"
    LEUKEMIA = "leukemia"
    PANCREATIC = "pancreatic"
    OVARIAN = "ovarian"
    BRAIN = "brain"
    LIVER = "liver"
    KIDNEY = "kidney"
    BLADDER = "bladder"
    THYROID = "thyroid"
    OTHER = "other"


class OncologySymptom(str, Enum):
    """Common oncology-related symptoms."""
    UNEXPLAINED_WEIGHT_LOSS = "unexplained_weight_loss"
    FATIGUE = "fatigue"
    PAIN = "pain"
    FEVER = "fever"
    NIGHT_SWEATS = "night_sweats"
    LUMPS = "lumps"
    SKIN_CHANGES = "skin_changes"
    BLEEDING = "bleeding"
    COUGH = "persistent_cough"
    BOWEL_CHANGES = "bowel_changes"
    DIFFICULTY_SWALLOWING = "difficulty_swallowing"
    NEUROLOGICAL_SYMPTOMS = "neurological_symptoms"


class OncologyInput(BaseModel):
    """Input for oncology consultation."""
    symptoms: List[OncologySymptom] = Field(..., description="Presenting symptoms")
    duration: str = Field(..., description="Duration of symptoms")
    cancer_history: Optional[Dict[str, Any]] = Field(default={}, description="Previous cancer history")
    family_cancer_history: Optional[Dict[str, Any]] = Field(default={}, description="Family cancer history")
    risk_factors: Optional[Dict[str, Any]] = Field(default={}, description="Cancer risk factors")
    
    # Diagnostic data
    imaging_results: Optional[Dict[str, Any]] = Field(default={}, description="Imaging findings")
    lab_results: Optional[Dict[str, Any]] = Field(default={}, description="Laboratory results")
    pathology_results: Optional[Dict[str, Any]] = Field(default={}, description="Pathology/biopsy results")
    tumor_markers: Optional[Dict[str, float]] = Field(default={}, description="Tumor marker levels")
    
    # Patient factors
    age: int = Field(..., ge=0, le=120, description="Patient age")
    sex: str = Field(..., description="Patient sex")
    performance_status: Optional[int] = Field(default=0, ge=0, le=4, description="ECOG performance status")
    comorbidities: Optional[List[str]] = Field(default=[], description="Other medical conditions")
    current_medications: Optional[List[str]] = Field(default=[], description="Current medications")


class StagingInput(BaseModel):
    """Input for cancer staging."""
    cancer_type: CancerType = Field(..., description="Type of cancer")
    primary_tumor: Dict[str, Any] = Field(..., description="Primary tumor characteristics")
    lymph_nodes: Dict[str, Any] = Field(..., description="Lymph node involvement")
    metastases: Optional[List[Dict[str, Any]]] = Field(default=[], description="Metastatic sites")
    histology: Optional[str] = Field(default=None, description="Histological type")
    grade: Optional[int] = Field(default=None, ge=1, le=4, description="Tumor grade")
    molecular_markers: Optional[Dict[str, Any]] = Field(default={}, description="Molecular markers")


class OncologyAgent(BaseAgent):
    """AI agent specialized in oncology and cancer care."""
    
    def __init__(self):
        metadata = AgentMetadata(
            name="Oncology Specialist",
            description="Expert AI agent for cancer diagnosis, staging, treatment planning, and supportive care. Provides evidence-based oncology guidance.",
            category=AgentCategory.MEDICAL,
            version="1.0.0",
            author="LOGOS Medical AI Team",
            pricing_model=PricingModel.PER_USE,
            price_per_use=3.50,
            tags=["oncology", "cancer", "chemotherapy", "radiation", "immunotherapy", "staging"],
            capabilities=[
                "Cancer risk assessment",
                "Symptom analysis for cancer screening",
                "TNM staging interpretation",
                "Treatment planning (surgery, chemo, radiation, immunotherapy)",
                "Chemotherapy regimen selection",
                "Side effect management",
                "Genetic testing interpretation",
                "Palliative care planning",
                "Clinical trial matching",
                "Survivorship planning"
            ],
            limitations=[
                "Cannot replace oncologist consultation",
                "Cannot perform physical examination",
                "Requires accurate pathology data",
                "Treatment plans require physician approval"
            ],
            status=AgentStatus.ACTIVE
        )
        super().__init__(metadata)
        
        self._cancer_protocols = {}
        self._staging_systems = {}
        self._chemotherapy_regimens = {}
        self._genetic_markers = {}
        self._clinical_trials_db = {}
    
    async def _setup(self):
        """Initialize oncology knowledge base."""
        self._cancer_protocols = {
            "breast": {
                "early_stage": ["Surgery", "Radiation", "Adjuvant therapy"],
                "locally_advanced": ["Neoadjuvant therapy", "Surgery", "Radiation"],
                "metastatic": ["Systemic therapy", "Targeted therapy", "Immunotherapy"]
            },
            "lung": {
                "nsclc": {
                    "early": ["Surgery", "Adjuvant chemotherapy"],
                    "locally_advanced": ["Concurrent chemoradiation"],
                    "metastatic": ["Targeted therapy", "Immunotherapy", "Chemotherapy"]
                },
                "sclc": {
                    "limited": ["Concurrent chemoradiation", "PCI"],
                    "extensive": ["Chemotherapy + immunotherapy"]
                }
            },
            "colorectal": {
                "stage_i_ii": ["Surgery", "Adjuvant chemotherapy if high risk"],
                "stage_iii": ["Surgery", "Adjuvant FOLFOX/CAPOX"],
                "stage_iv": ["Systemic therapy", "Targeted therapy", "Surgery if resectable"]
            }
        }
        
        self._staging_systems = {
            "tnm": {
                "T": "Primary tumor size/extent",
                "N": "Regional lymph node involvement",
                "M": "Distant metastasis"
            },
            "stage_grouping": {
                "I": "Early stage, localized",
                "II": "Larger tumor or minimal spread",
                "III": "Regional spread",
                "IV": "Distant metastasis"
            }
        }
        
        self._chemotherapy_regimens = {
            "breast": {
                "AC-T": ["Doxorubicin", "Cyclophosphamide", "followed by Paclitaxel"],
                "TC": ["Docetaxel", "Cyclophosphamide"],
                "CMF": ["Cyclophosphamide", "Methotrexate", "5-FU"]
            },
            "lung": {
                "platinum_doublet": ["Carboplatin/Cisplatin", "+ Pemetrexed/Paclitaxel"],
                "immunotherapy": ["Pembrolizumab", "Nivolumab", "Atezolizumab"]
            },
            "colorectal": {
                "FOLFOX": ["5-FU", "Leucovorin", "Oxaliplatin"],
                "FOLFIRI": ["5-FU", "Leucovorin", "Irinotecan"],
                "CAPOX": ["Capecitabine", "Oxaliplatin"]
            }
        }
        
        logger.info("Oncology agent initialized with comprehensive protocols")
    
    def get_input_schema(self) -> Type[BaseModel]:
        """Get the input schema for this agent."""
        return OncologyInput
    
    def get_output_schema(self) -> Type[BaseModel]:
        """Get the output schema for this agent."""
        class OncologyAssessment(BaseModel):
            cancer_risk_assessment: Dict[str, Any] = Field(..., description="Cancer risk evaluation")
            differential_diagnosis: List[Dict[str, Any]] = Field(..., description="Possible diagnoses")
            recommended_workup: List[Dict[str, Any]] = Field(..., description="Diagnostic tests needed")
            staging_assessment: Optional[Dict[str, Any]] = Field(default=None, description="Cancer staging if applicable")
            treatment_options: List[Dict[str, Any]] = Field(..., description="Treatment recommendations")
            clinical_trials: List[Dict[str, Any]] = Field(..., description="Potentially eligible trials")
            prognosis: Dict[str, Any] = Field(..., description="Prognostic information")
            supportive_care: List[str] = Field(..., description="Supportive care recommendations")
            follow_up_plan: Dict[str, Any] = Field(..., description="Monitoring and follow-up")
            red_flags: List[str] = Field(..., description="Urgent findings")
            
        return OncologyAssessment
    
    async def _execute(self, input_data: AgentInput) -> AgentOutput:
        """Execute oncology assessment."""
        try:
            oncology_data = OncologyInput(**input_data.input_data)
            
            # Check for oncological emergencies
            red_flags = await self._check_oncological_emergencies(oncology_data)
            
            # Assess cancer risk
            risk_assessment = await self._assess_cancer_risk(oncology_data)
            
            # Generate differential diagnosis
            differential = await self._generate_oncology_differential(oncology_data)
            
            # Recommend diagnostic workup
            workup = await self._recommend_diagnostic_workup(oncology_data, differential)
            
            # Perform staging if pathology available
            staging = None
            if oncology_data.pathology_results:
                staging = await self._perform_cancer_staging(oncology_data)
            
            # Generate treatment options
            treatments = await self._generate_treatment_plan(oncology_data, staging)
            
            # Search for clinical trials
            trials = await self._search_clinical_trials(oncology_data, staging)
            
            # Assess prognosis
            prognosis = await self._assess_prognosis(oncology_data, staging)
            
            # Create comprehensive assessment
            assessment = {
                "cancer_risk_assessment": risk_assessment,
                "differential_diagnosis": differential,
                "recommended_workup": workup,
                "staging_assessment": staging,
                "treatment_options": treatments,
                "clinical_trials": trials,
                "prognosis": prognosis,
                "supportive_care": await self._recommend_supportive_care(oncology_data),
                "follow_up_plan": await self._create_follow_up_plan(oncology_data, staging),
                "red_flags": red_flags
            }
            
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=True,
                output_data=assessment,
                tokens_used=2000
            )
            
        except Exception as e:
            logger.error(f"Oncology assessment error: {str(e)}")
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=False,
                error=str(e)
            )
    
    async def _check_oncological_emergencies(self, oncology_data: OncologyInput) -> List[str]:
        """Check for oncological emergencies requiring immediate attention."""
        emergencies = []
        
        # Spinal cord compression
        if OncologySymptom.NEUROLOGICAL_SYMPTOMS in oncology_data.symptoms:
            if oncology_data.cancer_history:
                emergencies.append("Possible spinal cord compression - immediate MRI and steroids")
        
        # Superior vena cava syndrome
        if "facial_swelling" in str(oncology_data.symptoms) or "arm_swelling" in str(oncology_data.symptoms):
            emergencies.append("Possible SVC syndrome - urgent imaging and intervention")
        
        # Tumor lysis syndrome risk
        if oncology_data.lab_results:
            if self._check_tumor_lysis_risk(oncology_data.lab_results):
                emergencies.append("High tumor lysis syndrome risk - prophylaxis needed")
        
        # Febrile neutropenia
        if OncologySymptom.FEVER in oncology_data.symptoms:
            if oncology_data.lab_results.get("anc", 1500) < 500:
                emergencies.append("Febrile neutropenia - immediate antibiotics required")
        
        # Hypercalcemia
        if oncology_data.lab_results.get("calcium", 10) > 14:
            emergencies.append("Severe hypercalcemia - immediate treatment needed")
        
        return emergencies
    
    async def _assess_cancer_risk(self, oncology_data: OncologyInput) -> Dict[str, Any]:
        """Assess cancer risk based on symptoms and risk factors."""
        risk_score = 0
        risk_factors = []
        high_risk_features = []
        
        # Age-related risk
        if oncology_data.age > 50:
            risk_score += 2
            risk_factors.append(f"Age > 50 ({oncology_data.age})")
        
        # Symptom-based risk
        high_risk_symptoms = [
            OncologySymptom.UNEXPLAINED_WEIGHT_LOSS,
            OncologySymptom.BLEEDING,
            OncologySymptom.LUMPS
        ]
        
        for symptom in oncology_data.symptoms:
            if symptom in high_risk_symptoms:
                risk_score += 3
                high_risk_features.append(f"High-risk symptom: {symptom.value}")
        
        # Family history
        if oncology_data.family_cancer_history:
            for cancer_type, count in oncology_data.family_cancer_history.items():
                if count > 0:
                    risk_score += 2
                    risk_factors.append(f"Family history of {cancer_type}")
        
        # Environmental/lifestyle risk factors
        if oncology_data.risk_factors:
            if oncology_data.risk_factors.get("smoking"):
                risk_score += 3
                risk_factors.append("Smoking history")
            if oncology_data.risk_factors.get("alcohol"):
                risk_score += 1
                risk_factors.append("Alcohol use")
            if oncology_data.risk_factors.get("obesity"):
                risk_score += 1
                risk_factors.append("Obesity")
        
        # Risk categorization
        risk_level = "low"
        if risk_score >= 10:
            risk_level = "high"
        elif risk_score >= 5:
            risk_level = "moderate"
        
        # Screening recommendations
        screening_recs = await self._get_screening_recommendations(oncology_data)
        
        return {
            "risk_level": risk_level,
            "risk_score": risk_score,
            "risk_factors": risk_factors,
            "high_risk_features": high_risk_features,
            "screening_recommendations": screening_recs
        }
    
    async def _generate_oncology_differential(
        self, 
        oncology_data: OncologyInput
    ) -> List[Dict[str, Any]]:
        """Generate differential diagnosis for cancer symptoms."""
        differential = []
        
        # Create diagnostic prompt based on symptoms
        symptom_patterns = await self._analyze_symptom_patterns(oncology_data)
        
        # Weight loss + fatigue pattern
        if (OncologySymptom.UNEXPLAINED_WEIGHT_LOSS in oncology_data.symptoms and
            OncologySymptom.FATIGUE in oncology_data.symptoms):
            differential.extend([
                {
                    "diagnosis": "Gastrointestinal malignancy",
                    "probability": 70,
                    "supporting": ["Weight loss", "Fatigue", "Age > 50"],
                    "workup": ["CT chest/abdomen/pelvis", "Colonoscopy", "Upper endoscopy"]
                },
                {
                    "diagnosis": "Hematologic malignancy",
                    "probability": 60,
                    "supporting": ["Constitutional symptoms", "Possible cytopenias"],
                    "workup": ["CBC with diff", "LDH", "Flow cytometry", "Bone marrow biopsy"]
                }
            ])
        
        # Respiratory symptoms
        if OncologySymptom.COUGH in oncology_data.symptoms:
            if oncology_data.risk_factors.get("smoking"):
                differential.append({
                    "diagnosis": "Lung cancer",
                    "probability": 80,
                    "supporting": ["Persistent cough", "Smoking history"],
                    "workup": ["Chest CT", "Bronchoscopy", "PET-CT if nodule found"]
                })
        
        # Bleeding patterns
        if OncologySymptom.BLEEDING in oncology_data.symptoms:
            bleeding_site = oncology_data.symptoms  # Would parse for specific site
            differential.append({
                "diagnosis": "Site-specific malignancy",
                "probability": 65,
                "supporting": ["Abnormal bleeding", "Duration of symptoms"],
                "workup": ["Site-specific endoscopy", "Imaging", "Biopsy"]
            })
        
        # Sort by probability
        differential.sort(key=lambda x: x["probability"], reverse=True)
        
        return differential[:5]
    
    async def _recommend_diagnostic_workup(
        self,
        oncology_data: OncologyInput,
        differential: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Recommend diagnostic tests for cancer workup."""
        workup = []
        
        # Basic cancer screening labs
        workup.append({
            "test": "Complete metabolic panel",
            "urgency": "routine",
            "rationale": "Baseline organ function and calcium",
            "components": ["Electrolytes", "Kidney function", "Liver function", "Calcium"]
        })
        
        workup.append({
            "test": "CBC with differential",
            "urgency": "routine",
            "rationale": "Check for cytopenias or blood cancers",
            "components": ["WBC", "Hemoglobin", "Platelets", "Differential"]
        })
        
        # Tumor markers based on symptoms/differential
        tumor_markers = await self._select_tumor_markers(oncology_data, differential)
        if tumor_markers:
            workup.append({
                "test": "Tumor markers",
                "urgency": "routine",
                "rationale": "Baseline levels for monitoring",
                "components": tumor_markers
            })
        
        # Imaging based on symptoms
        imaging = await self._select_imaging_studies(oncology_data, differential)
        workup.extend(imaging)
        
        # Biopsy planning
        if oncology_data.imaging_results and "mass" in str(oncology_data.imaging_results):
            workup.append({
                "test": "Image-guided biopsy",
                "urgency": "urgent",
                "rationale": "Tissue diagnosis required",
                "components": ["Core needle biopsy", "Immunohistochemistry", "Molecular testing"]
            })
        
        return workup
    
    async def _perform_cancer_staging(self, oncology_data: OncologyInput) -> Dict[str, Any]:
        """Perform cancer staging based on available data."""
        staging = {
            "tnm_stage": {},
            "overall_stage": None,
            "stage_modifiers": [],
            "prognostic_factors": [],
            "stage_specific_recommendations": []
        }
        
        # Extract TNM information from pathology/imaging
        if oncology_data.pathology_results:
            # T stage (tumor size/extent)
            tumor_size = oncology_data.pathology_results.get("tumor_size")
            if tumor_size:
                staging["tnm_stage"]["T"] = self._determine_t_stage(tumor_size, oncology_data)
            
            # N stage (lymph nodes)
            node_status = oncology_data.pathology_results.get("lymph_nodes")
            if node_status:
                staging["tnm_stage"]["N"] = self._determine_n_stage(node_status)
            
            # M stage (metastases)
            if oncology_data.imaging_results:
                staging["tnm_stage"]["M"] = self._determine_m_stage(oncology_data.imaging_results)
        
        # Calculate overall stage
        if staging["tnm_stage"]:
            staging["overall_stage"] = self._calculate_overall_stage(staging["tnm_stage"])
        
        # Add prognostic factors
        staging["prognostic_factors"] = await self._identify_prognostic_factors(oncology_data)
        
        # Stage-specific recommendations
        staging["stage_specific_recommendations"] = await self._get_stage_recommendations(
            staging["overall_stage"], oncology_data
        )
        
        return staging
    
    async def _generate_treatment_plan(
        self,
        oncology_data: OncologyInput,
        staging: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Generate comprehensive treatment options."""
        treatments = []
        
        if not staging:
            # Pre-diagnosis treatment planning
            treatments.append({
                "phase": "Diagnostic",
                "priority": "Complete staging workup",
                "interventions": ["Biopsy", "Staging scans", "Molecular profiling"],
                "timeline": "1-2 weeks"
            })
            return treatments
        
        # Get cancer type from pathology
        cancer_type = self._identify_cancer_type(oncology_data)
        stage = staging.get("overall_stage", "Unknown")
        
        # Surgery options
        if stage in ["I", "II", "III"]:
            surgery_options = await self._get_surgery_options(cancer_type, stage)
            treatments.append({
                "modality": "Surgery",
                "options": surgery_options,
                "timing": "Primary" if stage in ["I", "II"] else "After neoadjuvant",
                "considerations": ["Performance status", "Resectability", "Organ preservation"]
            })
        
        # Systemic therapy
        systemic_therapy = await self._get_systemic_therapy_options(
            cancer_type, stage, oncology_data
        )
        if systemic_therapy:
            treatments.append({
                "modality": "Systemic therapy",
                "options": systemic_therapy,
                "timing": self._determine_systemic_timing(stage),
                "considerations": ["Molecular markers", "Performance status", "Organ function"]
            })
        
        # Radiation therapy
        if self._is_radiation_indicated(cancer_type, stage):
            radiation_options = await self._get_radiation_options(cancer_type, stage)
            treatments.append({
                "modality": "Radiation therapy",
                "options": radiation_options,
                "timing": "Adjuvant" if stage in ["I", "II"] else "Concurrent with chemo",
                "considerations": ["Target volumes", "Dose constraints", "Technique"]
            })
        
        # Immunotherapy
        if oncology_data.molecular_markers:
            immuno_options = await self._check_immunotherapy_eligibility(
                cancer_type, oncology_data.molecular_markers
            )
            if immuno_options:
                treatments.append({
                    "modality": "Immunotherapy",
                    "options": immuno_options,
                    "timing": "First-line or later",
                    "considerations": ["PD-L1 expression", "MSI status", "TMB"]
                })
        
        return treatments
    
    async def _search_clinical_trials(
        self,
        oncology_data: OncologyInput,
        staging: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Search for eligible clinical trials."""
        trials = []
        
        # In production, would query actual clinical trials databases
        # For now, create sample trial matches
        
        cancer_type = self._identify_cancer_type(oncology_data)
        stage = staging.get("overall_stage") if staging else "Any"
        
        # First-line trials
        if oncology_data.cancer_history.get("prior_treatments", 0) == 0:
            trials.append({
                "trial_id": "NCT-EXAMPLE-001",
                "title": f"Phase III trial of novel agent in {cancer_type}",
                "phase": "III",
                "eligibility": f"Newly diagnosed {cancer_type}, stage {stage}",
                "intervention": "Novel targeted therapy vs standard of care",
                "primary_endpoint": "Progression-free survival",
                "locations": ["Major cancer centers"],
                "contact": "Research coordinator contact info"
            })
        
        # Immunotherapy trials
        if oncology_data.molecular_markers and oncology_data.molecular_markers.get("pd_l1"):
            trials.append({
                "trial_id": "NCT-EXAMPLE-002",
                "title": "Combination immunotherapy trial",
                "phase": "II",
                "eligibility": "PD-L1 positive tumors",
                "intervention": "Dual checkpoint blockade",
                "primary_endpoint": "Overall response rate",
                "locations": ["Academic medical centers"],
                "contact": "Trial coordinator info"
            })
        
        # Precision medicine trials
        if oncology_data.molecular_markers:
            trials.append({
                "trial_id": "NCT-EXAMPLE-003",
                "title": "Basket trial for targeted mutations",
                "phase": "II",
                "eligibility": "Tumors with actionable mutations",
                "intervention": "Mutation-matched targeted therapy",
                "primary_endpoint": "Disease control rate",
                "locations": ["NCI-designated centers"],
                "contact": "Precision medicine team"
            })
        
        return trials
    
    async def _assess_prognosis(
        self,
        oncology_data: OncologyInput,
        staging: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Assess prognosis based on cancer type and stage."""
        prognosis = {
            "overall_prognosis": "Unknown",
            "5_year_survival": "Not determined",
            "median_survival": "Not determined",
            "favorable_factors": [],
            "unfavorable_factors": [],
            "quality_of_life_considerations": []
        }
        
        if not staging:
            prognosis["overall_prognosis"] = "Requires complete staging for accurate prognosis"
            return prognosis
        
        cancer_type = self._identify_cancer_type(oncology_data)
        stage = staging.get("overall_stage", "Unknown")
        
        # Stage-based prognosis
        survival_data = self._get_survival_statistics(cancer_type, stage)
        prognosis["5_year_survival"] = survival_data.get("5_year", "Variable")
        prognosis["median_survival"] = survival_data.get("median", "Variable")
        
        # Favorable prognostic factors
        if oncology_data.performance_status == 0:
            prognosis["favorable_factors"].append("Excellent performance status")
        if oncology_data.age < 65:
            prognosis["favorable_factors"].append("Younger age")
        if staging.get("prognostic_factors"):
            prognosis["favorable_factors"].extend(
                [f for f in staging["prognostic_factors"] if "favorable" in f.lower()]
            )
        
        # Unfavorable factors
        if oncology_data.performance_status >= 2:
            prognosis["unfavorable_factors"].append("Poor performance status")
        if stage == "IV":
            prognosis["unfavorable_factors"].append("Metastatic disease")
        if oncology_data.lab_results:
            if oncology_data.lab_results.get("ldh", 0) > 500:
                prognosis["unfavorable_factors"].append("Elevated LDH")
        
        # Overall assessment
        if len(prognosis["favorable_factors"]) > len(prognosis["unfavorable_factors"]):
            prognosis["overall_prognosis"] = "Relatively favorable"
        elif stage == "IV":
            prognosis["overall_prognosis"] = "Guarded"
        else:
            prognosis["overall_prognosis"] = "Intermediate"
        
        # Quality of life
        prognosis["quality_of_life_considerations"] = [
            "Treatment tolerability",
            "Symptom management",
            "Functional preservation",
            "Psychosocial support needs"
        ]
        
        return prognosis
    
    async def _recommend_supportive_care(self, oncology_data: OncologyInput) -> List[str]:
        """Recommend supportive care measures."""
        supportive_care = []
        
        # Universal recommendations
        supportive_care.extend([
            "Nutritional assessment and support",
            "Pain management consultation if needed",
            "Psycho-oncology support",
            "Palliative care early integration",
            "Exercise program as tolerated"
        ])
        
        # Symptom-specific care
        if OncologySymptom.PAIN in oncology_data.symptoms:
            supportive_care.append("Comprehensive pain assessment and multimodal management")
        
        if OncologySymptom.FATIGUE in oncology_data.symptoms:
            supportive_care.extend([
                "Fatigue evaluation (anemia, thyroid, etc.)",
                "Energy conservation strategies",
                "Consider stimulants if appropriate"
            ])
        
        if OncologySymptom.NAUSEA in oncology_data.symptoms:
            supportive_care.append("Antiemetic prophylaxis and management")
        
        # Treatment-specific support
        if oncology_data.current_medications:
            if any("chemo" in med.lower() for med in oncology_data.current_medications):
                supportive_care.extend([
                    "Growth factor support if indicated",
                    "Infection prophylaxis",
                    "Antiemetic regimen",
                    "Mucositis prevention"
                ])
        
        return supportive_care
    
    async def _create_follow_up_plan(
        self,
        oncology_data: OncologyInput,
        staging: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Create comprehensive follow-up plan."""
        follow_up = {
            "surveillance_schedule": [],
            "monitoring_tests": [],
            "symptom_watchlist": [],
            "survivorship_care": []
        }
        
        cancer_type = self._identify_cancer_type(oncology_data)
        
        # Active treatment follow-up
        if not staging or staging.get("overall_stage") in ["III", "IV"]:
            follow_up["surveillance_schedule"] = [
                "Every 3-4 weeks during active treatment",
                "Response assessment every 2-3 cycles",
                "Weekly labs if on chemotherapy"
            ]
            follow_up["monitoring_tests"] = [
                "Regular imaging (CT/PET) every 2-3 months",
                "Tumor markers if applicable",
                "Organ function monitoring"
            ]
        else:
            # Post-treatment surveillance
            follow_up["surveillance_schedule"] = [
                "Every 3 months for year 1-2",
                "Every 6 months for year 3-5",
                "Annually after 5 years"
            ]
            follow_up["monitoring_tests"] = [
                "History and physical exam",
                "Site-specific imaging",
                "Laboratory tests as indicated"
            ]
        
        # Symptom monitoring
        follow_up["symptom_watchlist"] = [
            "New or worsening pain",
            "Unexplained weight loss",
            "New lumps or masses",
            "Persistent cough or breathing changes",
            "Neurological symptoms"
        ]
        
        # Survivorship care
        follow_up["survivorship_care"] = [
            "Late effects monitoring",
            "Secondary cancer screening",
            "Cardiovascular health",
            "Bone health assessment",
            "Fertility preservation discussion if applicable",
            "Psychosocial support continuation"
        ]
        
        return follow_up
    
    async def calculate_chemotherapy_dosing(
        self, 
        regimen: str, 
        patient_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate chemotherapy doses based on patient parameters."""
        dosing = {
            "regimen": regimen,
            "bsa": 0.0,
            "doses": {},
            "adjustments": [],
            "premedications": []
        }
        
        # Calculate BSA (DuBois formula)
        height_cm = patient_data.get("height", 170)
        weight_kg = patient_data.get("weight", 70)
        bsa = (0.007184 * (height_cm ** 0.725) * (weight_kg ** 0.425))
        dosing["bsa"] = round(bsa, 2)
        
        # Get standard doses for regimen
        if regimen in self._chemotherapy_regimens.get("breast", {}):
            if regimen == "AC-T":
                dosing["doses"] = {
                    "Doxorubicin": f"{60 * bsa:.0f} mg IV day 1",
                    "Cyclophosphamide": f"{600 * bsa:.0f} mg IV day 1",
                    "Paclitaxel": f"{80 * bsa:.0f} mg IV weekly x 12"
                }
        
        # Check for dose adjustments
        if patient_data.get("creatinine", 1.0) > 1.5:
            dosing["adjustments"].append("Consider dose reduction for renal impairment")
        
        if patient_data.get("bilirubin", 1.0) > 2.0:
            dosing["adjustments"].append("Dose reduction needed for hepatic impairment")
        
        if patient_data.get("age", 0) > 75:
            dosing["adjustments"].append("Consider dose reduction for elderly patient")
        
        # Premedications
        dosing["premedications"] = [
            "Dexamethasone 8mg PO/IV",
            "Ondansetron 8mg IV",
            "Diphenhydramine 25-50mg IV",
            "Ranitidine 50mg IV or famotidine 20mg IV"
        ]
        
        return dosing
    
    async def assess_treatment_response(
        self, 
        baseline_data: Dict[str, Any], 
        current_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess treatment response using RECIST criteria."""
        response = {
            "recist_category": "Not evaluable",
            "percent_change": 0,
            "target_lesions": {},
            "non_target_lesions": "Stable",
            "new_lesions": False,
            "overall_response": "Stable disease",
            "clinical_benefit": False
        }
        
        # Calculate change in target lesions
        if baseline_data.get("target_lesions") and current_data.get("target_lesions"):
            baseline_sum = sum(baseline_data["target_lesions"].values())
            current_sum = sum(current_data["target_lesions"].values())
            
            if baseline_sum > 0:
                percent_change = ((current_sum - baseline_sum) / baseline_sum) * 100
                response["percent_change"] = round(percent_change, 1)
                
                # RECIST categories
                if percent_change <= -30:
                    response["recist_category"] = "Partial response"
                    response["clinical_benefit"] = True
                elif percent_change >= 20:
                    response["recist_category"] = "Progressive disease"
                    response["clinical_benefit"] = False
                else:
                    response["recist_category"] = "Stable disease"
                    response["clinical_benefit"] = True
                
                # Check for complete response
                if current_sum == 0:
                    response["recist_category"] = "Complete response"
                    response["clinical_benefit"] = True
        
        # Check for new lesions
        if current_data.get("new_lesions"):
            response["new_lesions"] = True
            response["recist_category"] = "Progressive disease"
            response["clinical_benefit"] = False
        
        response["overall_response"] = response["recist_category"]
        
        return response
    
    def _check_tumor_lysis_risk(self, lab_results: Dict[str, Any]) -> bool:
        """Check for tumor lysis syndrome risk."""
        risk_factors = 0
        
        if lab_results.get("uric_acid", 0) > 8:
            risk_factors += 1
        if lab_results.get("ldh", 0) > 500:
            risk_factors += 1
        if lab_results.get("wbc", 0) > 50000:
            risk_factors += 1
        if lab_results.get("creatinine", 0) > 1.5:
            risk_factors += 1
        
        return risk_factors >= 2
    
    async def _get_screening_recommendations(
        self, 
        oncology_data: OncologyInput
    ) -> List[str]:
        """Get age and risk-appropriate cancer screening recommendations."""
        screening = []
        
        age = oncology_data.age
        sex = oncology_data.sex.lower()
        
        # Breast cancer screening
        if sex == "female":
            if age >= 40:
                screening.append("Annual mammography")
            if oncology_data.family_cancer_history.get("breast"):
                screening.append("Consider genetic counseling and BRCA testing")
                screening.append("Consider breast MRI screening")
        
        # Colorectal cancer screening
        if age >= 45:
            screening.append("Colonoscopy every 10 years or FIT test annually")
        
        # Lung cancer screening
        if age >= 50 and oncology_data.risk_factors.get("smoking"):
            pack_years = oncology_data.risk_factors.get("pack_years", 0)
            if pack_years >= 20:
                screening.append("Annual low-dose CT chest for lung cancer screening")
        
        # Prostate cancer screening
        if sex == "male" and age >= 50:
            screening.append("Discuss PSA screening with physician")
        
        # Cervical cancer screening
        if sex == "female" and 21 <= age <= 65:
            screening.append("Pap smear every 3 years or Pap+HPV every 5 years")
        
        return screening
    
    async def _analyze_symptom_patterns(
        self, 
        oncology_data: OncologyInput
    ) -> Dict[str, Any]:
        """Analyze symptom patterns for cancer likelihood."""
        patterns = {
            "constitutional": False,
            "site_specific": [],
            "duration_concern": False,
            "red_flag_symptoms": []
        }
        
        # Constitutional symptoms (B symptoms)
        b_symptoms = [
            OncologySymptom.FEVER,
            OncologySymptom.NIGHT_SWEATS,
            OncologySymptom.UNEXPLAINED_WEIGHT_LOSS
        ]
        if sum(1 for s in oncology_data.symptoms if s in b_symptoms) >= 2:
            patterns["constitutional"] = True
        
        # Duration analysis
        if "months" in oncology_data.duration.lower() or "year" in oncology_data.duration.lower():
            patterns["duration_concern"] = True
        
        # Site-specific patterns
        if OncologySymptom.COUGH in oncology_data.symptoms:
            patterns["site_specific"].append("Respiratory")
        if OncologySymptom.BOWEL_CHANGES in oncology_data.symptoms:
            patterns["site_specific"].append("Gastrointestinal")
        if OncologySymptom.BLEEDING in oncology_data.symptoms:
            patterns["site_specific"].append("Site of bleeding")
        
        return patterns
    
    async def _select_tumor_markers(
        self, 
        oncology_data: OncologyInput,
        differential: List[Dict[str, Any]]
    ) -> List[str]:
        """Select appropriate tumor markers based on differential."""
        markers = []
        
        # Check differential diagnoses
        for dx in differential:
            diagnosis = dx["diagnosis"].lower()
            
            if "gastrointestinal" in diagnosis:
                markers.extend(["CEA", "CA 19-9"])
            elif "lung" in diagnosis:
                markers.extend(["CEA", "CYFRA 21-1", "NSE"])
            elif "breast" in diagnosis:
                markers.extend(["CA 15-3", "CA 27.29"])
            elif "ovarian" in diagnosis:
                markers.extend(["CA 125", "HE4"])
            elif "prostate" in diagnosis:
                markers.append("PSA")
            elif "hematologic" in diagnosis:
                markers.extend(["LDH", "Beta-2 microglobulin"])
        
        # Remove duplicates
        return list(set(markers))
    
    async def _select_imaging_studies(
        self, 
        oncology_data: OncologyInput,
        differential: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Select appropriate imaging studies."""
        imaging = []
        
        # CT chest/abdomen/pelvis for most solid tumors
        imaging.append({
            "test": "CT chest/abdomen/pelvis with contrast",
            "urgency": "urgent",
            "rationale": "Staging and tumor detection",
            "components": ["Arterial and venous phases", "Lung windows"]
        })
        
        # PET-CT for staging if malignancy confirmed
        if oncology_data.pathology_results:
            imaging.append({
                "test": "PET-CT",
                "urgency": "routine",
                "rationale": "Metabolic staging and occult metastases",
                "components": ["FDG-PET", "Low-dose CT correlation"]
            })
        
        # Site-specific imaging
        for dx in differential:
            if "brain" in dx["diagnosis"].lower():
                imaging.append({
                    "test": "MRI brain with gadolinium",
                    "urgency": "urgent",
                    "rationale": "Better soft tissue characterization",
                    "components": ["T1, T2, FLAIR, DWI, Post-contrast"]
                })
        
        return imaging
    
    def _identify_cancer_type(self, oncology_data: OncologyInput) -> str:
        """Identify cancer type from pathology data."""
        if oncology_data.pathology_results:
            histology = oncology_data.pathology_results.get("histology", "").lower()
            
            if "adenocarcinoma" in histology:
                if "lung" in histology:
                    return "lung_adenocarcinoma"
                elif "colon" in histology:
                    return "colorectal"
                else:
                    return "adenocarcinoma_nos"
            elif "squamous" in histology:
                return "squamous_cell_carcinoma"
            elif "small cell" in histology:
                return "small_cell_lung"
        
        return "unknown_primary"
    
    def _determine_t_stage(self, tumor_size: float, oncology_data: OncologyInput) -> str:
        """Determine T stage based on tumor size and organ."""
        # Simplified - would be organ-specific in production
        if tumor_size <= 2:
            return "T1"
        elif tumor_size <= 5:
            return "T2"
        elif tumor_size <= 10:
            return "T3"
        else:
            return "T4"
    
    def _determine_n_stage(self, node_status: Dict[str, Any]) -> str:
        """Determine N stage based on lymph node involvement."""
        positive_nodes = node_status.get("positive", 0)
        
        if positive_nodes == 0:
            return "N0"
        elif positive_nodes <= 3:
            return "N1"
        elif positive_nodes <= 9:
            return "N2"
        else:
            return "N3"
    
    def _determine_m_stage(self, imaging_results: Dict[str, Any]) -> str:
        """Determine M stage based on metastases."""
        if imaging_results.get("metastases"):
            return "M1"
        return "M0"
    
    def _calculate_overall_stage(self, tnm: Dict[str, str]) -> str:
        """Calculate overall stage from TNM."""
        # Simplified staging - would use specific staging tables in production
        t = tnm.get("T", "TX")
        n = tnm.get("N", "NX")
        m = tnm.get("M", "MX")
        
        if m == "M1":
            return "IV"
        elif n in ["N2", "N3"]:
            return "III"
        elif n == "N1" or t in ["T3", "T4"]:
            return "III"
        elif t == "T2":
            return "II"
        elif t == "T1" and n == "N0":
            return "I"
        else:
            return "Unknown"
    
    async def _identify_prognostic_factors(
        self, 
        oncology_data: OncologyInput
    ) -> List[str]:
        """Identify prognostic factors."""
        factors = []
        
        # Molecular markers
        if oncology_data.molecular_markers:
            for marker, value in oncology_data.molecular_markers.items():
                if marker == "her2" and value == "positive":
                    factors.append("HER2 positive (targetable)")
                elif marker == "er" and value == "positive":
                    factors.append("ER positive (favorable)")
                elif marker == "pd_l1" and value > 50:
                    factors.append("High PD-L1 expression")
        
        # Histologic grade
        if oncology_data.pathology_results:
            grade = oncology_data.pathology_results.get("grade")
            if grade == 1:
                factors.append("Low grade (favorable)")
            elif grade >= 3:
                factors.append("High grade (unfavorable)")
        
        return factors
    
    async def _get_stage_recommendations(
        self, 
        stage: str, 
        oncology_data: OncologyInput
    ) -> List[str]:
        """Get stage-specific recommendations."""
        recommendations = []
        
        if stage == "I":
            recommendations.extend([
                "Curative intent treatment",
                "Consider clinical trial for de-escalation",
                "Excellent prognosis with appropriate treatment"
            ])
        elif stage in ["II", "III"]:
            recommendations.extend([
                "Multimodal therapy likely needed",
                "Consider neoadjuvant approach",
                "Multidisciplinary tumor board discussion"
            ])
        elif stage == "IV":
            recommendations.extend([
                "Palliative intent treatment",
                "Focus on quality of life",
                "Consider clinical trials for novel agents",
                "Early palliative care integration"
            ])
        
        return recommendations
    
    async def _get_surgery_options(self, cancer_type: str, stage: str) -> List[str]:
        """Get surgical options by cancer type and stage."""
        options = []
        
        if cancer_type == "lung_adenocarcinoma":
            if stage in ["I", "II"]:
                options = ["Lobectomy", "Segmentectomy for small tumors", "VATS approach preferred"]
            elif stage == "III":
                options = ["Surgery after neoadjuvant therapy", "Consider pneumonectomy if needed"]
        elif cancer_type == "colorectal":
            options = ["Segmental resection", "Consider minimally invasive approach", "Lymph node dissection"]
        
        return options
    
    async def _get_systemic_therapy_options(
        self, 
        cancer_type: str, 
        stage: str,
        oncology_data: OncologyInput
    ) -> List[Dict[str, Any]]:
        """Get systemic therapy options."""
        options = []
        
        # Check for targetable mutations
        if oncology_data.molecular_markers:
            targeted_options = await self._check_targeted_therapy(
                cancer_type, oncology_data.molecular_markers
            )
            if targeted_options:
                options.extend(targeted_options)
        
        # Standard chemotherapy
        if cancer_type in self._chemotherapy_regimens:
            chemo_options = self._chemotherapy_regimens[cancer_type]
            for regimen, drugs in chemo_options.items():
                options.append({
                    "regimen": regimen,
                    "drugs": drugs,
                    "schedule": "Every 3 weeks" if "doublet" in regimen else "Varies",
                    "intent": "Curative" if stage in ["I", "II", "III"] else "Palliative"
                })
        
        return options
    
    def _determine_systemic_timing(self, stage: str) -> str:
        """Determine timing of systemic therapy."""
        if stage in ["I", "II"]:
            return "Adjuvant (after surgery)"
        elif stage == "III":
            return "Neoadjuvant (before surgery) or concurrent with radiation"
        else:
            return "Primary treatment"
    
    def _is_radiation_indicated(self, cancer_type: str, stage: str) -> bool:
        """Check if radiation is indicated."""
        # Simplified logic
        radiation_cancers = ["lung", "breast", "head_neck", "rectal"]
        return any(c in cancer_type for c in radiation_cancers) and stage != "IV"
    
    async def _get_radiation_options(self, cancer_type: str, stage: str) -> List[str]:
        """Get radiation therapy options."""
        options = []
        
        if "lung" in cancer_type:
            if stage in ["I", "II"]:
                options = ["SBRT for inoperable", "Adjuvant RT if positive margins"]
            else:
                options = ["Concurrent chemoRT", "60-66 Gy in 30-33 fractions"]
        elif "breast" in cancer_type:
            options = ["Whole breast RT after lumpectomy", "Consider partial breast RT", "Regional nodal RT if N+"]
        
        return options
    
    async def _check_targeted_therapy(
        self, 
        cancer_type: str,
        molecular_markers: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Check for targeted therapy options based on molecular markers."""
        targeted_options = []
        
        # EGFR mutations in lung cancer
        if "lung" in cancer_type and molecular_markers.get("egfr"):
            targeted_options.append({
                "drug": "Osimertinib",
                "target": "EGFR mutation",
                "line": "First-line preferred",
                "administration": "Oral daily"
            })
        
        # HER2 in breast cancer
        if molecular_markers.get("her2") == "positive":
            targeted_options.append({
                "drug": "Trastuzumab + Pertuzumab",
                "target": "HER2 amplification",
                "line": "First-line with chemotherapy",
                "administration": "IV every 3 weeks"
            })
        
        # BRAF mutations
        if molecular_markers.get("braf") == "V600E":
            targeted_options.append({
                "drug": "Dabrafenib + Trametinib",
                "target": "BRAF V600E",
                "line": "First or later line",
                "administration": "Oral daily"
            })
        
        return targeted_options
    
    async def _check_immunotherapy_eligibility(
        self, 
        cancer_type: str,
        molecular_markers: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Check immunotherapy eligibility."""
        immuno_options = []
        
        # PD-L1 expression
        pd_l1 = molecular_markers.get("pd_l1", 0)
        if pd_l1 >= 50:
            immuno_options.append({
                "drug": "Pembrolizumab monotherapy",
                "biomarker": f"PD-L1 {pd_l1}%",
                "indication": "First-line for PD-L1 high",
                "schedule": "Q3W or Q6W"
            })
        elif pd_l1 >= 1:
            immuno_options.append({
                "drug": "Pembrolizumab + chemotherapy",
                "biomarker": f"PD-L1 {pd_l1}%",
                "indication": "First-line combination",
                "schedule": "Q3W"
            })
        
        # MSI-H/dMMR
        if molecular_markers.get("msi") == "high":
            immuno_options.append({
                "drug": "Pembrolizumab or Nivolumab",
                "biomarker": "MSI-H/dMMR",
                "indication": "Tissue agnostic approval",
                "schedule": "Q3W or Q4W"
            })
        
        # TMB high
        if molecular_markers.get("tmb", 0) >= 10:
            immuno_options.append({
                "drug": "Pembrolizumab",
                "biomarker": f"TMB {molecular_markers['tmb']} mut/Mb",
                "indication": "TMB-high solid tumors",
                "schedule": "Q3W"
            })
        
        return immuno_options
    
    def _get_survival_statistics(self, cancer_type: str, stage: str) -> Dict[str, str]:
        """Get survival statistics by cancer type and stage."""
        # Simplified survival data - would use SEER database in production
        survival_data = {
            "lung_adenocarcinoma": {
                "I": {"5_year": "60-80%", "median": ">5 years"},
                "II": {"5_year": "40-50%", "median": "3-4 years"},
                "III": {"5_year": "15-25%", "median": "18-24 months"},
                "IV": {"5_year": "5-10%", "median": "12-18 months"}
            },
            "breast": {
                "I": {"5_year": "95-100%", "median": ">10 years"},
                "II": {"5_year": "85-95%", "median": ">10 years"},
                "III": {"5_year": "65-75%", "median": ">5 years"},
                "IV": {"5_year": "25-30%", "median": "2-3 years"}
            }
        }
        
        default = {"5_year": "Variable", "median": "Depends on multiple factors"}
        
        return survival_data.get(cancer_type, {}).get(stage, default)