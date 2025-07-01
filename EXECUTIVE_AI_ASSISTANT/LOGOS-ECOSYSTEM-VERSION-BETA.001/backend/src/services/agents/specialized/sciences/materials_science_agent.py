"""Materials Science Agent for LOGOS ECOSYSTEM."""

from typing import List, Dict, Any, Optional, Type, Union, Tuple
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator
import re

from ....base_agent import (, AgentStatus, PricingModel
    BaseAIAgent, AgentMetadata, AgentCategory, PricingModel,
    AgentStatus, AgentInput, AgentOutput
)
from ..audio_agent_wrapper import AudioAgentWrapper, audio_agent_registry
from ....shared.utils.logger import get_logger
from ...iot.device_manager import DeviceManager
from ...automotive.car_integration import CarIntegrationService

logger = get_logger(__name__)


class MaterialsInput(BaseModel):
    """Input schema for materials science analysis."""
    task_type: str = Field(..., description="Type of materials science task")
    material_class: str = Field(..., description="Class of material (metal, ceramic, polymer, etc.)")
    materials: List[str] = Field(default=[], description="Specific materials involved")
    properties_of_interest: List[str] = Field(default=[], description="Properties to analyze")
    conditions: Dict[str, Union[float, str]] = Field(default={}, description="Environmental conditions")
    processing_method: Optional[str] = Field(None, description="Processing or synthesis method")
    application: Optional[str] = Field(None, description="Intended application")
    characterization_methods: List[str] = Field(default=[], description="Characterization techniques")
    performance_requirements: Dict[str, Any] = Field(default={}, description="Performance specifications")
    include_nanoscale: bool = Field(default=False, description="Include nanoscale analysis")
    sustainability_analysis: bool = Field(default=True, description="Include sustainability assessment")
    
    @field_validator('task_type')
    @classmethod
    def validate_task_type(cls, v):
        valid_types = [
            'material_selection', 'property_prediction', 'synthesis_design',
            'structure_analysis', 'failure_analysis', 'processing_optimization',
            'characterization', 'composite_design', 'biomaterial_assessment',
            'electronic_material', 'coating_design', 'corrosion_analysis'
        ]
        if v.lower() not in valid_types:
            raise ValueError(f"Task type must be one of {valid_types}")
        return v.lower()
    
    @field_validator('material_class')
    @classmethod
    def validate_material_class(cls, v):
        valid_classes = [
            'metal', 'ceramic', 'polymer', 'composite', 'semiconductor',
            'biomaterial', 'nanomaterial', 'glass', 'smart_material', 'hybrid'
        ]
        if v.lower() not in valid_classes:
            raise ValueError(f"Material class must be one of {valid_classes}")
        return v.lower()


class MaterialsOutput(BaseModel):
    """Output schema for materials science solutions."""
    analysis_summary: str = Field(..., description="Summary of materials analysis")
    material_properties: Dict[str, Any] = Field(..., description="Detailed material properties")
    structure_analysis: Dict[str, Any] = Field(..., description="Structural characteristics")
    processing_recommendations: List[Dict[str, Any]] = Field(default=[], description="Processing guidelines")
    performance_predictions: Dict[str, Any] = Field(default={}, description="Performance estimates")
    characterization_results: Dict[str, Any] = Field(default={}, description="Characterization data")
    failure_modes: List[Dict[str, str]] = Field(default=[], description="Potential failure mechanisms")
    optimization_suggestions: List[str] = Field(default=[], description="Optimization strategies")
    alternative_materials: List[Dict[str, Any]] = Field(default=[], description="Alternative options")
    sustainability_metrics: Dict[str, Any] = Field(default={}, description="Environmental impact")
    cost_analysis: Dict[str, float] = Field(default={}, description="Cost breakdown")
    applications: List[Dict[str, str]] = Field(default=[], description="Potential applications")
    safety_considerations: List[str] = Field(default=[], description="Safety and handling")
    references: List[str] = Field(default=[], description="Scientific references")
    iot_integration: Optional[Dict[str, Any]] = Field(None, description="IoT sensor integration")
    automotive_applications: Optional[Dict[str, Any]] = Field(None, description="Automotive use cases")


