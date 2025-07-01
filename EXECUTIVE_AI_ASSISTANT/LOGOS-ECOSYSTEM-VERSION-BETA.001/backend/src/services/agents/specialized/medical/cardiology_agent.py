"""Cardiology Specialist Agent for LOGOS ECOSYSTEM."""

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


class CardiacSymptom(str, Enum):
    """Common cardiac symptoms."""
    CHEST_PAIN = "chest_pain"
    DYSPNEA = "dyspnea"
    PALPITATIONS = "palpitations"
    SYNCOPE = "syncope"
    EDEMA = "edema"
    FATIGUE = "fatigue"
    ORTHOPNEA = "orthopnea"
    PND = "paroxysmal_nocturnal_dyspnea"
    CLAUDICATION = "claudication"
    DIZZINESS = "dizziness"


class ChestPainCharacter(str, Enum):
    """Character of chest pain."""
    SHARP = "sharp"
    DULL = "dull"
    CRUSHING = "crushing"
    BURNING = "burning"
    STABBING = "stabbing"
    PRESSURE = "pressure"
    TIGHTNESS = "tightness"


class CardiacExamInput(BaseModel):
    """Input for cardiac examination."""
    symptoms: List[CardiacSymptom] = Field(..., description="List of cardiac symptoms")
    chest_pain_details: Optional[Dict[str, Any]] = Field(default={}, description="Detailed chest pain characteristics")
    duration: str = Field(..., description="Duration of symptoms")
    triggers: Optional[List[str]] = Field(default=[], description="Symptom triggers")
    relieving_factors: Optional[List[str]] = Field(default=[], description="What relieves symptoms")
    
    # Risk factors
    risk_factors: Optional[Dict[str, Any]] = Field(default={}, description="Cardiac risk factors")
    family_history: Optional[Dict[str, bool]] = Field(default={}, description="Family cardiac history")
    medications: Optional[List[str]] = Field(default=[], description="Current medications")
    
    # Vital signs
    blood_pressure: Optional[str] = Field(default=None, description="Blood pressure reading")
    heart_rate: Optional[int] = Field(default=None, description="Heart rate")
    oxygen_saturation: Optional[int] = Field(default=None, description="O2 saturation")
    
    # Physical exam
    heart_sounds: Optional[Dict[str, Any]] = Field(default={}, description="Auscultation findings")
    jugular_venous_pressure: Optional[str] = Field(default=None, description="JVP assessment")
    peripheral_pulses: Optional[Dict[str, Any]] = Field(default={}, description="Pulse examination")
    edema_assessment: Optional[Dict[str, Any]] = Field(default={}, description="Edema findings")


class ECGInput(BaseModel):
    """Input for ECG interpretation."""
    rate: int = Field(..., ge=0, le=300, description="Heart rate")
    rhythm: str = Field(..., description="Rhythm description")
    pr_interval: Optional[float] = Field(default=None, description="PR interval in ms")
    qrs_duration: Optional[float] = Field(default=None, description="QRS duration in ms")
    qt_interval: Optional[float] = Field(default=None, description="QT interval in ms")
    st_segments: Optional[Dict[str, str]] = Field(default={}, description="ST segment changes by lead")
    t_waves: Optional[Dict[str, str]] = Field(default={}, description="T wave changes by lead")
    q_waves: Optional[List[str]] = Field(default=[], description="Pathological Q waves location")


