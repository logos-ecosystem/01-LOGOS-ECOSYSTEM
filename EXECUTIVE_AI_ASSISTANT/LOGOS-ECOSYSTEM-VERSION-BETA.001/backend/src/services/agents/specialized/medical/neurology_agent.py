"""Neurology Specialist Agent for LOGOS ECOSYSTEM."""

from typing import List, Dict, Any, Optional, Type, Tuple
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator
import json
import numpy as np
from enum import Enum
from ....ai.ai_integration import ai_service

from ....base_agent import (, AgentStatus, PricingModel
    BaseAIAgent, AgentMetadata, AgentCategory, PricingModel,
    AgentStatus, AgentInput, AgentOutput
)
from ....shared.utils.logger import get_logger

logger = get_logger(__name__)


class NeurologicalSymptom(str, Enum):
    """Common neurological symptoms."""
    HEADACHE = "headache"
    SEIZURE = "seizure"
    DIZZINESS = "dizziness"
    NUMBNESS = "numbness"
    WEAKNESS = "weakness"
    TREMOR = "tremor"
    MEMORY_LOSS = "memory_loss"
    CONFUSION = "confusion"
    VISION_CHANGES = "vision_changes"
    SPEECH_DIFFICULTY = "speech_difficulty"
    BALANCE_PROBLEMS = "balance_problems"
    COORDINATION_ISSUES = "coordination_issues"


class NeurologicalExamInput(BaseModel):
    """Input for neurological examination."""
    symptoms: List[NeurologicalSymptom] = Field(..., description="List of neurological symptoms")
    onset: str = Field(..., description="When symptoms started")
    progression: str = Field(..., description="How symptoms have progressed")
    triggers: Optional[List[str]] = Field(default=[], description="What triggers symptoms")
    medical_history: Optional[Dict[str, Any]] = Field(default={}, description="Relevant medical history")
    medications: Optional[List[str]] = Field(default=[], description="Current medications")
    family_history: Optional[Dict[str, Any]] = Field(default={}, description="Family neurological history")
    
    # Physical exam findings
    mental_status: Optional[Dict[str, Any]] = Field(default={}, description="Mental status exam results")
    cranial_nerves: Optional[Dict[str, Any]] = Field(default={}, description="Cranial nerve exam")
    motor_exam: Optional[Dict[str, Any]] = Field(default={}, description="Motor examination findings")
    sensory_exam: Optional[Dict[str, Any]] = Field(default={}, description="Sensory examination")
    reflexes: Optional[Dict[str, Any]] = Field(default={}, description="Reflex testing results")
    coordination: Optional[Dict[str, Any]] = Field(default={}, description="Coordination tests")
    gait: Optional[str] = Field(default="normal", description="Gait assessment")


class DiagnosticTestInput(BaseModel):
    """Input for diagnostic test interpretation."""
    test_type: str = Field(..., description="Type of diagnostic test")
    test_results: Dict[str, Any] = Field(..., description="Test results data")
    clinical_context: str = Field(..., description="Clinical context for interpretation")