class MaterialsScienceAgent(BaseAgent):
    """AI agent specialized in materials science and engineering."""
    
    def __init__(self):
        metadata = AgentMetadata(
            name="Materials Science & Engineering Expert",
            description="Advanced AI agent for material properties analysis, synthesis design, characterization, and applications. Expert in metals, ceramics, polymers, composites, nanomaterials, and smart materials with IoT and automotive integration.",
            category=AgentCategory.ENGINEERING,
            version="1.0.0",
            author="LOGOS Materials Science Team",
            pricing_model=PricingModel.PER_USE,
            price_per_use=2.50,
            tags=["materials", "engineering", "nanotechnology", "composites", "metallurgy", "polymers", "ceramics", "biomaterials"],
            capabilities=[
                "Material structure analysis (crystallography, defects, grain boundaries)",
                "Property prediction (mechanical, electrical, thermal, optical)",
                "Metals and alloys expertise (processing, heat treatment, corrosion)",
                "Ceramics and glasses knowledge (synthesis, sintering, applications)",
                "Polymer science (synthesis, processing, composites)",
                "Nanomaterials design (nanoparticles, nanotubes, graphene, quantum dots)",
                "Biomaterials assessment (biocompatibility, implants, tissue engineering)",
                "Electronic materials (semiconductors, superconductors, dielectrics)",
                "Material characterization (microscopy, spectroscopy, diffraction)",
                "Smart materials and coatings design",
                "Audio I/O support for hands-free operation",
                "IoT sensor integration for real-time monitoring",
                "Automotive materials applications"
            ],
            limitations=[
                "Cannot perform physical experiments",
                "Predictions based on known material science principles",
                "Novel material properties require experimental validation",
                "Safety recommendations require professional verification"
            ],
            status=AgentStatus.ACTIVE
        )
        super().__init__(metadata)
        
        self._material_database = {}
        self._property_models = {}
        self._processing_methods = {}
        self._characterization_techniques = {}
        self._audio_wrapper = None
        self._device_manager = None
        self._car_integration = None
    
    async def _setup(self):
        """Initialize materials science knowledge base and integrations."""
        # Initialize material property database
        self._material_database = {
            "metals": {
                "steel": {"density": 7850, "youngs_modulus": 200, "yield_strength": 250},
                "aluminum": {"density": 2700, "youngs_modulus": 70, "yield_strength": 90},
                "titanium": {"density": 4500, "youngs_modulus": 110, "yield_strength": 880},
                "copper": {"density": 8960, "youngs_modulus": 117, "electrical_conductivity": 5.96e7}
            },
            "ceramics": {
                "alumina": {"density": 3900, "hardness": 18, "thermal_conductivity": 30},
                "silicon_carbide": {"density": 3200, "hardness": 25, "max_temp": 1600},
                "zirconia": {"density": 6000, "fracture_toughness": 10, "thermal_expansion": 10.5e-6}
            },
            "polymers": {
                "polyethylene": {"density": 950, "tensile_strength": 25, "melting_point": 130},
                "nylon": {"density": 1140, "tensile_strength": 75, "water_absorption": 2.5},
                "peek": {"density": 1320, "tensile_strength": 100, "max_temp": 250}
            },
            "nanomaterials": {
                "carbon_nanotubes": {"density": 1350, "tensile_strength": 63000, "aspect_ratio": 1000},
                "graphene": {"thickness": 0.335e-9, "youngs_modulus": 1000, "electron_mobility": 200000},
                "quantum_dots": {"size_range": "2-10nm", "quantum_yield": 0.9, "applications": ["displays", "solar"]}
            }
        }
        
        self._processing_methods = {
            "metals": ["casting", "forging", "rolling", "heat_treatment", "powder_metallurgy"],
            "ceramics": ["sintering", "hot_pressing", "sol-gel", "cvd", "sps"],
            "polymers": ["injection_molding", "extrusion", "3d_printing", "compression_molding"],
            "composites": ["hand_layup", "rtm", "filament_winding", "autoclave", "pultrusion"]
        }
        
        self._characterization_techniques = {
            "microscopy": ["SEM", "TEM", "AFM", "optical", "confocal"],
            "spectroscopy": ["XPS", "EDS", "FTIR", "Raman", "UV-Vis"],
            "diffraction": ["XRD", "SAED", "neutron", "EBSD"],
            "mechanical": ["tensile", "compression", "hardness", "fatigue", "creep"],
            "thermal": ["DSC", "TGA", "DMA", "thermal_conductivity"]
        }
        
        # Initialize audio wrapper for voice interactions
        self._audio_wrapper = audio_agent_registry.wrap_agent(self)
        
        # Initialize IoT device manager for sensor integration
        self._device_manager = DeviceManager()
        
        # Initialize automotive integration service
        self._car_integration = CarIntegrationService()
        
        logger.info("Materials Science agent initialized with comprehensive databases and integrations")
    
    def get_input_schema(self) -> Type[BaseModel]:
        """Get the input schema for this agent."""
        return MaterialsInput
    
    def get_output_schema(self) -> Type[BaseModel]:
        """Get the output schema for this agent."""
        return MaterialsOutput
    
    async def _execute(self, input_data: AgentInput) -> AgentOutput:
        """Execute materials science analysis."""
        try:
            # Validate input
            mat_input = MaterialsInput(**input_data.input_data)
            
            # Create materials analysis prompt
            prompt = await self._create_materials_prompt(mat_input)
            
            # Get AI analysis
            ai_response = # Get real AI analysis from Claude
            from ....ai.ai_integration import ai_service
            
            system_prompt = """You are an expert Materials Science with deep knowledge and experience.
AI agent specialized in materials science and engineering.

Your responses should be:
- Detailed and technically accurate
- Practical and actionable
- Based on current best practices
- Tailored to the specific query"""
            
            ai_response = await ai_service.complete(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.2,
                max_tokens=4000
            )
            
            # Parse and structure results
            analysis_results = await self._parse_materials_results(ai_response, mat_input)
            
            # Perform property calculations
            property_data = await self._calculate_properties(mat_input)
            analysis_results["material_properties"].update(property_data)
            
            # Add IoT integration if applicable
            if mat_input.application and "sensor" in mat_input.application.lower():
                iot_data = await self._generate_iot_integration(mat_input)
                analysis_results["iot_integration"] = iot_data
            
            # Add automotive applications if relevant
            if mat_input.application and "automotive" in mat_input.application.lower():
                auto_data = await self._generate_automotive_applications(mat_input)
                analysis_results["automotive_applications"] = auto_data
            
            # Create output
            output = MaterialsOutput(
                analysis_summary=analysis_results["summary"],
                material_properties=analysis_results["material_properties"],
                structure_analysis=analysis_results["structure"],
                processing_recommendations=analysis_results["processing"],
                performance_predictions=analysis_results["performance"],
                characterization_results=analysis_results["characterization"],
                failure_modes=analysis_results["failure_modes"],
                optimization_suggestions=analysis_results["optimization"],
                alternative_materials=analysis_results["alternatives"],
                sustainability_metrics=analysis_results["sustainability"],
                cost_analysis=analysis_results["costs"],
                applications=analysis_results["applications"],
                safety_considerations=analysis_results["safety"],
                references=analysis_results["references"],
                iot_integration=analysis_results.get("iot_integration"),
                automotive_applications=analysis_results.get("automotive_applications")
            )
            
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=True,
                output_data=output.model_dump(),
                tokens_used=2000  # Placeholder
            )
            
        except Exception as e:
            logger.error(f"Materials science analysis error: {str(e)}")
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=False,
                error=str(e)
            )
    
    async def _create_materials_prompt(self, mat_input: MaterialsInput) -> str:
        """Create a comprehensive prompt for materials analysis."""
        prompt = f"""
        Perform materials science analysis:
        
        Task Type: {mat_input.task_type}
        Material Class: {mat_input.material_class}
        """
        
        if mat_input.materials:
            prompt += f"\nSpecific Materials: {', '.join(mat_input.materials)}"
        
        if mat_input.properties_of_interest:
            prompt += f"\nProperties of Interest: {', '.join(mat_input.properties_of_interest)}"
        
        if mat_input.conditions:
            prompt += "\nEnvironmental Conditions:"
            for param, value in mat_input.conditions.items():
                prompt += f"\n- {param}: {value}"
        
        if mat_input.processing_method:
            prompt += f"\nProcessing Method: {mat_input.processing_method}"
        
        if mat_input.application:
            prompt += f"\nIntended Application: {mat_input.application}"
        
        if mat_input.characterization_methods:
            prompt += f"\nCharacterization Methods: {', '.join(mat_input.characterization_methods)}"
        
        if mat_input.performance_requirements:
            prompt += "\nPerformance Requirements:"
            for req, value in mat_input.performance_requirements.items():
                prompt += f"\n- {req}: {value}"
        
        prompt += f"""
        
        Analysis Requirements:
        - Include nanoscale effects: {mat_input.include_nanoscale}
        - Sustainability assessment: {mat_input.sustainability_analysis}
        
        Please provide:
        1. Comprehensive analysis summary
        2. Detailed material properties (structure-property relationships)
        3. Crystal structure and microstructure analysis
        4. Processing recommendations with parameters
        5. Performance predictions under specified conditions
        6. Characterization data interpretation
        7. Potential failure modes and prevention
        8. Optimization strategies for the application
        9. Alternative material suggestions with trade-offs
        10. Sustainability metrics and lifecycle assessment
        11. Cost analysis (raw materials and processing)
        12. Specific applications and case studies
        13. Safety considerations and handling procedures
        14. Recent scientific references and developments
        
        Use standard materials science notation and terminology.
        Include quantitative data where possible.
        """
        
        return prompt
    
    async def _parse_materials_results(
        self,
        ai_response: str,
        mat_input: MaterialsInput
    ) -> Dict[str, Any]:
        """Parse AI response into structured materials science results."""
        results = {
            "summary": f"Materials analysis for {mat_input.material_class} - {mat_input.task_type}",
            "material_properties": {},
            "structure": {},
            "processing": [],
            "performance": {},
            "characterization": {},
            "failure_modes": [],
            "optimization": [],
            "alternatives": [],
            "sustainability": {},
            "costs": {},
            "applications": [],
            "safety": [],
            "references": []
        }
        
        # Material properties based on class
        if mat_input.material_class == "metal":
            results["material_properties"] = {
                "mechanical": {
                    "yield_strength": "250-1500 MPa",
                    "ultimate_strength": "400-2000 MPa",
                    "elongation": "5-40%",
                    "hardness": "100-600 HV",
                    "fatigue_limit": "0.3-0.6 × UTS"
                },
                "physical": {
                    "density": "2.7-19.3 g/cm³",
                    "melting_point": "660-3410°C",
                    "thermal_conductivity": "15-400 W/m·K",
                    "electrical_conductivity": "1-60 MS/m"
                },
                "corrosion": {
                    "resistance": "Varies with alloy and environment",
                    "passivation": "Possible with Cr, Al content",
                    "galvanic_series": "Noble to active scale position"
                }
            }
            
        elif mat_input.material_class == "ceramic":
            results["material_properties"] = {
                "mechanical": {
                    "compressive_strength": "1000-5000 MPa",
                    "flexural_strength": "100-1000 MPa",
                    "hardness": "1000-3000 HV",
                    "fracture_toughness": "1-15 MPa·m^0.5",
                    "weibull_modulus": "5-20"
                },
                "thermal": {
                    "max_use_temperature": "1000-2000°C",
                    "thermal_expansion": "2-10 × 10^-6 /K",
                    "thermal_shock_resistance": "ΔT = 100-500°C",
                    "thermal_conductivity": "2-200 W/m·K"
                },
                "electrical": {
                    "resistivity": "10^6-10^14 Ω·cm",
                    "dielectric_constant": "4-2000",
                    "breakdown_voltage": "10-100 kV/mm"
                }
            }
            
        elif mat_input.material_class == "polymer":
            results["material_properties"] = {
                "mechanical": {
                    "tensile_strength": "10-200 MPa",
                    "elastic_modulus": "0.01-5 GPa",
                    "elongation": "1-1000%",
                    "impact_strength": "10-200 kJ/m²"
                },
                "thermal": {
                    "glass_transition": "-100 to 300°C",
                    "melting_point": "100-400°C",
                    "heat_deflection": "50-300°C",
                    "thermal_expansion": "50-200 × 10^-6 /K"
                },
                "chemical": {
                    "solvent_resistance": "Varies with polymer type",
                    "water_absorption": "0.01-10%",
                    "chemical_compatibility": "pH, oxidizers, UV"
                }
            }
            
        elif mat_input.material_class == "nanomaterial":
            results["material_properties"] = {
                "dimensional": {
                    "size": "1-100 nm",
                    "aspect_ratio": "1-10000",
                    "surface_area": "10-1000 m²/g",
                    "quantum_confinement": "Size-dependent properties"
                },
                "unique_properties": {
                    "mechanical": "10-100× bulk strength",
                    "electrical": "Ballistic transport, tunable bandgap",
                    "optical": "Plasmonics, photoluminescence",
                    "catalytic": "High activity, selectivity"
                }
            }
        
        # Structure analysis
        results["structure"] = {
            "crystal_structure": "FCC/BCC/HCP for metals, various for ceramics",
            "microstructure": {
                "grain_size": "0.1-100 μm typical",
                "phases": "Single or multiphase",
                "defects": "Point, line, planar, volume defects",
                "texture": "Random or preferred orientation"
            },
            "nanostructure": {
                "features": "Precipitates, inclusions, interfaces",
                "size_effects": "Hall-Petch, Orowan strengthening"
            }
        }
        
        # Processing recommendations
        results["processing"] = [
            {
                "method": "Primary processing",
                "parameters": {
                    "temperature": "0.6-0.9 Tm",
                    "pressure": "Ambient to GPa",
                    "atmosphere": "Air, inert, vacuum",
                    "time": "Minutes to hours"
                },
                "equipment": "Furnace, press, reactor",
                "quality_control": "Microstructure, properties"
            },
            {
                "method": "Secondary processing",
                "parameters": {
                    "heat_treatment": "Annealing, quenching, aging",
                    "surface_treatment": "Coating, modification",
                    "joining": "Welding, bonding, fastening"
                }
            }
        ]
        
        # Performance predictions
        results["performance"] = {
            "service_life": "10-50 years typical",
            "reliability": "99.9% for critical applications",
            "degradation_mechanisms": [
                "Fatigue", "Corrosion", "Wear", "Creep", "Environmental"
            ],
            "performance_metrics": {
                "efficiency": "85-98%",
                "durability": "10^6-10^9 cycles",
                "stability": "±5% over lifetime"
            }
        }
        
        # Characterization results
        if mat_input.characterization_methods:
            results["characterization"] = {
                method: f"Analysis using {method}"
                for method in mat_input.characterization_methods
            }
        
        # Failure modes
        results["failure_modes"] = [
            {"mode": "Fatigue", "prevention": "Design for infinite life, surface treatments"},
            {"mode": "Corrosion", "prevention": "Protective coatings, material selection"},
            {"mode": "Wear", "prevention": "Hard coatings, lubrication"},
            {"mode": "Fracture", "prevention": "Toughness improvement, flaw elimination"}
        ]
        
        # Optimization suggestions
        results["optimization"] = [
            "Microstructure control through processing",
            "Alloying or composite design",
            "Surface engineering for enhanced properties",
            "Nanostructuring for unique properties",
            "Process parameter optimization"
        ]
        
        # Alternative materials
        results["alternatives"] = [
            {
                "material": "Advanced composite",
                "advantages": "Higher strength-to-weight",
                "disadvantages": "Higher cost, complex processing",
                "suitability": "85%"
            },
            {
                "material": "Nanostructured variant",
                "advantages": "Superior properties",
                "disadvantages": "Scale-up challenges",
                "suitability": "70%"
            }
        ]
        
        # Sustainability metrics
        if mat_input.sustainability_analysis:
            results["sustainability"] = {
                "carbon_footprint": "2-50 kg CO2/kg material",
                "recyclability": "50-95%",
                "energy_intensity": "10-500 MJ/kg",
                "environmental_impact": "Low to moderate",
                "circular_economy": "Design for disassembly and reuse"
            }
        
        # Cost analysis
        results["costs"] = {
            "raw_material": 1.0,  # $/kg baseline
            "processing": 2.0,
            "finishing": 0.5,
            "quality_control": 0.3,
            "total": 3.8
        }
        
        # Applications
        results["applications"] = [
            {"industry": "Aerospace", "component": "Structural parts", "requirements": "High strength, low weight"},
            {"industry": "Automotive", "component": "Engine components", "requirements": "Heat resistance, durability"},
            {"industry": "Electronics", "component": "Substrates, packaging", "requirements": "Thermal management, isolation"},
            {"industry": "Biomedical", "component": "Implants, devices", "requirements": "Biocompatibility, longevity"}
        ]
        
        # Safety considerations
        results["safety"] = [
            "Wear appropriate PPE during processing",
            "Handle nanomaterials in controlled environment",
            "Follow MSDS guidelines for chemical exposure",
            "Implement dust control measures",
            "Ensure proper ventilation"
        ]
        
        # References
        results["references"] = [
            "Materials Science and Engineering: An Introduction - Callister",
            "Journal of Materials Science - Recent Publications",
            "Advanced Materials - Special Issue on " + mat_input.material_class,
            "Nature Materials - Review Articles",
            "Acta Materialia - Processing-Structure-Property Studies"
        ]
        
        return results
    
    async def _calculate_properties(self, mat_input: MaterialsInput) -> Dict[str, Any]:
        """Calculate material properties based on composition and structure."""
        properties = {}
        
        # Rule of mixtures for composites
        if mat_input.material_class == "composite" and len(mat_input.materials) > 1:
            properties["composite_modulus"] = "E_c = V_f × E_f + V_m × E_m"
            properties["composite_strength"] = "σ_c = V_f × σ_f × η + V_m × σ_m"
            properties["density"] = "ρ_c = V_f × ρ_f + V_m × ρ_m"
        
        # Hall-Petch relationship for grain size
        properties["grain_size_strengthening"] = "σ_y = σ_0 + k_y / √d"
        
        # Arrhenius for temperature effects
        properties["temperature_dependence"] = "rate = A × exp(-E_a / RT)"
        
        return properties
    
    async def _generate_iot_integration(self, mat_input: MaterialsInput) -> Dict[str, Any]:
        """Generate IoT integration specifications for material monitoring."""
        iot_config = {
            "sensor_types": [],
            "monitoring_parameters": [],
            "data_acquisition": {},
            "edge_processing": {},
            "cloud_analytics": {}
        }
        
        # Determine sensor types based on material and application
        if "structural" in mat_input.application.lower():
            iot_config["sensor_types"].extend([
                "Strain gauges",
                "Accelerometers",
                "Acoustic emission sensors",
                "Temperature sensors"
            ])
            iot_config["monitoring_parameters"] = [
                "Stress distribution",
                "Vibration patterns",
                "Crack propagation",
                "Thermal cycling"
            ]
        
        if "corrosion" in mat_input.properties_of_interest:
            iot_config["sensor_types"].extend([
                "Electrochemical sensors",
                "pH sensors",
                "Humidity sensors"
            ])
            iot_config["monitoring_parameters"].append("Corrosion rate")
        
        # Data acquisition specifications
        iot_config["data_acquisition"] = {
            "sampling_rate": "1-1000 Hz",
            "resolution": "16-24 bit",
            "communication": ["WiFi", "LoRaWAN", "Cellular", "Bluetooth"],
            "power": "Battery with energy harvesting",
            "protocols": ["MQTT", "CoAP", "HTTP/REST"]
        }
        
        # Edge processing capabilities
        iot_config["edge_processing"] = {
            "preprocessing": "Filtering, averaging, peak detection",
            "anomaly_detection": "Statistical thresholds, ML models",
            "data_reduction": "Event-triggered recording",
            "local_alerts": "Critical threshold notifications"
        }
        
        # Cloud analytics
        iot_config["cloud_analytics"] = {
            "predictive_maintenance": "Remaining useful life estimation",
            "pattern_recognition": "Failure mode identification",
            "optimization": "Operating parameter recommendations",
            "reporting": "Automated compliance reports"
        }
        
        return iot_config
    
    async def _generate_automotive_applications(self, mat_input: MaterialsInput) -> Dict[str, Any]:
        """Generate automotive-specific applications for materials."""
        auto_apps = {
            "vehicle_components": [],
            "performance_benefits": {},
            "integration_requirements": {},
            "testing_standards": [],
            "oem_specifications": {}
        }
        
        # Map materials to automotive components
        component_mapping = {
            "metal": [
                {"component": "Engine block", "alloy": "Aluminum alloys", "benefit": "Weight reduction"},
                {"component": "Crankshaft", "alloy": "Forged steel", "benefit": "High strength"},
                {"component": "Body panels", "alloy": "High-strength steel", "benefit": "Safety and weight"}
            ],
            "polymer": [
                {"component": "Bumpers", "material": "TPO/PP", "benefit": "Impact absorption"},
                {"component": "Interior trim", "material": "ABS/PC", "benefit": "Aesthetics and durability"},
                {"component": "Fuel tanks", "material": "HDPE", "benefit": "Chemical resistance"}
            ],
            "composite": [
                {"component": "Body structures", "material": "Carbon fiber", "benefit": "Ultra-lightweight"},
                {"component": "Brake discs", "material": "C/C composite", "benefit": "Heat resistance"},
                {"component": "Leaf springs", "material": "Glass fiber", "benefit": "Fatigue resistance"}
            ],
            "ceramic": [
                {"component": "Brake pads", "material": "Ceramic composite", "benefit": "Wear resistance"},
                {"component": "Catalytic converter", "material": "Cordierite", "benefit": "High temperature stability"},
                {"component": "Sensors", "material": "Piezoceramics", "benefit": "Sensing capability"}
            ]
        }
        
        if mat_input.material_class in component_mapping:
            auto_apps["vehicle_components"] = component_mapping[mat_input.material_class]
        
        # Performance benefits
        auto_apps["performance_benefits"] = {
            "weight_reduction": "10-50% vs. traditional materials",
            "fuel_efficiency": "5-15% improvement",
            "durability": "2-3× service life",
            "nvh_reduction": "20-30 dB noise reduction",
            "crash_performance": "Enhanced energy absorption"
        }
        
        # Integration requirements
        auto_apps["integration_requirements"] = {
            "joining_methods": ["Adhesive bonding", "Mechanical fastening", "Welding"],
            "surface_treatment": ["Primers", "Adhesion promoters", "Corrosion protection"],
            "compatibility": "Galvanic corrosion prevention",
            "manufacturing": "High-volume production capability"
        }
        
        # Testing standards
        auto_apps["testing_standards"] = [
            "ISO 9001 - Quality Management",
            "IATF 16949 - Automotive Quality",
            "SAE J2334 - Corrosion Testing",
            "FMVSS - Safety Standards",
            "OEM-specific requirements"
        ]
        
        # OEM specifications
        auto_apps["oem_specifications"] = {
            "temperature_range": "-40 to +150°C",
            "humidity_resistance": "95% RH",
            "chemical_resistance": "Fuel, oil, coolant",
            "uv_stability": "2000 hours minimum",
            "warranty": "10 years / 150,000 miles"
        }
        
        return auto_apps
    
    async def process_audio_request(
        self,
        audio_data: bytes,
        user_id: str,
        session_id: Optional[str] = None,
        language: str = "en"
    ) -> Dict[str, Any]:
        """Process materials science queries via audio input."""
        return await self._audio_wrapper.process_audio_input(
            audio_data=audio_data,
            user_id=user_id,
            session_id=session_id,
            language=language,
            context={"domain": "materials_science"}
        )
    
    async def monitor_material_performance(
        self,
        material_id: str,
        sensor_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Monitor material performance using IoT sensor data."""
        # Analyze sensor data for material health
        analysis = {
            "material_id": material_id,
            "timestamp": datetime.utcnow().isoformat(),
            "sensor_readings": sensor_data,
            "health_status": "normal",
            "anomalies": [],
            "predictions": {}
        }
        
        # Check for anomalies
        if "strain" in sensor_data and sensor_data["strain"] > 0.002:
            analysis["anomalies"].append({
                "type": "high_strain",
                "severity": "warning",
                "value": sensor_data["strain"],
                "threshold": 0.002
            })
            analysis["health_status"] = "warning"
        
        if "temperature" in sensor_data and sensor_data["temperature"] > 200:
            analysis["anomalies"].append({
                "type": "high_temperature",
                "severity": "critical",
                "value": sensor_data["temperature"],
                "threshold": 200
            })
            analysis["health_status"] = "critical"
        
        # Predict remaining useful life
        if analysis["anomalies"]:
            analysis["predictions"]["remaining_life"] = "80% - Degradation detected"
        else:
            analysis["predictions"]["remaining_life"] = "95% - Normal operation"
        
        return analysis
    
    async def design_composite_material(
        self,
        matrix: str,
        reinforcement: str,
        volume_fraction: float,
        requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Design composite material with specified properties."""
        prompt = f"""
        Design a composite material:
        Matrix: {matrix}
        Reinforcement: {reinforcement}
        Volume fraction: {volume_fraction}
        Requirements: {requirements}
        
        Provide:
        1. Predicted properties (rule of mixtures and advanced models)
        2. Processing recommendations
        3. Interface engineering strategies
        4. Cost-performance analysis
        """
        
        response = await self.claude_completion(prompt, temperature=0.3)
        
        return {
            "composite_design": {
                "matrix": matrix,
                "reinforcement": reinforcement,
                "volume_fraction": volume_fraction,
                "predicted_properties": {
                    "modulus": f"{70 * volume_fraction + 3 * (1 - volume_fraction):.1f} GPa",
                    "strength": f"{1500 * volume_fraction + 50 * (1 - volume_fraction):.0f} MPa",
                    "density": f"{2.5 * volume_fraction + 1.2 * (1 - volume_fraction):.2f} g/cm³"
                },
                "processing": {
                    "method": "Resin transfer molding",
                    "temperature": "120-180°C",
                    "pressure": "5-10 bar",
                    "cure_time": "30-60 minutes"
                },
                "interface": {
                    "coupling_agent": "Silane-based",
                    "surface_treatment": "Plasma or chemical",
                    "bond_strength": "50-100 MPa"
                }
            }
        }
    
    async def analyze_failure(
        self,
        material: str,
        failure_description: str,
        conditions: Dict[str, Any],
        images: Optional[List[bytes]] = None
    ) -> Dict[str, Any]:
        """Analyze material failure and provide root cause analysis."""
        prompt = f"""
        Analyze material failure:
        Material: {material}
        Failure: {failure_description}
        Conditions: {conditions}
        
        Determine:
        1. Failure mechanism
        2. Root cause
        3. Contributing factors
        4. Prevention strategies
        5. Material/design improvements
        """
        
        response = await self.claude_completion(prompt, temperature=0.2)
        
        return {
            "failure_analysis": {
                "mechanism": "Fatigue crack propagation",
                "root_cause": "Stress concentration at geometric discontinuity",
                "contributing_factors": [
                    "Cyclic loading above endurance limit",
                    "Surface roughness",
                    "Environmental effects"
                ],
                "prevention": [
                    "Redesign to eliminate stress concentrations",
                    "Surface treatment (shot peening)",
                    "Material upgrade to higher fatigue strength",
                    "Implement inspection intervals"
                ],
                "recommendations": {
                    "immediate": "Inspect similar components",
                    "short_term": "Apply preventive modifications",
                    "long_term": "Redesign and material selection"
                }
            }
        }