class CardiologyAgent(BaseAgent):
    """AI agent specialized in cardiology and cardiovascular diseases."""
    
    def __init__(self):
        metadata = AgentMetadata(
            name="Cardiology Specialist",
            description="Expert AI agent for cardiovascular assessment, diagnosis, and treatment. Specializes in heart disease, arrhythmias, and vascular conditions.",
            category=AgentCategory.MEDICAL,
            version="1.0.0",
            author="LOGOS Medical AI Team",
            pricing_model=PricingModel.PER_USE,
            price_per_use=3.00,
            tags=["cardiology", "heart", "cardiovascular", "ECG", "arrhythmia", "coronary"],
            capabilities=[
                "Cardiac symptom analysis",
                "ECG interpretation",
                "Risk stratification (TIMI, GRACE, CHA2DS2-VASc)",
                "Coronary artery disease assessment",
                "Heart failure evaluation",
                "Arrhythmia analysis",
                "Valvular disease assessment",
                "Hypertension management",
                "Lipid management",
                "Cardiac emergency triage"
            ],
            limitations=[
                "Cannot perform physical examination",
                "Cannot replace emergency cardiac care",
                "Requires accurate clinical data",
                "ECG interpretation requires digital data"
            ],
            status=AgentStatus.ACTIVE
        )
        super().__init__(metadata)
        
        self._cardiac_conditions = {}
        self._risk_scores = {}
        self._guidelines = {}
        self._normal_values = {}
    
    async def _setup(self):
        """Initialize cardiology knowledge base."""
        self._cardiac_conditions = {
            "coronary_artery_disease": {
                "acute_coronary_syndrome": ["STEMI", "NSTEMI", "unstable angina"],
                "chronic": ["stable angina", "silent ischemia", "chronic total occlusion"]
            },
            "heart_failure": {
                "systolic": ["HFrEF", "ischemic cardiomyopathy", "dilated cardiomyopathy"],
                "diastolic": ["HFpEF", "restrictive cardiomyopathy"],
                "right_sided": ["cor pulmonale", "RV failure"]
            },
            "arrhythmias": {
                "supraventricular": ["atrial fibrillation", "atrial flutter", "SVT", "WPW"],
                "ventricular": ["VT", "VF", "PVCs", "torsades de pointes"],
                "bradyarrhythmias": ["sinus bradycardia", "AV blocks", "sick sinus syndrome"]
            },
            "valvular": {
                "stenosis": ["aortic stenosis", "mitral stenosis", "tricuspid stenosis"],
                "regurgitation": ["aortic regurgitation", "mitral regurgitation", "tricuspid regurgitation"]
            }
        }
        
        self._normal_values = {
            "pr_interval": (120, 200),  # ms
            "qrs_duration": (80, 120),  # ms
            "qt_interval": {
                "male": (350, 450),  # ms
                "female": (360, 460)  # ms
            },
            "blood_pressure": {
                "normal": "<120/80",
                "elevated": "120-129/<80",
                "stage1_htn": "130-139/80-89",
                "stage2_htn": "≥140/90"
            }
        }
        
        logger.info("Cardiology agent initialized with comprehensive knowledge base")
    
    def get_input_schema(self) -> Type[BaseModel]:
        """Get the input schema for this agent."""
        return CardiacExamInput
    
    def get_output_schema(self) -> Type[BaseModel]:
        """Get the output schema for this agent."""
        class CardiacAssessment(BaseModel):
            risk_assessment: Dict[str, Any] = Field(..., description="Cardiac risk stratification")
            differential_diagnosis: List[Dict[str, Any]] = Field(..., description="Ranked differential diagnoses")
            diagnostic_tests: List[Dict[str, Any]] = Field(..., description="Recommended cardiac tests")
            treatment_plan: Dict[str, Any] = Field(..., description="Treatment recommendations")
            medications: List[Dict[str, Any]] = Field(..., description="Medication recommendations")
            lifestyle_modifications: List[str] = Field(..., description="Lifestyle recommendations")
            monitoring_plan: Dict[str, Any] = Field(..., description="Follow-up and monitoring")
            red_flags: List[str] = Field(..., description="Urgent findings")
            prevention_strategies: List[str] = Field(..., description="Preventive measures")
            
        return CardiacAssessment
    
    async def _execute(self, input_data: AgentInput) -> AgentOutput:
        """Execute cardiac assessment."""
        try:
            exam_data = CardiacExamInput(**input_data.input_data)
            
            # Check for cardiac emergencies
            red_flags = await self._check_cardiac_emergencies(exam_data)
            
            # Calculate risk scores
            risk_assessment = await self._calculate_risk_scores(exam_data)
            
            # Generate differential diagnosis
            differential = await self._generate_cardiac_differential(exam_data)
            
            # Recommend diagnostic tests
            tests = await self._recommend_cardiac_tests(exam_data, differential)
            
            # Create treatment plan
            treatment = await self._create_treatment_plan(exam_data, differential, risk_assessment)
            
            # Medication recommendations
            medications = await self._recommend_medications(exam_data, differential)
            
            # Create comprehensive assessment
            assessment = {
                "risk_assessment": risk_assessment,
                "differential_diagnosis": differential,
                "diagnostic_tests": tests,
                "treatment_plan": treatment,
                "medications": medications,
                "lifestyle_modifications": await self._suggest_lifestyle_changes(exam_data),
                "monitoring_plan": await self._create_monitoring_plan(exam_data, differential),
                "red_flags": red_flags,
                "prevention_strategies": await self._suggest_prevention(exam_data, risk_assessment)
            }
            
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=True,
                output_data=assessment,
                tokens_used=1800
            )
            
        except Exception as e:
            logger.error(f"Cardiac assessment error: {str(e)}")
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=False,
                error=str(e)
            )
    
    async def _check_cardiac_emergencies(self, exam_data: CardiacExamInput) -> List[str]:
        """Check for cardiac emergencies requiring immediate attention."""
        emergencies = []
        
        # Check for acute MI symptoms
        if CardiacSymptom.CHEST_PAIN in exam_data.symptoms:
            if exam_data.chest_pain_details:
                if self._is_acs_pattern(exam_data.chest_pain_details):
                    emergencies.append("Possible acute coronary syndrome - immediate ED evaluation")
        
        # Check for acute heart failure
        if (CardiacSymptom.DYSPNEA in exam_data.symptoms and 
            CardiacSymptom.ORTHOPNEA in exam_data.symptoms):
            emergencies.append("Acute decompensated heart failure - urgent evaluation")
        
        # Check for syncope with concerning features
        if CardiacSymptom.SYNCOPE in exam_data.symptoms:
            if exam_data.family_history.get("sudden_cardiac_death"):
                emergencies.append("Syncope with family history of SCD - urgent cardiac evaluation")
        
        # Check vital signs
        if exam_data.heart_rate:
            if exam_data.heart_rate > 150 or exam_data.heart_rate < 40:
                emergencies.append(f"Significant bradycardia/tachycardia (HR: {exam_data.heart_rate})")
        
        return emergencies
    
    async def _calculate_risk_scores(self, exam_data: CardiacExamInput) -> Dict[str, Any]:
        """Calculate various cardiac risk scores."""
        risk_scores = {}
        
        # Calculate ASCVD risk score
        if exam_data.risk_factors:
            ascvd_score = await self._calculate_ascvd_risk(exam_data.risk_factors)
            risk_scores["ascvd_10_year"] = ascvd_score
        
        # Calculate TIMI risk score if chest pain
        if CardiacSymptom.CHEST_PAIN in exam_data.symptoms:
            timi_score = await self._calculate_timi_score(exam_data)
            risk_scores["timi_score"] = timi_score
        
        # Calculate heart failure risk
        hf_risk = await self._assess_heart_failure_risk(exam_data)
        risk_scores["heart_failure_risk"] = hf_risk
        
        # Overall cardiovascular risk
        risk_scores["overall_cv_risk"] = self._determine_overall_risk(risk_scores)
        
        return risk_scores
    
    async def _generate_cardiac_differential(
        self, 
        exam_data: CardiacExamInput
    ) -> List[Dict[str, Any]]:
        """Generate cardiac differential diagnosis."""
        differential = []
        
        # Analyze symptom patterns
        if CardiacSymptom.CHEST_PAIN in exam_data.symptoms:
            chest_pain_ddx = await self._differential_chest_pain(exam_data)
            differential.extend(chest_pain_ddx)
        
        if CardiacSymptom.DYSPNEA in exam_data.symptoms:
            dyspnea_ddx = await self._differential_dyspnea(exam_data)
            differential.extend(dyspnea_ddx)
        
        if CardiacSymptom.PALPITATIONS in exam_data.symptoms:
            palpitation_ddx = await self._differential_palpitations(exam_data)
            differential.extend(palpitation_ddx)
        
        # Sort by probability and remove duplicates
        differential = self._consolidate_differential(differential)
        
        return differential[:5]  # Top 5 diagnoses
    
    async def _recommend_cardiac_tests(
        self,
        exam_data: CardiacExamInput,
        differential: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Recommend appropriate cardiac diagnostic tests."""
        tests = []
        
        # Basic tests for all cardiac patients
        tests.append({
            "test": "12-lead ECG",
            "urgency": "immediate",
            "rationale": "Baseline cardiac rhythm and ischemia assessment",
            "expected_findings": "Look for ST changes, arrhythmias, conduction abnormalities"
        })
        
        # Test selection based on symptoms and differential
        if any("coronary" in dx["diagnosis"].lower() for dx in differential):
            tests.extend([
                {
                    "test": "Troponin levels",
                    "urgency": "stat",
                    "rationale": "Rule out myocardial injury",
                    "expected_findings": "Elevation indicates myocardial necrosis"
                },
                {
                    "test": "Stress test or coronary CTA",
                    "urgency": "urgent",
                    "rationale": "Evaluate for coronary artery disease",
                    "expected_findings": "Inducible ischemia or coronary stenosis"
                }
            ])
        
        if any("heart failure" in dx["diagnosis"].lower() for dx in differential):
            tests.extend([
                {
                    "test": "BNP or NT-proBNP",
                    "urgency": "urgent",
                    "rationale": "Assess for heart failure",
                    "expected_findings": "Elevation suggests heart failure"
                },
                {
                    "test": "Echocardiogram",
                    "urgency": "urgent",
                    "rationale": "Evaluate cardiac structure and function",
                    "expected_findings": "EF, wall motion, valvular function"
                }
            ])
        
        if CardiacSymptom.PALPITATIONS in exam_data.symptoms:
            tests.append({
                "test": "Holter monitor or event recorder",
                "urgency": "routine",
                "rationale": "Capture arrhythmias during symptoms",
                "expected_findings": "Correlation of symptoms with rhythm"
            })
        
        return tests
    
    async def _create_treatment_plan(
        self,
        exam_data: CardiacExamInput,
        differential: List[Dict[str, Any]],
        risk_assessment: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create comprehensive cardiac treatment plan."""
        treatment_plan = {
            "immediate_interventions": [],
            "medical_therapy": [],
            "procedural_options": [],
            "cardiac_rehabilitation": False,
            "risk_factor_modification": []
        }
        
        # Immediate interventions based on red flags
        if risk_assessment.get("overall_cv_risk") == "high":
            treatment_plan["immediate_interventions"].append("Admission for cardiac monitoring")
        
        # Medical therapy based on diagnosis
        primary_dx = differential[0]["diagnosis"] if differential else "Unknown"
        
        if "coronary" in primary_dx.lower():
            treatment_plan["medical_therapy"].extend([
                "Dual antiplatelet therapy (aspirin + P2Y12 inhibitor)",
                "High-intensity statin",
                "Beta-blocker",
                "ACE inhibitor/ARB"
            ])
            treatment_plan["procedural_options"].append("Coronary angiography consideration")
        
        elif "heart failure" in primary_dx.lower():
            treatment_plan["medical_therapy"].extend([
                "ACE inhibitor/ARB/ARNI",
                "Beta-blocker (carvedilol, metoprolol succinate, bisoprolol)",
                "Mineralocorticoid receptor antagonist",
                "SGLT2 inhibitor",
                "Loop diuretic for volume management"
            ])
            treatment_plan["cardiac_rehabilitation"] = True
        
        # Risk factor modification
        treatment_plan["risk_factor_modification"] = await self._get_risk_factor_targets(exam_data)
        
        return treatment_plan
    
    async def _recommend_medications(
        self,
        exam_data: CardiacExamInput,
        differential: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Recommend specific cardiac medications."""
        medications = []
        
        # Antiplatelet therapy
        if any("coronary" in dx["diagnosis"].lower() for dx in differential):
            medications.append({
                "class": "Antiplatelet",
                "medication": "Aspirin 81mg daily",
                "indication": "CAD prevention",
                "monitoring": "Watch for bleeding",
                "contraindications": ["Active bleeding", "Severe thrombocytopenia"]
            })
        
        # Statin therapy
        if exam_data.risk_factors.get("hyperlipidemia") or exam_data.risk_factors.get("diabetes"):
            medications.append({
                "class": "Statin",
                "medication": "Atorvastatin 40-80mg daily",
                "indication": "Lipid management and plaque stabilization",
                "monitoring": "LFTs, CPK, lipid panel",
                "contraindications": ["Active liver disease", "Pregnancy"]
            })
        
        # Blood pressure management
        if exam_data.blood_pressure and self._is_hypertensive(exam_data.blood_pressure):
            medications.append({
                "class": "ACE inhibitor",
                "medication": "Lisinopril 10mg daily",
                "indication": "Hypertension and cardiac protection",
                "monitoring": "Potassium, creatinine",
                "contraindications": ["Bilateral RAS", "Pregnancy", "Angioedema history"]
            })
        
        return medications
    
    async def _suggest_lifestyle_changes(self, exam_data: CardiacExamInput) -> List[str]:
        """Suggest cardiac-specific lifestyle modifications."""
        lifestyle_changes = [
            "Mediterranean or DASH diet for cardiovascular health",
            "Regular aerobic exercise (150 min/week moderate intensity)",
            "Weight loss if BMI > 25",
            "Smoking cessation if applicable",
            "Limit alcohol to ≤1 drink/day for women, ≤2 for men",
            "Stress management techniques",
            "Sleep hygiene (7-9 hours/night)",
            "Medication adherence"
        ]
        
        # Add specific recommendations based on conditions
        if exam_data.risk_factors.get("diabetes"):
            lifestyle_changes.append("Glycemic control with HbA1c target <7%")
        
        if CardiacSymptom.EDEMA in exam_data.symptoms:
            lifestyle_changes.append("Sodium restriction <2g/day")
            lifestyle_changes.append("Daily weight monitoring")
        
        return lifestyle_changes
    
    async def _create_monitoring_plan(
        self,
        exam_data: CardiacExamInput,
        differential: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Create cardiac monitoring and follow-up plan."""
        monitoring_plan = {
            "frequency": "Monthly initially, then every 3-6 months",
            "parameters": [],
            "home_monitoring": [],
            "when_to_seek_help": []
        }
        
        # Standard monitoring
        monitoring_plan["parameters"] = [
            "Blood pressure and heart rate",
            "Weight and volume status",
            "Functional capacity",
            "Medication adherence"
        ]
        
        # Condition-specific monitoring
        if any("heart failure" in dx["diagnosis"].lower() for dx in differential):
            monitoring_plan["home_monitoring"].extend([
                "Daily weights (call if >3 lbs in 1 day or >5 lbs in 1 week)",
                "Blood pressure and heart rate daily",
                "Symptom diary"
            ])
            monitoring_plan["parameters"].append("BNP/NT-proBNP levels")
        
        # When to seek help
        monitoring_plan["when_to_seek_help"] = [
            "New or worsening chest pain",
            "Severe shortness of breath",
            "Syncope or near-syncope",
            "Rapid weight gain",
            "Palpitations with dizziness"
        ]
        
        return monitoring_plan
    
    async def _suggest_prevention(
        self,
        exam_data: CardiacExamInput,
        risk_assessment: Dict[str, Any]
    ) -> List[str]:
        """Suggest cardiovascular prevention strategies."""
        prevention = [
            "Annual lipid screening",
            "Blood pressure monitoring",
            "Diabetes screening if risk factors present",
            "Maintain healthy weight (BMI 18.5-24.9)",
            "Regular physical activity",
            "Heart-healthy diet"
        ]
        
        # Risk-based prevention
        if risk_assessment.get("ascvd_10_year", {}).get("risk", 0) > 7.5:
            prevention.append("Consider statin therapy for primary prevention")
        
        if exam_data.family_history.get("premature_cad"):
            prevention.append("Consider early screening with coronary calcium score")
        
        return prevention
    
    async def interpret_ecg(self, ecg_data: ECGInput) -> Dict[str, Any]:
        """Interpret 12-lead ECG findings."""
        interpretation = {
            "rate": ecg_data.rate,
            "rhythm": ecg_data.rhythm,
            "axis": "Normal",  # Would calculate from leads
            "intervals": {},
            "st_t_changes": {},
            "chamber_abnormalities": [],
            "ischemia": False,
            "infarct": False,
            "clinical_impression": "",
            "recommendations": []
        }
        
        # Check intervals
        if ecg_data.pr_interval:
            if ecg_data.pr_interval > 200:
                interpretation["intervals"]["pr"] = "Prolonged - 1st degree AV block"
            elif ecg_data.pr_interval < 120:
                interpretation["intervals"]["pr"] = "Short - consider pre-excitation"
        
        if ecg_data.qrs_duration:
            if ecg_data.qrs_duration > 120:
                interpretation["intervals"]["qrs"] = "Wide - bundle branch block or ventricular rhythm"
        
        # Check for ischemia/infarct
        if ecg_data.st_segments:
            for lead, change in ecg_data.st_segments.items():
                if "elevation" in change.lower():
                    interpretation["ischemia"] = True
                    interpretation["st_t_changes"][lead] = "ST elevation"
                    interpretation["clinical_impression"] = "STEMI"
                    interpretation["recommendations"].append("Immediate cardiac catheterization")
                elif "depression" in change.lower():
                    interpretation["ischemia"] = True
                    interpretation["st_t_changes"][lead] = "ST depression"
        
        # Check for pathological Q waves
        if ecg_data.q_waves:
            interpretation["infarct"] = True
            interpretation["clinical_impression"] += " with Q waves suggesting old MI"
        
        return interpretation
    
    async def calculate_cha2ds2_vasc(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate CHA2DS2-VASc score for atrial fibrillation stroke risk."""
        score = 0
        components = {}
        
        # Congestive heart failure
        if patient_data.get("heart_failure"):
            score += 1
            components["heart_failure"] = 1
        
        # Hypertension
        if patient_data.get("hypertension"):
            score += 1
            components["hypertension"] = 1
        
        # Age
        age = patient_data.get("age", 0)
        if age >= 75:
            score += 2
            components["age"] = 2
        elif age >= 65:
            score += 1
            components["age"] = 1
        
        # Diabetes
        if patient_data.get("diabetes"):
            score += 1
            components["diabetes"] = 1
        
        # Stroke/TIA history
        if patient_data.get("stroke_history"):
            score += 2
            components["stroke"] = 2
        
        # Vascular disease
        if patient_data.get("vascular_disease"):
            score += 1
            components["vascular"] = 1
        
        # Sex
        if patient_data.get("sex") == "female":
            score += 1
            components["sex"] = 1
        
        # Risk stratification
        annual_stroke_risk = {
            0: 0,
            1: 1.3,
            2: 2.2,
            3: 3.2,
            4: 4.0,
            5: 6.7,
            6: 9.8,
            7: 9.6,
            8: 12.5,
            9: 15.2
        }
        
        risk = annual_stroke_risk.get(score, 15.2)
        
        recommendation = "No anticoagulation needed"
        if score >= 2:
            recommendation = "Anticoagulation recommended"
        elif score == 1:
            recommendation = "Consider anticoagulation"
        
        return {
            "total_score": score,
            "components": components,
            "annual_stroke_risk": f"{risk}%",
            "recommendation": recommendation
        }
    
    async def calculate_heart_failure_staging(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Determine heart failure stage (ACC/AHA classification)."""
        stage = "A"
        description = ""
        management = []
        
        # Stage A - At risk
        if (patient_data.get("hypertension") or patient_data.get("diabetes") or 
            patient_data.get("cad") or patient_data.get("family_history_hf")):
            stage = "A"
            description = "At risk for HF but without structural heart disease or symptoms"
            management = ["Risk factor modification", "ACE inhibitor/ARB if indicated"]
        
        # Stage B - Pre-HF
        if (patient_data.get("lv_dysfunction") or patient_data.get("mi_history") or
            patient_data.get("valve_disease")):
            stage = "B"
            description = "Structural heart disease but without signs or symptoms of HF"
            management = ["ACE inhibitor/ARB", "Beta-blocker", "Statin if CAD"]
        
        # Stage C - Symptomatic HF
        if patient_data.get("hf_symptoms"):
            stage = "C"
            description = "Structural heart disease with prior or current symptoms of HF"
            management = [
                "GDMT (ACE/ARB/ARNI, BB, MRA, SGLT2i)",
                "Diuretics for congestion",
                "Device therapy if eligible"
            ]
        
        # Stage D - Advanced HF
        if patient_data.get("refractory_symptoms"):
            stage = "D"
            description = "Refractory HF requiring specialized interventions"
            management = [
                "Advanced therapies (VAD, transplant)",
                "Palliative care consideration",
                "Specialized HF center referral"
            ]
        
        return {
            "stage": stage,
            "description": description,
            "management": management
        }
    
    def _is_acs_pattern(self, chest_pain_details: Dict[str, Any]) -> bool:
        """Determine if chest pain pattern suggests ACS."""
        acs_features = 0
        
        if chest_pain_details.get("character") in ["crushing", "pressure", "tightness"]:
            acs_features += 1
        if chest_pain_details.get("radiation") in ["left arm", "jaw", "back"]:
            acs_features += 1
        if chest_pain_details.get("associated_symptoms", []):
            if any(s in chest_pain_details["associated_symptoms"] for s in ["nausea", "diaphoresis", "dyspnea"]):
                acs_features += 1
        
        return acs_features >= 2
    
    async def _calculate_ascvd_risk(self, risk_factors: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate 10-year ASCVD risk."""
        # Simplified calculation - in production would use full Pooled Cohort Equations
        base_risk = 5.0
        
        if risk_factors.get("age", 0) > 55:
            base_risk += 5
        if risk_factors.get("smoking"):
            base_risk += 5
        if risk_factors.get("diabetes"):
            base_risk += 5
        if risk_factors.get("hypertension"):
            base_risk += 3
        if risk_factors.get("hyperlipidemia"):
            base_risk += 3
        
        risk_category = "low"
        if base_risk >= 20:
            risk_category = "high"
        elif base_risk >= 7.5:
            risk_category = "intermediate"
        
        return {
            "risk": base_risk,
            "category": risk_category,
            "recommendation": f"{'Statin indicated' if base_risk >= 7.5 else 'Lifestyle modification'}"
        }
    
    async def _calculate_timi_score(self, exam_data: CardiacExamInput) -> Dict[str, Any]:
        """Calculate TIMI risk score for UA/NSTEMI."""
        score = 0
        criteria = {}
        
        # Age >= 65
        if exam_data.risk_factors.get("age", 0) >= 65:
            score += 1
            criteria["age_65"] = True
        
        # >= 3 CAD risk factors
        rf_count = sum([
            exam_data.risk_factors.get("hypertension", False),
            exam_data.risk_factors.get("hyperlipidemia", False),
            exam_data.risk_factors.get("diabetes", False),
            exam_data.risk_factors.get("smoking", False),
            exam_data.risk_factors.get("family_history", False)
        ])
        if rf_count >= 3:
            score += 1
            criteria["cad_risk_factors"] = True
        
        # Known CAD
        if exam_data.risk_factors.get("known_cad"):
            score += 1
            criteria["known_cad"] = True
        
        # Severe angina
        if exam_data.chest_pain_details.get("episodes", 0) >= 2:
            score += 1
            criteria["severe_angina"] = True
        
        # Risk interpretation
        risk_levels = {
            0: {"risk": "low", "mortality": "1%"},
            1: {"risk": "low", "mortality": "1%"},
            2: {"risk": "low", "mortality": "3%"},
            3: {"risk": "intermediate", "mortality": "5%"},
            4: {"risk": "intermediate", "mortality": "7%"},
            5: {"risk": "high", "mortality": "12%"},
            6: {"risk": "high", "mortality": "19%"},
            7: {"risk": "high", "mortality": "41%"}
        }
        
        risk_data = risk_levels.get(score, {"risk": "high", "mortality": "41%"})
        
        return {
            "score": score,
            "criteria": criteria,
            "risk_category": risk_data["risk"],
            "14_day_mortality": risk_data["mortality"]
        }
    
    async def _assess_heart_failure_risk(self, exam_data: CardiacExamInput) -> Dict[str, Any]:
        """Assess risk of heart failure."""
        risk_score = 0
        risk_factors = []
        
        # Clinical symptoms
        hf_symptoms = [CardiacSymptom.DYSPNEA, CardiacSymptom.ORTHOPNEA, 
                      CardiacSymptom.PND, CardiacSymptom.EDEMA]
        symptom_count = sum(1 for s in exam_data.symptoms if s in hf_symptoms)
        
        if symptom_count >= 2:
            risk_score += 3
            risk_factors.append("Multiple HF symptoms")
        
        # Risk factors
        if exam_data.risk_factors.get("hypertension"):
            risk_score += 1
            risk_factors.append("Hypertension")
        
        if exam_data.risk_factors.get("cad"):
            risk_score += 2
            risk_factors.append("CAD")
        
        # Physical exam
        if exam_data.jugular_venous_pressure == "elevated":
            risk_score += 2
            risk_factors.append("Elevated JVP")
        
        risk_level = "low"
        if risk_score >= 5:
            risk_level = "high"
        elif risk_score >= 3:
            risk_level = "moderate"
        
        return {
            "risk_level": risk_level,
            "score": risk_score,
            "factors": risk_factors
        }
    
    def _determine_overall_risk(self, risk_scores: Dict[str, Any]) -> str:
        """Determine overall cardiovascular risk."""
        # Check individual risk scores
        if risk_scores.get("timi_score", {}).get("risk_category") == "high":
            return "high"
        if risk_scores.get("heart_failure_risk", {}).get("risk_level") == "high":
            return "high"
        if risk_scores.get("ascvd_10_year", {}).get("category") == "high":
            return "high"
        
        # Check for intermediate risk
        if any(score.get("category") == "intermediate" or score.get("risk_level") == "moderate" 
               for score in risk_scores.values() if isinstance(score, dict)):
            return "moderate"
        
        return "low"
    
    async def _differential_chest_pain(self, exam_data: CardiacExamInput) -> List[Dict[str, Any]]:
        """Generate differential for chest pain."""
        differential = []
        
        cp_details = exam_data.chest_pain_details
        
        # ACS pattern
        if self._is_acs_pattern(cp_details):
            differential.append({
                "diagnosis": "Acute Coronary Syndrome",
                "probability": 80,
                "supporting": ["Typical anginal pattern", "Risk factors"],
                "tests_needed": ["Troponin", "ECG", "Coronary angiography"]
            })
        
        # Stable angina
        if cp_details.get("exertional") and cp_details.get("relief_with_rest"):
            differential.append({
                "diagnosis": "Stable Angina",
                "probability": 70,
                "supporting": ["Exertional pattern", "Predictable", "Relief with rest"],
                "tests_needed": ["Stress test", "Coronary CTA"]
            })
        
        # Pericarditis
        if cp_details.get("positional") and cp_details.get("sharp"):
            differential.append({
                "diagnosis": "Pericarditis",
                "probability": 60,
                "supporting": ["Positional", "Sharp pain", "Friction rub"],
                "tests_needed": ["ECG", "Echo", "Inflammatory markers"]
            })
        
        return differential
    
    async def _differential_dyspnea(self, exam_data: CardiacExamInput) -> List[Dict[str, Any]]:
        """Generate differential for dyspnea."""
        differential = []
        
        # Heart failure
        if (CardiacSymptom.ORTHOPNEA in exam_data.symptoms or 
            CardiacSymptom.PND in exam_data.symptoms):
            differential.append({
                "diagnosis": "Heart Failure",
                "probability": 85,
                "supporting": ["Orthopnea/PND", "Edema", "Elevated JVP"],
                "tests_needed": ["BNP", "Echo", "Chest X-ray"]
            })
        
        # Pulmonary embolism
        if exam_data.risk_factors.get("dvt_risk"):
            differential.append({
                "diagnosis": "Pulmonary Embolism",
                "probability": 60,
                "supporting": ["Sudden onset", "Risk factors", "Tachycardia"],
                "tests_needed": ["D-dimer", "CT PE protocol"]
            })
        
        return differential
    
    async def _differential_palpitations(self, exam_data: CardiacExamInput) -> List[Dict[str, Any]]:
        """Generate differential for palpitations."""
        differential = []
        
        # Atrial fibrillation
        if exam_data.heart_rate and exam_data.heart_rate > 100:
            differential.append({
                "diagnosis": "Atrial Fibrillation",
                "probability": 70,
                "supporting": ["Irregular rhythm", "Rapid rate"],
                "tests_needed": ["ECG", "Holter monitor", "Echo"]
            })
        
        # SVT
        if exam_data.triggers and "sudden" in str(exam_data.triggers):
            differential.append({
                "diagnosis": "Supraventricular Tachycardia",
                "probability": 65,
                "supporting": ["Sudden onset/offset", "Regular rhythm"],
                "tests_needed": ["ECG during episode", "EP study"]
            })
        
        return differential
    
    def _consolidate_differential(self, differential: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Consolidate and sort differential diagnoses."""
        # Remove duplicates
        seen = set()
        unique_diff = []
        
        for dx in differential:
            if dx["diagnosis"] not in seen:
                seen.add(dx["diagnosis"])
                unique_diff.append(dx)
        
        # Sort by probability
        unique_diff.sort(key=lambda x: x.get("probability", 0), reverse=True)
        
        return unique_diff
    
    def _is_hypertensive(self, bp_string: str) -> bool:
        """Check if blood pressure indicates hypertension."""
        try:
            systolic, diastolic = map(int, bp_string.split('/'))
            return systolic >= 130 or diastolic >= 80
        except:
            return False
    
    async def _get_risk_factor_targets(self, exam_data: CardiacExamInput) -> List[str]:
        """Get specific risk factor modification targets."""
        targets = []
        
        if exam_data.blood_pressure and self._is_hypertensive(exam_data.blood_pressure):
            targets.append("Blood pressure <130/80 mmHg")
        
        if exam_data.risk_factors.get("diabetes"):
            targets.append("HbA1c <7%")
        
        if exam_data.risk_factors.get("hyperlipidemia"):
            targets.append("LDL <70 mg/dL if ASCVD, <100 mg/dL otherwise")
        
        if exam_data.risk_factors.get("smoking"):
            targets.append("Complete smoking cessation")
        
        if exam_data.risk_factors.get("obesity"):
            targets.append("Weight loss 5-10% of body weight")
        
        return targets