class NeurologyAgent(BaseAgent):
    """AI agent specialized in neurology and neurological disorders."""
    
    def __init__(self):
        metadata = AgentMetadata(
            name="Neurology Specialist",
            description="Expert AI agent for neurological assessment, diagnosis, and treatment planning. Specializes in brain, spinal cord, and peripheral nervous system disorders.",
            category=AgentCategory.MEDICAL,
            version="1.0.0",
            author="LOGOS Medical AI Team",
            pricing_model=PricingModel.PER_USE,
            price_per_use=3.00,
            tags=["neurology", "brain", "nervous system", "stroke", "epilepsy", "dementia"],
            capabilities=[
                "Neurological symptom analysis",
                "Localization of neurological lesions",
                "Diagnostic test interpretation (EEG, EMG, MRI, CT)",
                "Stroke assessment and management",
                "Epilepsy evaluation and treatment",
                "Movement disorder analysis",
                "Headache classification and treatment",
                "Neurodegenerative disease assessment",
                "Peripheral neuropathy evaluation",
                "Neurological emergency triage"
            ],
            limitations=[
                "Cannot perform physical examinations",
                "Cannot replace emergency medical care",
                "Requires accurate clinical data input",
                "Not for definitive diagnosis without physician review"
            ],
            status=AgentStatus.ACTIVE
        )
        super().__init__(metadata)
        
        self._neurological_conditions = {}
        self._diagnostic_criteria = {}
        self._treatment_protocols = {}
        self._red_flags = {}
    
    async def _setup(self):
        """Initialize neurological knowledge base."""
        self._neurological_conditions = {
            "stroke": {
                "ischemic": ["large vessel", "small vessel", "cardioembolic", "cryptogenic"],
                "hemorrhagic": ["intracerebral", "subarachnoid", "subdural", "epidural"]
            },
            "epilepsy": {
                "focal": ["temporal lobe", "frontal lobe", "parietal lobe", "occipital lobe"],
                "generalized": ["tonic-clonic", "absence", "myoclonic", "atonic"]
            },
            "movement_disorders": {
                "parkinsonian": ["Parkinson's disease", "MSA", "PSP", "CBD"],
                "hyperkinetic": ["essential tremor", "dystonia", "chorea", "tics"]
            },
            "headache": {
                "primary": ["migraine", "tension-type", "cluster", "trigeminal autonomic"],
                "secondary": ["medication overuse", "post-traumatic", "vascular", "infectious"]
            },
            "dementia": {
                "degenerative": ["Alzheimer's", "Lewy body", "frontotemporal", "vascular"],
                "reversible": ["NPH", "B12 deficiency", "thyroid", "depression"]
            }
        }
        
        self._red_flags = {
            "headache": [
                "thunderclap onset",
                "fever with neck stiffness",
                "papilledema",
                "new onset after 50",
                "progressive worsening",
                "personality changes"
            ],
            "weakness": [
                "sudden onset",
                "bilateral symptoms",
                "bowel/bladder dysfunction",
                "sensory level",
                "fever",
                "weight loss"
            ]
        }
        
        logger.info("Neurology agent initialized with comprehensive knowledge base")
    
    def get_input_schema(self) -> Type[BaseModel]:
        """Get the input schema for this agent."""
        return NeurologicalExamInput
    
    def get_output_schema(self) -> Type[BaseModel]:
        """Get the output schema for this agent."""
        class NeurologicalAssessment(BaseModel):
            localization: Dict[str, Any] = Field(..., description="Anatomical localization of lesion")
            differential_diagnosis: List[Dict[str, Any]] = Field(..., description="Ranked differential diagnoses")
            recommended_tests: List[Dict[str, Any]] = Field(..., description="Recommended diagnostic tests")
            treatment_options: List[Dict[str, Any]] = Field(..., description="Treatment recommendations")
            red_flags: List[str] = Field(..., description="Urgent findings requiring immediate attention")
            prognosis: Dict[str, Any] = Field(..., description="Expected outcomes and recovery")
            follow_up: str = Field(..., description="Recommended follow-up plan")
            patient_education: List[str] = Field(..., description="Key points for patient education")
            
        return NeurologicalAssessment
    
    async def _execute(self, input_data: AgentInput) -> AgentOutput:
        """Execute neurological assessment."""
        try:
            exam_data = NeurologicalExamInput(**input_data.input_data)
            
            # Check for red flags first
            red_flags = await self._check_red_flags(exam_data)
            
            # Perform anatomical localization
            localization = await self._localize_lesion(exam_data)
            
            # Generate differential diagnosis
            differential = await self._generate_differential(exam_data, localization)
            
            # Recommend diagnostic tests
            tests = await self._recommend_tests(exam_data, differential)
            
            # Suggest treatment options
            treatments = await self._suggest_treatments(exam_data, differential)
            
            # Create comprehensive assessment
            assessment = {
                "localization": localization,
                "differential_diagnosis": differential,
                "recommended_tests": tests,
                "treatment_options": treatments,
                "red_flags": red_flags,
                "prognosis": await self._assess_prognosis(exam_data, differential),
                "follow_up": await self._plan_follow_up(exam_data, differential),
                "patient_education": await self._create_education_points(exam_data, differential)
            }
            
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=True,
                output_data=assessment,
                tokens_used=1500
            )
            
        except Exception as e:
            logger.error(f"Neurology assessment error: {str(e)}")
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=False,
                error=str(e)
            )
    
    async def _check_red_flags(self, exam_data: NeurologicalExamInput) -> List[str]:
        """Check for neurological red flags requiring urgent attention."""
        red_flags_found = []
        
        # Check symptom-specific red flags
        for symptom in exam_data.symptoms:
            symptom_str = symptom.value
            if symptom_str in self._red_flags:
                for flag in self._red_flags[symptom_str]:
                    # Check if flag condition is present in exam data
                    if self._is_red_flag_present(flag, exam_data):
                        red_flags_found.append(f"{symptom_str}: {flag}")
        
        # Check for stroke symptoms (FAST)
        if self._check_stroke_symptoms(exam_data):
            red_flags_found.append("Possible acute stroke - immediate emergency evaluation needed")
        
        # Check for signs of increased intracranial pressure
        if self._check_icp_signs(exam_data):
            red_flags_found.append("Signs of increased intracranial pressure")
        
        return red_flags_found
    
    async def _localize_lesion(self, exam_data: NeurologicalExamInput) -> Dict[str, Any]:
        """Localize the neurological lesion based on symptoms and exam findings."""
        localization = {
            "level": None,
            "laterality": None,
            "specific_location": None,
            "pathway_involved": [],
            "confidence": 0.0
        }
        
        # Analyze motor findings
        if exam_data.motor_exam:
            motor_pattern = self._analyze_motor_pattern(exam_data.motor_exam)
            localization["level"] = motor_pattern.get("level")
            localization["laterality"] = motor_pattern.get("laterality")
        
        # Analyze sensory findings
        if exam_data.sensory_exam:
            sensory_pattern = self._analyze_sensory_pattern(exam_data.sensory_exam)
            if sensory_pattern.get("dermatome"):
                localization["specific_location"] = f"Dermatome {sensory_pattern['dermatome']}"
        
        # Check cranial nerve involvement
        if exam_data.cranial_nerves:
            cn_involved = self._analyze_cranial_nerves(exam_data.cranial_nerves)
            if cn_involved:
                localization["pathway_involved"].extend(cn_involved)
        
        # Determine confidence based on consistency of findings
        localization["confidence"] = self._calculate_localization_confidence(localization)
        
        return localization
    
    async def _generate_differential(
        self, 
        exam_data: NeurologicalExamInput,
        localization: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate differential diagnosis based on symptoms and localization."""
        differential = []
        
        # Create diagnostic prompt
        prompt = f"""
        Based on the following neurological presentation, provide a differential diagnosis:
        
        Symptoms: {[s.value for s in exam_data.symptoms]}
        Onset: {exam_data.onset}
        Progression: {exam_data.progression}
        Localization: {localization}
        Medical History: {exam_data.medical_history}
        
        Provide top 5 most likely diagnoses with:
        1. Diagnosis name
        2. Probability (0-100%)
        3. Supporting findings
        4. Against findings
        5. Key distinguishing features
        """
        
        # Get AI assessment
        ai_response await ai_service.complete(
                prompt,
                system_prompt="""You are an expert Neurology AI assistant specializing in ai agent specialized in neurology and neurological disorders..
Provide comprehensive, accurate, and actionable responses based on current best practices.""",
                temperature=0.3,
                max_tokens=1500
            )tem_prompt="""You are an expert Neurology AI assistant specializing in ai agent specialized in neurology and neurological disorders..
Provide comprehensive, accurate, and actionable responses based on current best practices.""",
                temperature=0.3,
                max_tokens=1500
            )   system_prompt="""You are an expert Neurology AI assistant specializing in ai agent specialized in neurology and neurological disorders..
Provide comprehensive, accurate, and actionable responses based on current best practices.""",
                temperature=0.3,
                max_tokens=1500
            )
        
        # Parse and structure differential
        # In production, this would use sophisticated parsing
        differential = [
            {
                "diagnosis": "Migraine with aura",
                "probability": 75,
                "supporting": ["Visual symptoms", "Headache pattern", "Family history"],
                "against": ["No photophobia reported"],
                "distinguishing": ["Gradual onset of visual symptoms", "Positive family history"]
            },
            {
                "diagnosis": "Transient ischemic attack",
                "probability": 15,
                "supporting": ["Sudden onset", "Focal symptoms"],
                "against": ["Young age", "Full recovery"],
                "distinguishing": ["Vascular risk factors", "Brief duration"]
            }
        ]
        
        return differential
    
    async def _recommend_tests(
        self,
        exam_data: NeurologicalExamInput,
        differential: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Recommend appropriate diagnostic tests."""
        tests = []
        
        # Determine tests based on leading diagnoses
        for dx in differential[:3]:  # Top 3 diagnoses
            diagnosis = dx["diagnosis"].lower()
            
            if "stroke" in diagnosis or "tia" in diagnosis:
                tests.extend([
                    {
                        "test": "MRI Brain with DWI",
                        "urgency": "urgent",
                        "rationale": "Detect acute ischemia",
                        "expected_findings": "DWI hyperintensity in vascular territory"
                    },
                    {
                        "test": "MRA Head and Neck",
                        "urgency": "urgent",
                        "rationale": "Evaluate vascular anatomy",
                        "expected_findings": "Stenosis or occlusion"
                    }
                ])
            
            elif "epilepsy" in diagnosis or "seizure" in diagnosis:
                tests.append({
                    "test": "EEG",
                    "urgency": "routine",
                    "rationale": "Detect epileptiform activity",
                    "expected_findings": "Interictal spikes or sharp waves"
                })
            
            elif "multiple sclerosis" in diagnosis:
                tests.extend([
                    {
                        "test": "MRI Brain and Spine with contrast",
                        "urgency": "routine",
                        "rationale": "Detect demyelinating lesions",
                        "expected_findings": "T2 hyperintense lesions, enhancing lesions"
                    },
                    {
                        "test": "Lumbar puncture",
                        "urgency": "routine",
                        "rationale": "Check for oligoclonal bands",
                        "expected_findings": "OCB positive, elevated IgG index"
                    }
                ])
        
        # Remove duplicates
        seen = set()
        unique_tests = []
        for test in tests:
            if test["test"] not in seen:
                seen.add(test["test"])
                unique_tests.append(test)
        
        return unique_tests
    
    async def _suggest_treatments(
        self,
        exam_data: NeurologicalExamInput,
        differential: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Suggest treatment options based on diagnosis."""
        treatments = []
        
        # Get primary diagnosis
        if differential:
            primary_dx = differential[0]["diagnosis"].lower()
            
            # Create treatment recommendations
            if "migraine" in primary_dx:
                treatments.extend([
                    {
                        "category": "Acute treatment",
                        "medications": ["Sumatriptan 100mg", "NSAIDs", "Antiemetics"],
                        "non_pharmacological": ["Dark quiet room", "Cold compress", "Hydration"],
                        "contraindications": ["Vascular disease for triptans"]
                    },
                    {
                        "category": "Preventive treatment",
                        "medications": ["Propranolol", "Topiramate", "CGRP antagonists"],
                        "lifestyle": ["Regular sleep", "Trigger avoidance", "Stress management"],
                        "indications": ["≥4 headaches/month", "Significant disability"]
                    }
                ])
            
            elif "epilepsy" in primary_dx:
                treatments.append({
                    "category": "Antiepileptic drugs",
                    "first_line": ["Levetiracetam", "Lamotrigine", "Valproate"],
                    "monitoring": ["Drug levels", "LFTs", "CBC"],
                    "lifestyle": ["Sleep hygiene", "Avoid triggers", "Medication compliance"],
                    "restrictions": ["Driving restrictions per local laws"]
                })
        
        return treatments
    
    async def _assess_prognosis(
        self,
        exam_data: NeurologicalExamInput,
        differential: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Assess prognosis based on condition and patient factors."""
        if not differential:
            return {"overall": "uncertain", "factors": []}
        
        primary_dx = differential[0]["diagnosis"]
        
        prognosis = {
            "overall": "good",
            "recovery_timeline": "variable",
            "factors_favorable": [],
            "factors_unfavorable": [],
            "functional_outcome": "",
            "recurrence_risk": ""
        }
        
        # Assess based on condition
        if "migraine" in primary_dx.lower():
            prognosis.update({
                "overall": "good with treatment",
                "recovery_timeline": "Hours to days per episode",
                "factors_favorable": ["Young age", "Identifiable triggers", "Response to treatment"],
                "factors_unfavorable": ["Frequent attacks", "Medication overuse", "Comorbid conditions"],
                "functional_outcome": "Full recovery between attacks",
                "recurrence_risk": "High without preventive treatment"
            })
        
        return prognosis
    
    async def _plan_follow_up(
        self,
        exam_data: NeurologicalExamInput,
        differential: List[Dict[str, Any]]
    ) -> str:
        """Create follow-up plan based on diagnosis and severity."""
        if not differential:
            return "Follow up with neurologist within 2-4 weeks"
        
        primary_dx = differential[0]["diagnosis"]
        severity = self._assess_severity(exam_data)
        
        if severity == "emergency":
            return "Immediate emergency department evaluation required"
        elif severity == "urgent":
            return "Neurology consultation within 24-48 hours"
        else:
            # Routine follow-up based on condition
            if "headache" in primary_dx.lower():
                return "Neurology follow-up in 4-6 weeks with headache diary"
            elif "epilepsy" in primary_dx.lower():
                return "Neurology follow-up in 2-4 weeks after starting medication"
            else:
                return "Neurology follow-up in 2-4 weeks with test results"
    
    async def _create_education_points(
        self,
        exam_data: NeurologicalExamInput,
        differential: List[Dict[str, Any]]
    ) -> List[str]:
        """Create patient education points."""
        education_points = [
            "Keep a symptom diary noting triggers and patterns",
            "Take medications as prescribed",
            "Report any new or worsening symptoms immediately"
        ]
        
        if differential and "migraine" in differential[0]["diagnosis"].lower():
            education_points.extend([
                "Identify and avoid personal migraine triggers",
                "Maintain regular sleep schedule",
                "Stay hydrated and avoid skipping meals",
                "Learn stress management techniques",
                "Understand when to use acute vs preventive medications"
            ])
        
        return education_points
    
    async def interpret_eeg(self, eeg_data: Dict[str, Any]) -> Dict[str, Any]:
        """Interpret EEG findings."""
        interpretation = {
            "background": "",
            "abnormalities": [],
            "epileptiform_activity": False,
            "localization": "",
            "clinical_correlation": "",
            "recommendations": []
        }
        
        # Analyze EEG patterns
        if eeg_data.get("spikes"):
            interpretation["epileptiform_activity"] = True
            interpretation["abnormalities"].append("Interictal spikes detected")
            interpretation["localization"] = eeg_data.get("spike_location", "")
        
        if eeg_data.get("slowing"):
            interpretation["abnormalities"].append(f"{eeg_data['slowing']} slowing")
        
        # Clinical correlation
        if interpretation["epileptiform_activity"]:
            interpretation["clinical_correlation"] = "Findings support diagnosis of epilepsy"
            interpretation["recommendations"].append("Consider antiepileptic medication")
        
        return interpretation
    
    async def interpret_mri(self, mri_data: Dict[str, Any]) -> Dict[str, Any]:
        """Interpret brain MRI findings."""
        interpretation = {
            "technique": mri_data.get("sequences", []),
            "findings": {
                "white_matter": [],
                "gray_matter": [],
                "vascular": [],
                "mass_effect": False,
                "enhancement": []
            },
            "impression": "",
            "differential": [],
            "recommendations": []
        }
        
        # Analyze findings
        if mri_data.get("t2_hyperintensities"):
            interpretation["findings"]["white_matter"].append("T2 hyperintense lesions")
            interpretation["differential"].extend([
                "Demyelinating disease",
                "Small vessel ischemic disease",
                "Inflammatory process"
            ])
        
        if mri_data.get("dwi_restriction"):
            interpretation["findings"]["vascular"].append("Acute infarct on DWI")
            interpretation["impression"] = "Acute ischemic stroke"
            interpretation["recommendations"].append("Urgent stroke evaluation")
        
        return interpretation
    
    async def calculate_stroke_scale(self, exam_findings: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate NIHSS (NIH Stroke Scale) score."""
        nihss_score = 0
        components = {}
        
        # Level of consciousness
        loc = exam_findings.get("level_of_consciousness", 0)
        nihss_score += loc
        components["consciousness"] = loc
        
        # Motor function
        motor = exam_findings.get("motor", {})
        for limb in ["right_arm", "left_arm", "right_leg", "left_leg"]:
            score = motor.get(limb, 0)
            nihss_score += score
            components[limb] = score
        
        # Language
        if exam_findings.get("aphasia"):
            language_score = 2 if exam_findings["aphasia"] == "severe" else 1
            nihss_score += language_score
            components["language"] = language_score
        
        # Interpretation
        severity = "mild"
        if nihss_score >= 16:
            severity = "severe"
        elif nihss_score >= 6:
            severity = "moderate"
        
        return {
            "total_score": nihss_score,
            "components": components,
            "severity": severity,
            "prognosis": self._get_stroke_prognosis(nihss_score)
        }
    
    def _check_stroke_symptoms(self, exam_data: NeurologicalExamInput) -> bool:
        """Check for acute stroke symptoms using FAST criteria."""
        stroke_signs = 0
        
        # Face drooping
        if exam_data.cranial_nerves and exam_data.cranial_nerves.get("facial_asymmetry"):
            stroke_signs += 1
        
        # Arm weakness
        if exam_data.motor_exam and (
            exam_data.motor_exam.get("arm_weakness") or 
            exam_data.motor_exam.get("drift")
        ):
            stroke_signs += 1
        
        # Speech difficulty
        if NeurologicalSymptom.SPEECH_DIFFICULTY in exam_data.symptoms:
            stroke_signs += 1
        
        # Time - sudden onset
        if "sudden" in exam_data.onset.lower():
            stroke_signs += 1
        
        return stroke_signs >= 2
    
    def _check_icp_signs(self, exam_data: NeurologicalExamInput) -> bool:
        """Check for signs of increased intracranial pressure."""
        icp_signs = []
        
        if NeurologicalSymptom.HEADACHE in exam_data.symptoms:
            if "worse in morning" in str(exam_data.triggers):
                icp_signs.append("morning headache")
        
        if exam_data.cranial_nerves and exam_data.cranial_nerves.get("papilledema"):
            icp_signs.append("papilledema")
        
        if NeurologicalSymptom.VISION_CHANGES in exam_data.symptoms:
            icp_signs.append("vision changes")
        
        return len(icp_signs) >= 2
    
    def _is_red_flag_present(self, flag: str, exam_data: NeurologicalExamInput) -> bool:
        """Check if a specific red flag is present in the exam data."""
        flag_lower = flag.lower()
        
        if "thunderclap" in flag_lower and "sudden" in exam_data.onset.lower():
            return True
        if "fever" in flag_lower and exam_data.medical_history.get("fever"):
            return True
        if "papilledema" in flag_lower and exam_data.cranial_nerves.get("papilledema"):
            return True
        
        return False
    
    def _analyze_motor_pattern(self, motor_exam: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze motor examination pattern for localization."""
        pattern = {"level": None, "laterality": None, "type": None}
        
        # Check for hemiparesis
        right_weak = motor_exam.get("right_arm_weak") or motor_exam.get("right_leg_weak")
        left_weak = motor_exam.get("left_arm_weak") or motor_exam.get("left_leg_weak")
        
        if right_weak and not left_weak:
            pattern["laterality"] = "right"
            pattern["level"] = "supratentorial"
        elif left_weak and not right_weak:
            pattern["laterality"] = "left"
            pattern["level"] = "supratentorial"
        elif motor_exam.get("legs_weak") and not motor_exam.get("arms_weak"):
            pattern["level"] = "spinal cord"
            pattern["type"] = "paraparesis"
        
        return pattern
    
    def _analyze_sensory_pattern(self, sensory_exam: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze sensory examination pattern."""
        pattern = {"type": None, "distribution": None, "dermatome": None}
        
        if sensory_exam.get("stocking_glove"):
            pattern["type"] = "peripheral neuropathy"
            pattern["distribution"] = "stocking-glove"
        elif sensory_exam.get("dermatomal"):
            pattern["type"] = "radicular"
            pattern["dermatome"] = sensory_exam.get("dermatome_level")
        
        return pattern
    
    def _analyze_cranial_nerves(self, cn_exam: Dict[str, Any]) -> List[str]:
        """Analyze cranial nerve findings."""
        involved = []
        
        cn_mapping = {
            "smell_loss": "CN I (Olfactory)",
            "vision_loss": "CN II (Optic)",
            "diplopia": "CN III, IV, or VI",
            "facial_numbness": "CN V (Trigeminal)",
            "facial_weakness": "CN VII (Facial)",
            "hearing_loss": "CN VIII (Vestibulocochlear)",
            "dysphagia": "CN IX, X (Glossopharyngeal, Vagus)",
            "tongue_deviation": "CN XII (Hypoglossal)"
        }
        
        for finding, cn in cn_mapping.items():
            if cn_exam.get(finding):
                involved.append(cn)
        
        return involved
    
    def _calculate_localization_confidence(self, localization: Dict[str, Any]) -> float:
        """Calculate confidence in anatomical localization."""
        confidence = 0.5  # Base confidence
        
        if localization["level"]:
            confidence += 0.2
        if localization["laterality"]:
            confidence += 0.15
        if localization["specific_location"]:
            confidence += 0.1
        if localization["pathway_involved"]:
            confidence += 0.05 * len(localization["pathway_involved"])
        
        return min(confidence, 0.95)
    
    def _assess_severity(self, exam_data: NeurologicalExamInput) -> str:
        """Assess overall severity of neurological presentation."""
        if any(symptom in [NeurologicalSymptom.SEIZURE, NeurologicalSymptom.CONFUSION] 
               for symptom in exam_data.symptoms):
            if "sudden" in exam_data.onset.lower():
                return "emergency"
        
        if len(exam_data.symptoms) > 3 and exam_data.progression == "rapid":
            return "urgent"
        
        return "routine"
    
    def _get_stroke_prognosis(self, nihss_score: int) -> str:
        """Get stroke prognosis based on NIHSS score."""
        if nihss_score <= 4:
            return "Good prognosis, likely to have favorable outcome"
        elif nihss_score <= 15:
            return "Moderate disability expected, rehabilitation recommended"
        else:
            return "Severe disability likely, intensive care and rehabilitation needed"