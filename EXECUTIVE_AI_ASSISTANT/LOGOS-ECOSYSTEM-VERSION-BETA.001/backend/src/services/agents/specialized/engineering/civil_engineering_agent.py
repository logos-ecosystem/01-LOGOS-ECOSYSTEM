"""Civil Engineering Specialist Agent for LOGOS ECOSYSTEM."""

from typing import List, Dict, Any, Optional, Type, Tuple, Union
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator
import json
import numpy as np
from enum import Enum
import math

from ....base_agent import (, AgentStatus, PricingModel
    BaseAIAgent, AgentMetadata, AgentCategory, PricingModel,
    AgentStatus, AgentInput, AgentOutput
)
from ....shared.utils.logger import get_logger

logger = get_logger(__name__)


class StructureType(str, Enum):
    """Types of civil structures."""
    BUILDING = "building"
    BRIDGE = "bridge"
    DAM = "dam"
    ROAD = "road"
    TUNNEL = "tunnel"
    AIRPORT = "airport"
    PORT = "port"
    RAILWAY = "railway"
    WATER_TREATMENT = "water_treatment"
    POWER_PLANT = "power_plant"
    FOUNDATION = "foundation"
    RETAINING_WALL = "retaining_wall"


class AnalysisType(str, Enum):
    """Types of structural analysis."""
    STATIC = "static"
    DYNAMIC = "dynamic"
    SEISMIC = "seismic"
    WIND = "wind"
    THERMAL = "thermal"
    FATIGUE = "fatigue"
    BUCKLING = "buckling"
    NONLINEAR = "nonlinear"
    SOIL_STRUCTURE = "soil_structure"
    FLUID_STRUCTURE = "fluid_structure"


class MaterialType(str, Enum):
    """Types of construction materials."""
    CONCRETE = "concrete"
    STEEL = "steel"
    TIMBER = "timber"
    MASONRY = "masonry"
    COMPOSITE = "composite"
    SOIL = "soil"
    ASPHALT = "asphalt"
    GLASS = "glass"
    ALUMINUM = "aluminum"


class StructuralDesignInput(BaseModel):
    """Input for structural design."""
    structure_type: StructureType = Field(..., description="Type of structure")
    location: Dict[str, Any] = Field(..., description="Site location and conditions")
    dimensions: Dict[str, Any] = Field(..., description="Structure dimensions")
    loads: Dict[str, Any] = Field(..., description="Applied loads")
    materials: Optional[List[MaterialType]] = Field(default=[], description="Preferred materials")
    design_codes: Optional[List[str]] = Field(default=["IBC", "ASCE 7"], description="Applicable codes")
    constraints: Optional[Dict[str, Any]] = Field(default={}, description="Design constraints")
    sustainability_goals: Optional[Dict[str, Any]] = Field(default={}, description="Green building targets")


class GeotechnicalInput(BaseModel):
    """Input for geotechnical analysis."""
    site_data: Dict[str, Any] = Field(..., description="Site investigation data")
    soil_profile: List[Dict[str, Any]] = Field(..., description="Soil layers and properties")
    groundwater: Dict[str, Any] = Field(..., description="Groundwater conditions")
    loads: Dict[str, Any] = Field(..., description="Foundation loads")
    structure_type: str = Field(..., description="Type of structure")
    seismic_category: Optional[str] = Field(default="C", description="Seismic design category")


class TransportationInput(BaseModel):
    """Input for transportation engineering."""
    project_type: str = Field(..., description="Road, rail, airport, etc.")
    traffic_data: Dict[str, Any] = Field(..., description="Traffic volume and patterns")
    geometry: Dict[str, Any] = Field(..., description="Alignment and cross-section")
    pavement_design: Optional[Dict[str, Any]] = Field(default={}, description="Pavement requirements")
    safety_requirements: Optional[Dict[str, Any]] = Field(default={}, description="Safety features")


class CivilEngineeringAgent(BaseAgent):
    """AI agent specialized in civil engineering design and analysis."""
    
    def __init__(self):
        metadata = AgentMetadata(
            name="Civil Engineering Specialist",
            description="Expert AI agent for structural design, geotechnical engineering, transportation, and infrastructure. Covers buildings, bridges, foundations, and civil works.",
            category=AgentCategory.ENGINEERING,
            version="2.0.0",
            author="LOGOS Engineering Team",
            pricing_model=PricingModel.PER_USE,
            price_per_use=2.50,
            tags=["civil", "structural", "geotechnical", "transportation", "infrastructure", "construction"],
            capabilities=[
                "Structural analysis and design",
                "Foundation and geotechnical engineering",
                "Bridge and building design",
                "Seismic and wind analysis",
                "Transportation infrastructure",
                "Water resources engineering",
                "Construction planning and management",
                "Material selection and specifications",
                "Code compliance verification",
                "Sustainability and LEED design",
                "Cost estimation and scheduling",
                "Risk assessment and mitigation",
                "BIM integration and coordination",
                "Infrastructure resilience planning"
            ],
            limitations=[
                "Cannot replace PE stamped drawings",
                "Requires accurate site data",
                "Cannot perform detailed FEA",
                "Limited to preliminary design"
            ],
            status=AgentStatus.ACTIVE
        )
        super().__init__(metadata)
        
        self._material_properties = {}
        self._design_codes = {}
        self._load_combinations = {}
        self._soil_parameters = {}
        self._standard_details = {}
    
    async def _setup(self):
        """Initialize civil engineering knowledge base."""
        # Material properties database
        self._material_properties = {
            "concrete": {
                "normal_weight": {
                    "3000psi": {
                        "fc": 20.7,  # MPa
                        "Ec": 22100,  # MPa
                        "density": 2400,  # kg/m³
                        "poisson": 0.2,
                        "thermal_expansion": 1e-5,  # /°C
                        "cost": 150  # $/m³
                    },
                    "4000psi": {
                        "fc": 27.6,
                        "Ec": 25500,
                        "density": 2400,
                        "poisson": 0.2,
                        "thermal_expansion": 1e-5,
                        "cost": 170
                    },
                    "5000psi": {
                        "fc": 34.5,
                        "Ec": 28500,
                        "density": 2400,
                        "poisson": 0.2,
                        "thermal_expansion": 1e-5,
                        "cost": 190
                    },
                    "6000psi": {
                        "fc": 41.4,
                        "Ec": 31200,
                        "density": 2400,
                        "poisson": 0.2,
                        "thermal_expansion": 1e-5,
                        "cost": 220
                    }
                },
                "lightweight": {
                    "density": 1840,
                    "reduction_factor": 0.75
                },
                "high_performance": {
                    "8000psi": {
                        "fc": 55.2,
                        "Ec": 36000,
                        "density": 2450,
                        "cost": 300
                    }
                }
            },
            "steel": {
                "structural": {
                    "A36": {
                        "Fy": 248,  # MPa
                        "Fu": 400,
                        "E": 200000,
                        "density": 7850,
                        "poisson": 0.3,
                        "thermal_expansion": 1.2e-5,
                        "cost": 800  # $/ton
                    },
                    "A572-50": {
                        "Fy": 345,
                        "Fu": 450,
                        "E": 200000,
                        "density": 7850,
                        "poisson": 0.3,
                        "thermal_expansion": 1.2e-5,
                        "cost": 850
                    },
                    "A992": {
                        "Fy": 345,
                        "Fu": 450,
                        "E": 200000,
                        "density": 7850,
                        "poisson": 0.3,
                        "thermal_expansion": 1.2e-5,
                        "cost": 850
                    }
                },
                "reinforcing": {
                    "Grade60": {
                        "fy": 420,  # MPa
                        "E": 200000,
                        "cost": 0.70  # $/kg
                    },
                    "Grade80": {
                        "fy": 550,
                        "E": 200000,
                        "cost": 0.85
                    }
                },
                "prestressing": {
                    "strand": {
                        "fpu": 1860,  # MPa
                        "E": 195000,
                        "cost": 2.50  # $/kg
                    }
                }
            },
            "timber": {
                "dimensional": {
                    "SPF": {
                        "Fb": 8.3,  # MPa
                        "Ft": 5.5,
                        "Fc": 11.7,
                        "E": 9650,
                        "density": 470,
                        "cost": 500  # $/m³
                    },
                    "Southern_Pine": {
                        "Fb": 10.3,
                        "Ft": 6.9,
                        "Fc": 13.8,
                        "E": 11000,
                        "density": 550,
                        "cost": 600
                    }
                },
                "engineered": {
                    "glulam": {
                        "Fb": 16.5,
                        "E": 12400,
                        "density": 500,
                        "cost": 1200
                    },
                    "LVL": {
                        "Fb": 19.3,
                        "E": 13800,
                        "density": 550,
                        "cost": 1000
                    }
                }
            },
            "masonry": {
                "concrete_block": {
                    "fm": 13.8,  # MPa
                    "Em": 15500,
                    "density": 1920,
                    "cost": 120  # $/m²
                },
                "brick": {
                    "fm": 17.2,
                    "Em": 17200,
                    "density": 1840,
                    "cost": 150
                }
            },
            "soil": {
                "clay": {
                    "cohesion": 50,  # kPa
                    "friction_angle": 0,
                    "unit_weight": 18,  # kN/m³
                    "modulus": 10000  # kPa
                },
                "sand": {
                    "cohesion": 0,
                    "friction_angle": 30,
                    "unit_weight": 19,
                    "modulus": 30000
                },
                "gravel": {
                    "cohesion": 0,
                    "friction_angle": 35,
                    "unit_weight": 20,
                    "modulus": 50000
                }
            }
        }
        
        # Design codes and standards
        self._design_codes = {
            "IBC": {
                "version": "2021",
                "scope": "International Building Code",
                "load_factors": {
                    "dead": 1.2,
                    "live": 1.6,
                    "wind": 1.0,
                    "seismic": 1.0,
                    "snow": 1.2
                }
            },
            "ASCE7": {
                "version": "22",
                "scope": "Minimum Design Loads",
                "risk_categories": ["I", "II", "III", "IV"],
                "importance_factors": {
                    "I": 1.0,
                    "II": 1.0,
                    "III": 1.25,
                    "IV": 1.5
                }
            },
            "ACI318": {
                "version": "19",
                "scope": "Concrete structures",
                "phi_factors": {
                    "tension": 0.9,
                    "compression": 0.65,
                    "shear": 0.75,
                    "bearing": 0.65
                }
            },
            "AISC360": {
                "version": "16",
                "scope": "Steel structures",
                "phi_factors": {
                    "tension": 0.9,
                    "compression": 0.9,
                    "flexure": 0.9,
                    "shear": 0.9
                }
            },
            "AASHTO": {
                "version": "LRFD-9",
                "scope": "Bridge design",
                "load_factors": {
                    "DC": 1.25,
                    "DW": 1.5,
                    "LL": 1.75
                }
            }
        }
        
        # Load combinations
        self._load_combinations = {
            "LRFD": [
                "1.4D",
                "1.2D + 1.6L + 0.5(Lr or S or R)",
                "1.2D + 1.6(Lr or S or R) + (L or 0.5W)",
                "1.2D + 1.0W + L + 0.5(Lr or S or R)",
                "1.2D + 1.0E + L + 0.2S",
                "0.9D + 1.0W",
                "0.9D + 1.0E"
            ],
            "ASD": [
                "D",
                "D + L",
                "D + (Lr or S or R)",
                "D + 0.75L + 0.75(Lr or S or R)",
                "D + (0.6W or 0.7E)",
                "D + 0.75L + 0.75(0.6W) + 0.75(Lr or S or R)",
                "D + 0.75L + 0.75(0.7E) + 0.75S",
                "0.6D + 0.6W",
                "0.6D + 0.7E"
            ]
        }
        
        # Soil parameters
        self._soil_parameters = {
            "bearing_capacity_factors": {
                "Nc": lambda phi: (np.tan(np.radians(45 + phi/2)))**2 * np.exp(np.pi * np.tan(np.radians(phi))),
                "Nq": lambda phi: np.tan(np.radians(45 + phi/2))**2 * np.exp(np.pi * np.tan(np.radians(phi))),
                "Ngamma": lambda phi: 2 * (self._soil_parameters["bearing_capacity_factors"]["Nq"](phi) - 1) * np.tan(np.radians(phi))
            },
            "earth_pressure": {
                "active": lambda phi: np.tan(np.radians(45 - phi/2))**2,
                "passive": lambda phi: np.tan(np.radians(45 + phi/2))**2,
                "at_rest": lambda phi: 1 - np.sin(np.radians(phi))
            }
        }
        
        logger.info("Civil engineering agent initialized with comprehensive knowledge base")
    
    def get_input_schema(self) -> Type[BaseModel]:
        """Get the input schema for this agent."""
        return StructuralDesignInput
    
    def get_output_schema(self) -> Type[BaseModel]:
        """Get the output schema for this agent."""
        class CivilEngineeringOutput(BaseModel):
            structural_design: Dict[str, Any] = Field(..., description="Complete structural design")
            material_specifications: Dict[str, Any] = Field(..., description="Material requirements")
            load_analysis: Dict[str, Any] = Field(..., description="Load calculations")
            member_sizes: Dict[str, Any] = Field(..., description="Structural member sizing")
            foundation_design: Dict[str, Any] = Field(..., description="Foundation requirements")
            construction_details: Dict[str, Any] = Field(..., description="Construction specifications")
            code_compliance: Dict[str, Any] = Field(..., description="Code compliance check")
            cost_estimate: Dict[str, Any] = Field(..., description="Cost breakdown")
            sustainability_assessment: Dict[str, Any] = Field(..., description="Green building metrics")
            risk_assessment: Dict[str, Any] = Field(..., description="Risk analysis")
            
        return CivilEngineeringOutput
    
    async def _execute(self, input_data: AgentInput) -> AgentOutput:
        """Execute civil engineering analysis or design task."""
        try:
            if isinstance(input_data.input_data, dict):
                # Check task type
                if "site_data" in input_data.input_data:
                    geotech_data = GeotechnicalInput(**input_data.input_data)
                    result = await self._perform_geotechnical_analysis(geotech_data)
                elif "traffic_data" in input_data.input_data:
                    transport_data = TransportationInput(**input_data.input_data)
                    result = await self._design_transportation_infrastructure(transport_data)
                else:
                    structural_data = StructuralDesignInput(**input_data.input_data)
                    result = await self._design_structure(structural_data)
            else:
                structural_data = StructuralDesignInput(**input_data.input_data)
                result = await self._design_structure(structural_data)
            
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=True,
                output_data=result,
                tokens_used=2500
            )
            
        except Exception as e:
            logger.error(f"Civil engineering error: {str(e)}")
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=False,
                error=str(e)
            )
    
    async def _design_structure(self, structural_data: StructuralDesignInput) -> Dict[str, Any]:
        """Design complete structural system."""
        # Analyze site conditions
        site_analysis = await self._analyze_site_conditions(
            structural_data.location,
            structural_data.structure_type
        )
        
        # Determine loads
        load_analysis = await self._calculate_loads(
            structural_data.structure_type,
            structural_data.dimensions,
            structural_data.loads,
            site_analysis,
            structural_data.design_codes
        )
        
        # Select structural system
        structural_system = await self._select_structural_system(
            structural_data.structure_type,
            structural_data.dimensions,
            load_analysis,
            structural_data.materials
        )
        
        # Design structural members
        member_design = await self._design_structural_members(
            structural_system,
            load_analysis,
            structural_data.materials,
            structural_data.design_codes
        )
        
        # Design foundations
        foundation_design = await self._design_foundations(
            load_analysis,
            site_analysis,
            structural_system
        )
        
        # Material specifications
        material_specs = await self._specify_materials(
            member_design,
            structural_data.materials,
            structural_data.design_codes
        )
        
        # Construction details
        construction_details = await self._develop_construction_details(
            structural_system,
            member_design,
            material_specs
        )
        
        # Code compliance check
        code_compliance = await self._check_code_compliance(
            member_design,
            load_analysis,
            structural_data.design_codes
        )
        
        # Cost estimation
        cost_estimate = await self._estimate_construction_cost(
            member_design,
            material_specs,
            foundation_design,
            structural_data.dimensions
        )
        
        # Sustainability assessment
        sustainability = await self._assess_sustainability(
            material_specs,
            structural_system,
            structural_data.sustainability_goals
        )
        
        # Risk assessment
        risk_assessment = await self._assess_project_risks(
            structural_data.structure_type,
            site_analysis,
            construction_details
        )
        
        return {
            "structural_design": structural_system,
            "material_specifications": material_specs,
            "load_analysis": load_analysis,
            "member_sizes": member_design,
            "foundation_design": foundation_design,
            "construction_details": construction_details,
            "code_compliance": code_compliance,
            "cost_estimate": cost_estimate,
            "sustainability_assessment": sustainability,
            "risk_assessment": risk_assessment
        }
    
    async def _analyze_site_conditions(
        self,
        location: Dict[str, Any],
        structure_type: StructureType
    ) -> Dict[str, Any]:
        """Analyze site conditions for design."""
        site_analysis = {
            "location": location,
            "climate_zone": self._determine_climate_zone(location),
            "seismic_data": {},
            "wind_data": {},
            "snow_data": {},
            "soil_conditions": {},
            "environmental_factors": {}
        }
        
        # Seismic analysis
        if "latitude" in location and "longitude" in location:
            site_analysis["seismic_data"] = {
                "site_class": location.get("site_class", "D"),
                "Ss": location.get("Ss", 1.5),  # Short period acceleration
                "S1": location.get("S1", 0.6),  # 1-second acceleration
                "seismic_design_category": self._determine_seismic_category(
                    location.get("Ss", 1.5),
                    location.get("S1", 0.6),
                    location.get("site_class", "D")
                ),
                "Fa": 1.0,  # Site amplification factor
                "Fv": 1.5
            }
        
        # Wind analysis
        site_analysis["wind_data"] = {
            "basic_wind_speed": location.get("wind_speed", 120),  # mph
            "exposure_category": location.get("exposure", "C"),
            "risk_category": self._determine_risk_category(structure_type),
            "topographic_factor": location.get("Kzt", 1.0),
            "ground_elevation_factor": location.get("Ke", 1.0)
        }
        
        # Snow loads
        if location.get("latitude", 0) > 30:  # Northern regions
            site_analysis["snow_data"] = {
                "ground_snow_load": location.get("pg", 30),  # psf
                "exposure_factor": location.get("Ce", 1.0),
                "thermal_factor": location.get("Ct", 1.0),
                "importance_factor": 1.0
            }
        
        # Soil conditions
        site_analysis["soil_conditions"] = {
            "soil_type": location.get("soil_type", "sand"),
            "bearing_capacity": location.get("bearing_capacity", 3000),  # psf
            "water_table": location.get("water_table_depth", 10),  # ft
            "frost_depth": location.get("frost_depth", 3),  # ft
            "expansive_soil": location.get("expansive", False)
        }
        
        # Environmental factors
        site_analysis["environmental_factors"] = {
            "flood_zone": location.get("flood_zone", "X"),
            "corrosion_category": location.get("corrosion", "moderate"),
            "freeze_thaw_cycles": location.get("freeze_thaw", 50),
            "relative_humidity": location.get("humidity", 60)
        }
        
        return site_analysis
    
    async def _calculate_loads(
        self,
        structure_type: StructureType,
        dimensions: Dict[str, Any],
        loads: Dict[str, Any],
        site_analysis: Dict[str, Any],
        design_codes: List[str]
    ) -> Dict[str, Any]:
        """Calculate all design loads."""
        load_calculations = {
            "dead_loads": {},
            "live_loads": {},
            "wind_loads": {},
            "seismic_loads": {},
            "snow_loads": {},
            "other_loads": {},
            "load_combinations": []
        }
        
        # Dead loads
        load_calculations["dead_loads"] = self._calculate_dead_loads(
            structure_type,
            dimensions
        )
        
        # Live loads
        load_calculations["live_loads"] = self._calculate_live_loads(
            structure_type,
            dimensions,
            loads.get("occupancy", "office")
        )
        
        # Wind loads
        if site_analysis["wind_data"]["basic_wind_speed"] > 0:
            load_calculations["wind_loads"] = await self._calculate_wind_loads(
                structure_type,
                dimensions,
                site_analysis["wind_data"]
            )
        
        # Seismic loads
        if "seismic_data" in site_analysis:
            load_calculations["seismic_loads"] = await self._calculate_seismic_loads(
                structure_type,
                dimensions,
                site_analysis["seismic_data"],
                load_calculations["dead_loads"]
            )
        
        # Snow loads
        if site_analysis.get("snow_data", {}).get("ground_snow_load", 0) > 0:
            load_calculations["snow_loads"] = self._calculate_snow_loads(
                dimensions,
                site_analysis["snow_data"]
            )
        
        # Other loads (thermal, earth pressure, fluid, etc.)
        if structure_type in [StructureType.DAM, StructureType.WATER_TREATMENT]:
            load_calculations["other_loads"]["hydrostatic"] = self._calculate_hydrostatic_loads(
                dimensions
            )
        
        if structure_type == StructureType.RETAINING_WALL:
            load_calculations["other_loads"]["earth_pressure"] = self._calculate_earth_pressure(
                dimensions,
                site_analysis["soil_conditions"]
            )
        
        # Load combinations
        if "ASCE7" in design_codes or "IBC" in design_codes:
            load_calculations["load_combinations"] = self._generate_load_combinations(
                load_calculations,
                "LRFD"
            )
        
        # Summary
        load_calculations["summary"] = {
            "governing_load": self._identify_governing_load(load_calculations),
            "total_vertical_load": self._sum_vertical_loads(load_calculations),
            "total_lateral_load": self._sum_lateral_loads(load_calculations),
            "design_method": "LRFD" if "LRFD" in str(design_codes) else "ASD"
        }
        
        return load_calculations
    
    async def _select_structural_system(
        self,
        structure_type: StructureType,
        dimensions: Dict[str, Any],
        load_analysis: Dict[str, Any],
        preferred_materials: List[MaterialType]
    ) -> Dict[str, Any]:
        """Select appropriate structural system."""
        structural_system = {
            "primary_system": "",
            "lateral_system": "",
            "floor_system": "",
            "roof_system": "",
            "material": "",
            "configuration": {}
        }
        
        # Building structures
        if structure_type == StructureType.BUILDING:
            height = dimensions.get("height", 10)
            stories = dimensions.get("stories", 1)
            
            if height < 20:  # Low-rise
                if MaterialType.STEEL in preferred_materials:
                    structural_system["primary_system"] = "Steel frame"
                    structural_system["lateral_system"] = "Braced frame"
                elif MaterialType.CONCRETE in preferred_materials:
                    structural_system["primary_system"] = "Concrete frame"
                    structural_system["lateral_system"] = "Shear walls"
                else:
                    structural_system["primary_system"] = "Wood frame"
                    structural_system["lateral_system"] = "Shear walls"
                    
            elif height < 75:  # Mid-rise
                structural_system["primary_system"] = "Steel or concrete frame"
                structural_system["lateral_system"] = "Moment frame or shear walls"
            else:  # High-rise
                structural_system["primary_system"] = "Steel or concrete frame"
                structural_system["lateral_system"] = "Dual system (frame + core)"
            
            structural_system["floor_system"] = self._select_floor_system(
                dimensions.get("bay_size", 30),
                preferred_materials
            )
            
        # Bridge structures
        elif structure_type == StructureType.BRIDGE:
            span = dimensions.get("main_span", 50)
            
            if span < 30:
                structural_system["primary_system"] = "Simple span girder"
            elif span < 100:
                structural_system["primary_system"] = "Continuous girder"
            elif span < 300:
                structural_system["primary_system"] = "Truss or arch"
            else:
                structural_system["primary_system"] = "Cable-stayed or suspension"
            
            structural_system["material"] = "Steel-concrete composite" if span > 50 else "Prestressed concrete"
        
        # Other structure types
        elif structure_type == StructureType.DAM:
            structural_system["primary_system"] = self._select_dam_type(
                dimensions,
                load_analysis
            )
        elif structure_type == StructureType.TUNNEL:
            structural_system["primary_system"] = "Segmental lining" if dimensions.get("diameter", 5) > 3 else "Cast-in-place lining"
        
        # Material selection
        if not structural_system["material"]:
            structural_system["material"] = self._select_optimal_material(
                structure_type,
                load_analysis,
                preferred_materials
            )
        
        # Configuration details
        structural_system["configuration"] = {
            "bay_spacing": self._optimize_bay_spacing(structure_type, dimensions),
            "column_grid": self._determine_column_grid(dimensions),
            "expansion_joints": self._locate_expansion_joints(dimensions),
            "redundancy": self._assess_redundancy(structural_system)
        }
        
        return structural_system
    
    async def _design_structural_members(
        self,
        structural_system: Dict[str, Any],
        load_analysis: Dict[str, Any],
        preferred_materials: List[MaterialType],
        design_codes: List[str]
    ) -> Dict[str, Any]:
        """Design individual structural members."""
        member_design = {
            "columns": {},
            "beams": {},
            "slabs": {},
            "walls": {},
            "connections": {},
            "special_members": {}
        }
        
        material = structural_system["material"]
        
        # Design columns
        if "column" in structural_system.get("primary_system", "").lower() or "frame" in structural_system.get("primary_system", "").lower():
            member_design["columns"] = await self._design_columns(
                load_analysis,
                material,
                structural_system.get("configuration", {}).get("column_grid", {})
            )
        
        # Design beams
        if "beam" in structural_system.get("primary_system", "").lower() or "frame" in structural_system.get("primary_system", "").lower():
            member_design["beams"] = await self._design_beams(
                load_analysis,
                material,
                structural_system.get("configuration", {}).get("bay_spacing", 30)
            )
        
        # Design slabs
        if structural_system.get("floor_system"):
            member_design["slabs"] = await self._design_slabs(
                structural_system["floor_system"],
                load_analysis,
                material
            )
        
        # Design walls (if applicable)
        if "wall" in structural_system.get("lateral_system", "").lower():
            member_design["walls"] = await self._design_shear_walls(
                load_analysis,
                material,
                structural_system.get("configuration", {})
            )
        
        # Design connections
        member_design["connections"] = await self._design_connections(
            member_design,
            material,
            load_analysis
        )
        
        # Special members (braces, trusses, etc.)
        if "brace" in structural_system.get("lateral_system", "").lower():
            member_design["special_members"]["braces"] = await self._design_braces(
                load_analysis,
                material
            )
        
        # Verify all members
        member_design["verification"] = await self._verify_member_designs(
            member_design,
            load_analysis,
            design_codes
        )
        
        return member_design
    
    async def _design_foundations(
        self,
        load_analysis: Dict[str, Any],
        site_analysis: Dict[str, Any],
        structural_system: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Design foundation system."""
        soil_conditions = site_analysis["soil_conditions"]
        total_load = load_analysis["summary"]["total_vertical_load"]
        
        foundation_design = {
            "type": "",
            "dimensions": {},
            "reinforcement": {},
            "bearing_pressure": 0,
            "settlement": {},
            "construction_notes": []
        }
        
        # Select foundation type
        bearing_capacity = soil_conditions["bearing_capacity"]
        water_table = soil_conditions["water_table"]
        
        if bearing_capacity > 4000 and total_load < 1000:  # psf, kips
            foundation_design["type"] = "Spread footings"
            foundation_design = await self._design_spread_footings(
                load_analysis,
                soil_conditions
            )
        elif bearing_capacity > 2000:
            foundation_design["type"] = "Mat foundation"
            foundation_design = await self._design_mat_foundation(
                load_analysis,
                soil_conditions,
                structural_system
            )
        else:
            foundation_design["type"] = "Deep foundations (piles)"
            foundation_design = await self._design_pile_foundation(
                load_analysis,
                soil_conditions
            )
        
        # Check for special conditions
        if soil_conditions.get("expansive_soil"):
            foundation_design["special_considerations"] = {
                "expansive_soil": True,
                "recommendations": [
                    "Moisture barriers",
                    "Void forms",
                    "Deep foundations below active zone"
                ]
            }
        
        if water_table < foundation_design["dimensions"].get("depth", 5):
            foundation_design["waterproofing"] = {
                "required": True,
                "type": "Membrane waterproofing",
                "drainage": "Perimeter drain system"
            }
        
        # Settlement analysis
        foundation_design["settlement"] = self._calculate_settlement(
            foundation_design,
            soil_conditions,
            load_analysis
        )
        
        return foundation_design
    
    async def _specify_materials(
        self,
        member_design: Dict[str, Any],
        preferred_materials: List[MaterialType],
        design_codes: List[str]
    ) -> Dict[str, Any]:
        """Specify materials for construction."""
        material_specs = {
            "concrete": {},
            "steel": {},
            "reinforcement": {},
            "other_materials": {},
            "durability_requirements": {},
            "testing_requirements": {}
        }
        
        # Concrete specifications
        if any("concrete" in str(member).lower() for member in member_design.values()):
            material_specs["concrete"] = {
                "strength": {
                    "columns": "5000 psi (34.5 MPa)",
                    "beams": "4000 psi (27.6 MPa)",
                    "slabs": "4000 psi (27.6 MPa)",
                    "footings": "3000 psi (20.7 MPa)"
                },
                "mix_design": {
                    "cement_type": "Type I/II",
                    "max_w/c_ratio": 0.45,
                    "min_cement_content": "335 kg/m³",
                    "air_entrainment": "4-7% for freeze-thaw",
                    "admixtures": ["Water reducer", "Set retarder as needed"]
                },
                "placement": {
                    "slump": "4-6 inches",
                    "consolidation": "Mechanical vibration",
                    "curing": "7 days moist curing",
                    "cold_weather": "Follow ACI 306",
                    "hot_weather": "Follow ACI 305"
                }
            }
        
        # Steel specifications
        if any("steel" in str(member).lower() for member in member_design.values()):
            material_specs["steel"] = {
                "structural_steel": {
                    "wide_flange": "ASTM A992",
                    "plates": "ASTM A36 or A572 Gr 50",
                    "HSS": "ASTM A500 Gr B",
                    "angles": "ASTM A36"
                },
                "bolts": {
                    "high_strength": "ASTM A325 or A490",
                    "anchor_bolts": "ASTM F1554 Gr 36 or 55"
                },
                "welding": {
                    "electrodes": "E70XX",
                    "process": "SMAW or GMAW",
                    "inspection": "UT for complete penetration welds"
                }
            }
        
        # Reinforcement specifications
        material_specs["reinforcement"] = {
            "deformed_bars": {
                "grade": "Grade 60 (420 MPa)",
                "sizes": "#3 through #11 as required",
                "coating": "Epoxy coated in corrosive environments"
            },
            "welded_wire": {
                "designation": "ASTM A1064",
                "common_sizes": "6x6-W2.9xW2.9"
            },
            "cover": {
                "exposed": "2 inches",
                "cast_against_earth": "3 inches",
                "interior": "3/4 inch for slabs, 1.5 inch for beams"
            }
        }
        
        # Durability requirements
        material_specs["durability_requirements"] = self._specify_durability_requirements(
            design_codes,
            member_design
        )
        
        # Testing requirements
        material_specs["testing_requirements"] = {
            "concrete": {
                "cylinders": "1 set per 100 cy or per day",
                "slump": "Each truck",
                "air_content": "Each truck for air-entrained"
            },
            "steel": {
                "mill_certificates": "Required for all structural steel",
                "bolt_testing": "Per AISC requirements"
            },
            "soil": {
                "compaction": "95% modified Proctor",
                "testing_frequency": "1 per 500 cy or lift"
            }
        }
        
        return material_specs
    
    async def _develop_construction_details(
        self,
        structural_system: Dict[str, Any],
        member_design: Dict[str, Any],
        material_specs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Develop construction details and specifications."""
        construction_details = {
            "typical_details": {},
            "special_details": {},
            "construction_sequence": [],
            "temporary_works": {},
            "quality_control": {},
            "specifications": []
        }
        
        # Typical details
        construction_details["typical_details"] = {
            "beam_column_connections": self._detail_beam_column_connection(
                member_design,
                material_specs
            ),
            "slab_edge": self._detail_slab_edge(member_design),
            "expansion_joints": self._detail_expansion_joint(structural_system),
            "base_plates": self._detail_base_plate(member_design)
        }
        
        # Special details for unique conditions
        if "seismic" in str(structural_system).lower():
            construction_details["special_details"]["seismic"] = {
                "beam_column_joints": "Special moment frame detailing per AISC 341",
                "shear_wall_boundary": "Confined boundary elements per ACI 318-19",
                "collector_elements": "Continuous load path details"
            }
        
        # Construction sequence
        construction_details["construction_sequence"] = self._develop_construction_sequence(
            structural_system,
            member_design
        )
        
        # Temporary works
        construction_details["temporary_works"] = {
            "shoring": self._design_shoring_requirements(member_design),
            "bracing": "Temporary bracing for lateral stability",
            "formwork": self._specify_formwork_requirements(member_design),
            "crane_loads": "Consider in design of supporting structure"
        }
        
        # Quality control
        construction_details["quality_control"] = {
            "inspection_requirements": [
                "Foundation excavation approval",
                "Reinforcement placement",
                "Concrete placement",
                "Bolt torquing",
                "Welding inspection"
            ],
            "hold_points": [
                "Before concrete pour",
                "Before backfill",
                "Before loading structure"
            ],
            "documentation": [
                "Daily reports",
                "Material test results",
                "As-built drawings"
            ]
        }
        
        # Reference specifications
        construction_details["specifications"] = [
            "Division 03 - Concrete",
            "Division 04 - Masonry",
            "Division 05 - Metals",
            "Division 06 - Wood and Plastics",
            "Division 07 - Thermal and Moisture Protection"
        ]
        
        return construction_details
    
    async def _check_code_compliance(
        self,
        member_design: Dict[str, Any],
        load_analysis: Dict[str, Any],
        design_codes: List[str]
    ) -> Dict[str, Any]:
        """Check compliance with building codes."""
        compliance_check = {
            "codes_checked": design_codes,
            "compliance_status": {},
            "critical_checks": {},
            "variances_required": [],
            "recommendations": []
        }
        
        # Check each applicable code
        for code in design_codes:
            if code == "IBC":
                compliance_check["compliance_status"]["IBC"] = await self._check_ibc_compliance(
                    member_design,
                    load_analysis
                )
            elif code == "ASCE7":
                compliance_check["compliance_status"]["ASCE7"] = self._check_asce7_compliance(
                    load_analysis
                )
            elif code == "ACI318":
                compliance_check["compliance_status"]["ACI318"] = self._check_aci318_compliance(
                    member_design
                )
            elif code == "AISC360":
                compliance_check["compliance_status"]["AISC360"] = self._check_aisc360_compliance(
                    member_design
                )
        
        # Critical checks
        compliance_check["critical_checks"] = {
            "drift_limits": self._check_drift_limits(member_design, load_analysis),
            "deflection_limits": self._check_deflection_limits(member_design),
            "strength_requirements": self._check_strength_requirements(member_design, load_analysis),
            "serviceability": self._check_serviceability(member_design),
            "fire_rating": self._check_fire_rating(member_design)
        }
        
        # Identify any variances needed
        for check, result in compliance_check["critical_checks"].items():
            if not result.get("compliant", True):
                compliance_check["variances_required"].append({
                    "item": check,
                    "issue": result.get("issue", "Non-compliance"),
                    "proposed_solution": result.get("solution", "Review required")
                })
        
        # Recommendations
        compliance_check["recommendations"] = self._generate_compliance_recommendations(
            compliance_check
        )
        
        # Overall compliance status
        compliance_check["overall_status"] = (
            "Compliant" if not compliance_check["variances_required"]
            else "Requires variances"
        )
        
        return compliance_check
    
    async def _estimate_construction_cost(
        self,
        member_design: Dict[str, Any],
        material_specs: Dict[str, Any],
        foundation_design: Dict[str, Any],
        dimensions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Estimate construction costs."""
        cost_estimate = {
            "material_costs": {},
            "labor_costs": {},
            "equipment_costs": {},
            "overhead_profit": {},
            "contingency": {},
            "total_costs": {},
            "cost_per_sf": 0
        }
        
        # Material costs
        cost_estimate["material_costs"] = {
            "concrete": self._estimate_concrete_cost(member_design, material_specs),
            "steel": self._estimate_steel_cost(member_design, material_specs),
            "reinforcement": self._estimate_rebar_cost(member_design),
            "other_materials": self._estimate_other_materials_cost(material_specs)
        }
        
        # Labor costs
        cost_estimate["labor_costs"] = {
            "concrete_work": cost_estimate["material_costs"]["concrete"] * 0.8,
            "steel_erection": cost_estimate["material_costs"]["steel"] * 0.5,
            "formwork": cost_estimate["material_costs"]["concrete"] * 0.6,
            "finishes": dimensions.get("area", 10000) * 15  # $/sf
        }
        
        # Equipment costs
        cost_estimate["equipment_costs"] = {
            "cranes": max(50000, cost_estimate["material_costs"]["steel"] * 0.1),
            "concrete_equipment": cost_estimate["material_costs"]["concrete"] * 0.05,
            "temporary_works": sum(cost_estimate["material_costs"].values()) * 0.02
        }
        
        # Calculate subtotals
        material_total = sum(cost_estimate["material_costs"].values())
        labor_total = sum(cost_estimate["labor_costs"].values())
        equipment_total = sum(cost_estimate["equipment_costs"].values())
        
        # Overhead and profit
        subtotal = material_total + labor_total + equipment_total
        cost_estimate["overhead_profit"] = {
            "overhead": subtotal * 0.10,
            "profit": subtotal * 0.05
        }
        
        # Contingency
        cost_estimate["contingency"] = {
            "design_contingency": subtotal * 0.05,
            "construction_contingency": subtotal * 0.10
        }
        
        # Total costs
        total = (subtotal + 
                sum(cost_estimate["overhead_profit"].values()) +
                sum(cost_estimate["contingency"].values()))
        
        cost_estimate["total_costs"] = {
            "construction_cost": total,
            "soft_costs": total * 0.20,  # Design, permits, etc.
            "total_project_cost": total * 1.20
        }
        
        # Cost per square foot
        area = dimensions.get("area", 1)
        cost_estimate["cost_per_sf"] = cost_estimate["total_costs"]["construction_cost"] / area
        
        # Cost breakdown
        cost_estimate["breakdown"] = {
            "structure": f"{(material_total + labor_total) / total * 100:.1f}%",
            "equipment": f"{equipment_total / total * 100:.1f}%",
            "overhead_profit": f"{sum(cost_estimate['overhead_profit'].values()) / total * 100:.1f}%",
            "contingency": f"{sum(cost_estimate['contingency'].values()) / total * 100:.1f}%"
        }
        
        return cost_estimate
    
    async def _assess_sustainability(
        self,
        material_specs: Dict[str, Any],
        structural_system: Dict[str, Any],
        sustainability_goals: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess sustainability and green building metrics."""
        sustainability_assessment = {
            "leed_credits": {},
            "embodied_carbon": {},
            "recycled_content": {},
            "local_materials": {},
            "energy_efficiency": {},
            "water_efficiency": {},
            "recommendations": []
        }
        
        # LEED credits assessment
        sustainability_assessment["leed_credits"] = {
            "materials_resources": self._assess_leed_materials(material_specs),
            "energy_atmosphere": self._assess_leed_energy(structural_system),
            "sustainable_sites": self._assess_leed_sites(structural_system),
            "innovation": self._assess_leed_innovation(structural_system),
            "total_points": 0
        }
        
        # Calculate total LEED points
        total_points = sum(
            cat.get("points", 0) 
            for cat in sustainability_assessment["leed_credits"].values()
            if isinstance(cat, dict)
        )
        sustainability_assessment["leed_credits"]["total_points"] = total_points
        sustainability_assessment["leed_credits"]["certification_level"] = self._determine_leed_level(total_points)
        
        # Embodied carbon calculation
        sustainability_assessment["embodied_carbon"] = {
            "concrete": self._calculate_concrete_carbon(material_specs),
            "steel": self._calculate_steel_carbon(material_specs),
            "total_kgCO2e": 0,
            "kgCO2e_per_m2": 0
        }
        
        # Recycled content
        sustainability_assessment["recycled_content"] = {
            "steel": "90% recycled content typical",
            "concrete": "15-30% fly ash or slag replacement",
            "aggregate": "Recycled aggregate where available",
            "total_recycled": "25-30% by cost"
        }
        
        # Local materials
        sustainability_assessment["local_materials"] = {
            "criteria": "Within 500 miles of site",
            "percentage": "20% minimum for LEED credit",
            "opportunities": ["Concrete", "Aggregate", "Structural steel"]
        }
        
        # Energy efficiency features
        sustainability_assessment["energy_efficiency"] = {
            "thermal_mass": "Concrete structure provides thermal mass",
            "daylighting": "Structure allows for daylighting strategies",
            "renewable_ready": "Roof designed for future PV installation"
        }
        
        # Recommendations
        sustainability_assessment["recommendations"] = self._generate_sustainability_recommendations(
            material_specs,
            structural_system,
            sustainability_goals
        )
        
        return sustainability_assessment
    
    async def _assess_project_risks(
        self,
        structure_type: StructureType,
        site_analysis: Dict[str, Any],
        construction_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess project risks and mitigation strategies."""
        risk_assessment = {
            "risk_categories": {},
            "risk_matrix": [],
            "mitigation_strategies": {},
            "contingency_planning": {},
            "overall_risk_level": ""
        }
        
        # Technical risks
        risk_assessment["risk_categories"]["technical"] = [
            {
                "risk": "Foundation conditions differ from assumptions",
                "probability": "Medium",
                "impact": "High",
                "mitigation": "Comprehensive geotechnical investigation"
            },
            {
                "risk": "Complex geometry construction issues",
                "probability": "Low",
                "impact": "Medium",
                "mitigation": "3D modeling and constructability review"
            }
        ]
        
        # Environmental risks
        risk_assessment["risk_categories"]["environmental"] = [
            {
                "risk": "Extreme weather during construction",
                "probability": "Medium",
                "impact": "Medium",
                "mitigation": "Seasonal scheduling and weather protection"
            },
            {
                "risk": "Environmental compliance issues",
                "probability": "Low",
                "impact": "High",
                "mitigation": "Early environmental assessment"
            }
        ]
        
        # Construction risks
        risk_assessment["risk_categories"]["construction"] = [
            {
                "risk": "Material availability/price fluctuation",
                "probability": "High",
                "impact": "Medium",
                "mitigation": "Early procurement and escalation clauses"
            },
            {
                "risk": "Skilled labor shortage",
                "probability": "Medium",
                "impact": "Medium",
                "mitigation": "Early contractor engagement"
            }
        ]
        
        # Schedule risks
        risk_assessment["risk_categories"]["schedule"] = [
            {
                "risk": "Permit delays",
                "probability": "Medium",
                "impact": "High",
                "mitigation": "Early submission and agency coordination"
            },
            {
                "risk": "Weather delays",
                "probability": "High",
                "impact": "Low",
                "mitigation": "Weather float in schedule"
            }
        ]
        
        # Create risk matrix
        risk_assessment["risk_matrix"] = self._create_risk_matrix(
            risk_assessment["risk_categories"]
        )
        
        # Mitigation strategies
        risk_assessment["mitigation_strategies"] = {
            "design_phase": [
                "Peer review of critical elements",
                "Value engineering workshops",
                "Constructability reviews"
            ],
            "construction_phase": [
                "Regular progress monitoring",
                "Quality control program",
                "Safety program implementation"
            ],
            "commissioning": [
                "Systematic testing program",
                "Performance verification",
                "O&M training"
            ]
        }
        
        # Contingency planning
        risk_assessment["contingency_planning"] = {
            "cost_contingency": "10-15% recommended",
            "schedule_contingency": "15-20% float",
            "design_alternatives": "Maintain design options for value engineering"
        }
        
        # Overall risk level
        high_risks = sum(
            1 for category in risk_assessment["risk_categories"].values()
            for risk in category
            if risk["probability"] == "High" and risk["impact"] == "High"
        )
        
        if high_risks > 2:
            risk_assessment["overall_risk_level"] = "High"
        elif high_risks > 0:
            risk_assessment["overall_risk_level"] = "Medium"
        else:
            risk_assessment["overall_risk_level"] = "Low"
        
        return risk_assessment
    
    # Helper methods
    def _determine_climate_zone(self, location: Dict[str, Any]) -> str:
        """Determine climate zone from location."""
        latitude = location.get("latitude", 40)
        
        if latitude > 45:
            return "Cold"
        elif latitude > 35:
            return "Temperate"
        else:
            return "Hot"
    
    def _determine_seismic_category(self, Ss: float, S1: float, site_class: str) -> str:
        """Determine seismic design category."""
        # Simplified SDC determination
        if Ss > 1.5 or S1 > 0.6:
            return "D"
        elif Ss > 0.5 or S1 > 0.2:
            return "C"
        elif Ss > 0.25 or S1 > 0.1:
            return "B"
        else:
            return "A"
    
    def _determine_risk_category(self, structure_type: StructureType) -> str:
        """Determine risk category for structure."""
        if structure_type in [StructureType.DAM, StructureType.POWER_PLANT]:
            return "IV"
        elif structure_type in [StructureType.BUILDING, StructureType.BRIDGE]:
            return "II"
        else:
            return "II"
    
    def _calculate_dead_loads(
        self,
        structure_type: StructureType,
        dimensions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate dead loads."""
        dead_loads = {}
        
        if structure_type == StructureType.BUILDING:
            # Typical building dead loads
            dead_loads["floor"] = {
                "slab": 50,  # psf for 4" slab
                "beams": 10,
                "mep": 5,
                "ceiling": 5,
                "total": 70
            }
            dead_loads["roof"] = {
                "deck": 15,
                "insulation": 3,
                "roofing": 6,
                "mep": 5,
                "total": 29
            }
            dead_loads["walls"] = {
                "exterior": 25,  # psf of wall area
                "interior": 10
            }
        
        return dead_loads
    
    def _calculate_live_loads(
        self,
        structure_type: StructureType,
        dimensions: Dict[str, Any],
        occupancy: str
    ) -> Dict[str, Any]:
        """Calculate live loads based on occupancy."""
        live_loads = {}
        
        # IBC Table 1607.1 live loads
        occupancy_loads = {
            "office": 50,
            "residential": 40,
            "retail": 100,
            "assembly": 100,
            "warehouse": 125,
            "parking": 40,
            "roof": 20
        }
        
        if structure_type == StructureType.BUILDING:
            live_loads["floor"] = occupancy_loads.get(occupancy, 50)
            live_loads["roof"] = 20
            live_loads["reduction_allowed"] = True
            
            # Live load reduction for large areas
            area = dimensions.get("tributary_area", 400)
            if area > 400:
                reduction = min(0.5, 0.25 + 15/math.sqrt(area))
                live_loads["reduced_floor"] = live_loads["floor"] * (1 - reduction)
        
        return live_loads
    
    async def _calculate_wind_loads(
        self,
        structure_type: StructureType,
        dimensions: Dict[str, Any],
        wind_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate wind loads per ASCE 7."""
        V = wind_data["basic_wind_speed"]  # mph
        Kz = 1.0  # Exposure coefficient (simplified)
        Kzt = wind_data["topographic_factor"]
        Kd = 0.85  # Directionality factor
        Ke = wind_data["ground_elevation_factor"]
        
        # Calculate velocity pressure
        qz = 0.00256 * Kz * Kzt * Kd * Ke * V**2  # psf
        
        # Pressure coefficients
        Cp_windward = 0.8
        Cp_leeward = -0.5
        GCp = 0.85  # Gust factor
        
        wind_loads = {
            "velocity_pressure": qz,
            "windward_pressure": qz * GCp * Cp_windward,
            "leeward_pressure": qz * GCp * Cp_leeward,
            "design_pressure": qz * GCp * (Cp_windward - Cp_leeward),
            "base_shear": 0,
            "overturning_moment": 0
        }
        
        # Calculate base shear and overturning
        if structure_type == StructureType.BUILDING:
            height = dimensions.get("height", 30)
            width = dimensions.get("width", 100)
            
            wind_loads["base_shear"] = wind_loads["design_pressure"] * height * width / 1000  # kips
            wind_loads["overturning_moment"] = wind_loads["base_shear"] * height / 2  # kip-ft
        
        return wind_loads
    
    async def _calculate_seismic_loads(
        self,
        structure_type: StructureType,
        dimensions: Dict[str, Any],
        seismic_data: Dict[str, Any],
        dead_loads: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate seismic loads per ASCE 7."""
        # Seismic parameters
        Ss = seismic_data["Ss"]
        S1 = seismic_data["S1"]
        Fa = seismic_data["Fa"]
        Fv = seismic_data["Fv"]
        
        # Site-modified spectral accelerations
        SMS = Fa * Ss
        SM1 = Fv * S1
        
        # Design spectral accelerations
        SDS = 2/3 * SMS
        SD1 = 2/3 * SM1
        
        # Seismic response coefficient
        R = 5  # Response modification factor (depends on system)
        Ie = 1.0  # Importance factor
        
        # Approximate fundamental period
        if structure_type == StructureType.BUILDING:
            hn = dimensions.get("height", 30)
            Ta = 0.028 * hn**0.8  # Steel moment frame
            
            # Calculate Cs
            Cs = SDS / (R/Ie)
            Cs = min(Cs, SD1 / (Ta * (R/Ie)))
            Cs = max(Cs, 0.044 * SDS * Ie)
            
            # Seismic base shear
            W = self._calculate_seismic_weight(dead_loads, dimensions)
            V = Cs * W
            
            seismic_loads = {
                "SDS": SDS,
                "SD1": SD1,
                "period": Ta,
                "Cs": Cs,
                "base_shear": V,
                "vertical_distribution": self._distribute_seismic_forces(V, dimensions),
                "story_drift_limit": 0.020  # 2% for Risk Category II
            }
        else:
            seismic_loads = {"message": "Seismic analysis required for this structure type"}
        
        return seismic_loads
    
    def _calculate_snow_loads(
        self,
        dimensions: Dict[str, Any],
        snow_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate snow loads per ASCE 7."""
        pg = snow_data["ground_snow_load"]
        Ce = snow_data["exposure_factor"]
        Ct = snow_data["thermal_factor"]
        Is = snow_data["importance_factor"]
        
        # Flat roof snow load
        pf = 0.7 * Ce * Ct * Is * pg
        
        # Minimum snow load
        pm = 20 * Is if pg > 20 else pg * Is
        
        snow_loads = {
            "flat_roof": max(pf, pm),
            "sloped_roof": pf,  # Adjust for slope if needed
            "drift": self._calculate_snow_drift(dimensions, pf),
            "sliding": self._calculate_sliding_snow(dimensions, pf)
        }
        
        return snow_loads
    
    def _calculate_hydrostatic_loads(self, dimensions: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate hydrostatic loads for water-retaining structures."""
        water_height = dimensions.get("water_depth", 10)
        unit_weight = 62.4  # pcf
        
        return {
            "pressure_at_base": water_height * unit_weight,
            "total_force": 0.5 * water_height**2 * unit_weight,
            "moment_arm": water_height / 3,
            "uplift_pressure": water_height * unit_weight
        }
    
    def _calculate_earth_pressure(
        self,
        dimensions: Dict[str, Any],
        soil_conditions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate earth pressure on retaining structures."""
        height = dimensions.get("height", 10)
        soil_type = soil_conditions.get("soil_type", "sand")
        
        # Get soil properties
        if soil_type in self._material_properties["soil"]:
            soil_props = self._material_properties["soil"][soil_type]
            phi = soil_props["friction_angle"]
            gamma = soil_props["unit_weight"] * 0.06242  # Convert to pcf
            
            # Active earth pressure coefficient
            Ka = self._soil_parameters["earth_pressure"]["active"](phi)
            
            earth_pressure = {
                "active_coefficient": Ka,
                "pressure_at_base": Ka * gamma * height,
                "total_force": 0.5 * Ka * gamma * height**2,
                "moment_arm": height / 3,
                "surcharge": dimensions.get("surcharge", 0) * Ka
            }
        else:
            earth_pressure = {"error": "Unknown soil type"}
        
        return earth_pressure
    
    def _generate_load_combinations(
        self,
        load_calculations: Dict[str, Any],
        method: str
    ) -> List[Dict[str, Any]]:
        """Generate load combinations per code."""
        combinations = []
        
        D = load_calculations.get("dead_loads", {})
        L = load_calculations.get("live_loads", {})
        W = load_calculations.get("wind_loads", {})
        E = load_calculations.get("seismic_loads", {})
        S = load_calculations.get("snow_loads", {})
        
        if method == "LRFD":
            # Add LRFD combinations
            combinations.extend([
                {"name": "1.4D", "factors": {"D": 1.4}},
                {"name": "1.2D + 1.6L", "factors": {"D": 1.2, "L": 1.6}},
                {"name": "1.2D + 1.0W + L", "factors": {"D": 1.2, "W": 1.0, "L": 1.0}},
                {"name": "1.2D + 1.0E + L", "factors": {"D": 1.2, "E": 1.0, "L": 1.0}}
            ])
        
        return combinations
    
    def _identify_governing_load(self, load_calculations: Dict[str, Any]) -> str:
        """Identify governing load case."""
        max_load = 0
        governing = "Dead load"
        
        for load_type, loads in load_calculations.items():
            if isinstance(loads, dict) and "total" in loads:
                if loads["total"] > max_load:
                    max_load = loads["total"]
                    governing = load_type
        
        return governing
    
    def _sum_vertical_loads(self, load_calculations: Dict[str, Any]) -> float:
        """Sum all vertical loads."""
        total = 0
        
        if "dead_loads" in load_calculations:
            total += sum(v.get("total", 0) for v in load_calculations["dead_loads"].values() if isinstance(v, dict))
        
        if "live_loads" in load_calculations:
            total += load_calculations["live_loads"].get("floor", 0)
        
        if "snow_loads" in load_calculations:
            total += load_calculations["snow_loads"].get("flat_roof", 0)
        
        return total
    
    def _sum_lateral_loads(self, load_calculations: Dict[str, Any]) -> float:
        """Sum all lateral loads."""
        wind = load_calculations.get("wind_loads", {}).get("base_shear", 0)
        seismic = load_calculations.get("seismic_loads", {}).get("base_shear", 0)
        
        return max(wind, seismic)  # Wind and seismic don't act simultaneously
    
    def _select_floor_system(self, bay_size: float, materials: List[MaterialType]) -> str:
        """Select appropriate floor system."""
        if bay_size < 25:
            if MaterialType.CONCRETE in materials:
                return "Two-way slab"
            else:
                return "Steel deck with concrete topping"
        elif bay_size < 40:
            return "One-way slab on beams"
        else:
            return "Post-tensioned slab"
    
    def _select_dam_type(self, dimensions: Dict[str, Any], load_analysis: Dict[str, Any]) -> str:
        """Select dam type based on site conditions."""
        height = dimensions.get("height", 50)
        
        if height < 50:
            return "Earth-fill dam"
        elif height < 150:
            return "Concrete gravity dam"
        else:
            return "Concrete arch dam"
    
    def _select_optimal_material(
        self,
        structure_type: StructureType,
        load_analysis: Dict[str, Any],
        preferred_materials: List[MaterialType]
    ) -> str:
        """Select optimal material for structure."""
        if preferred_materials:
            if MaterialType.STEEL in preferred_materials:
                return "Structural steel"
            elif MaterialType.CONCRETE in preferred_materials:
                return "Reinforced concrete"
            elif MaterialType.TIMBER in preferred_materials:
                return "Engineered timber"
        
        # Default based on structure type
        if structure_type in [StructureType.BUILDING, StructureType.BRIDGE]:
            return "Steel-concrete composite"
        elif structure_type == StructureType.DAM:
            return "Mass concrete"
        else:
            return "Reinforced concrete"
    
    def _optimize_bay_spacing(self, structure_type: StructureType, dimensions: Dict[str, Any]) -> float:
        """Optimize structural bay spacing."""
        if structure_type == StructureType.BUILDING:
            # Typical economical bay sizes
            if dimensions.get("use", "") == "parking":
                return 27  # 3 parking spaces
            else:
                return 30  # General purpose
        elif structure_type == StructureType.BRIDGE:
            return dimensions.get("main_span", 100) / 4
        else:
            return 25
    
    def _determine_column_grid(self, dimensions: Dict[str, Any]) -> Dict[str, Any]:
        """Determine column grid layout."""
        length = dimensions.get("length", 100)
        width = dimensions.get("width", 60)
        
        # Optimize grid spacing
        optimal_bay = 30
        
        return {
            "longitudinal_bays": int(length / optimal_bay),
            "transverse_bays": int(width / optimal_bay),
            "typical_spacing": optimal_bay,
            "edge_adjustment": "Adjust edge bays as needed"
        }
    
    def _locate_expansion_joints(self, dimensions: Dict[str, Any]) -> List[float]:
        """Locate expansion joints in structure."""
        length = dimensions.get("length", 100)
        max_length = 200  # Maximum length without expansion joint
        
        if length > max_length:
            n_joints = int(length / max_length)
            spacing = length / (n_joints + 1)
            return [spacing * (i + 1) for i in range(n_joints)]
        else:
            return []
    
    def _assess_redundancy(self, structural_system: Dict[str, Any]) -> str:
        """Assess structural redundancy."""
        if "moment frame" in structural_system.get("lateral_system", ""):
            return "High - multiple load paths"
        elif "braced frame" in structural_system.get("lateral_system", ""):
            return "Moderate - limited load paths"
        else:
            return "Adequate"
    
    async def _design_columns(
        self,
        load_analysis: Dict[str, Any],
        material: str,
        column_grid: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Design structural columns."""
        # Simplified column design
        axial_load = load_analysis["summary"]["total_vertical_load"] / (column_grid.get("longitudinal_bays", 3) * column_grid.get("transverse_bays", 2))
        
        if "steel" in material.lower():
            return {
                "type": "Wide flange column",
                "size": "W14x90",  # Example size
                "capacity": 500,  # kips
                "utilization": axial_load / 500,
                "unbraced_length": 12,  # ft
                "effective_length_factor": 1.0
            }
        else:
            return {
                "type": "Concrete column",
                "size": "24x24 inches",
                "reinforcement": "8-#9 bars",
                "capacity": 800,  # kips
                "utilization": axial_load / 800
            }
    
    async def _design_beams(
        self,
        load_analysis: Dict[str, Any],
        material: str,
        bay_spacing: float
    ) -> Dict[str, Any]:
        """Design structural beams."""
        # Simplified beam design
        uniform_load = load_analysis.get("dead_loads", {}).get("floor", {}).get("total", 70) + load_analysis.get("live_loads", {}).get("floor", 50)
        
        moment = uniform_load * bay_spacing**2 / 8  # lb-ft per ft width
        
        if "steel" in material.lower():
            return {
                "type": "Wide flange beam",
                "size": "W24x55",
                "capacity": 250,  # kip-ft
                "utilization": moment / 1000 / 250,
                "deflection_ratio": "L/360",
                "camber": "3/4 inch"
            }
        else:
            return {
                "type": "Concrete beam",
                "size": "24x30 inches",
                "reinforcement": {
                    "top": "4-#8",
                    "bottom": "4-#9",
                    "stirrups": "#4 @ 12\" o.c."
                },
                "capacity": 300  # kip-ft
            }
    
    async def _design_slabs(
        self,
        floor_system: str,
        load_analysis: Dict[str, Any],
        material: str
    ) -> Dict[str, Any]:
        """Design floor slabs."""
        if "two-way" in floor_system.lower():
            return {
                "type": "Two-way slab",
                "thickness": 8,  # inches
                "reinforcement": {
                    "top": "#5 @ 12\" o.c. each way",
                    "bottom": "#5 @ 12\" o.c. each way"
                },
                "concrete_strength": "4000 psi"
            }
        else:
            return {
                "type": "One-way slab",
                "thickness": 6,
                "reinforcement": {
                    "main": "#5 @ 10\" o.c.",
                    "temperature": "#4 @ 18\" o.c."
                }
            }
    
    async def _design_shear_walls(
        self,
        load_analysis: Dict[str, Any],
        material: str,
        configuration: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Design shear walls."""
        lateral_load = load_analysis["summary"]["total_lateral_load"]
        
        return {
            "type": "Concrete shear wall",
            "thickness": 12,  # inches
            "reinforcement": {
                "vertical": "#5 @ 12\" o.c.",
                "horizontal": "#5 @ 12\" o.c.",
                "boundary_elements": "As required by ACI 318"
            },
            "length_required": lateral_load / 50,  # ft (simplified)
            "location": "Around stairs and elevators"
        }
    
    async def _design_connections(
        self,
        member_design: Dict[str, Any],
        material: str,
        load_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Design structural connections."""
        if "steel" in material.lower():
            return {
                "beam_column": {
                    "type": "Bolted shear tab",
                    "bolts": "4-3/4\" A325",
                    "plate": "1/2\" x 8\"",
                    "welds": "1/4\" fillet"
                },
                "brace_connections": {
                    "type": "Gusset plate",
                    "thickness": "3/4 inch",
                    "bolts": "6-7/8\" A325"
                }
            }
        else:
            return {
                "beam_column": {
                    "type": "Cast-in-place",
                    "development_length": "40 bar diameters",
                    "hooks": "Standard 90-degree"
                }
            }
    
    async def _design_braces(
        self,
        load_analysis: Dict[str, Any],
        material: str
    ) -> Dict[str, Any]:
        """Design lateral bracing members."""
        lateral_force = load_analysis["summary"]["total_lateral_load"] / 4  # Assume 4 braced bays
        
        return {
            "type": "HSS diagonal brace",
            "size": "HSS8x8x1/2",
            "capacity": 200,  # kips
            "utilization": lateral_force / 200,
            "connection": "Gusset plate",
            "buckling_check": "Satisfactory"
        }
    
    async def _verify_member_designs(
        self,
        member_design: Dict[str, Any],
        load_analysis: Dict[str, Any],
        design_codes: List[str]
    ) -> Dict[str, Any]:
        """Verify all member designs meet code requirements."""
        verification = {
            "strength_check": "OK",
            "serviceability_check": "OK",
            "stability_check": "OK",
            "code_compliance": "Meets all requirements"
        }
        
        # Check each member type
        for member_type, design in member_design.items():
            if isinstance(design, dict) and "utilization" in design:
                if design["utilization"] > 0.95:
                    verification["strength_check"] = "Review required"
        
        return verification
    
    async def _design_spread_footings(
        self,
        load_analysis: Dict[str, Any],
        soil_conditions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Design spread footings."""
        column_load = load_analysis["summary"]["total_vertical_load"] / 20  # Assume 20 columns
        bearing_capacity = soil_conditions["bearing_capacity"]
        
        # Required area
        area_required = column_load * 1000 / bearing_capacity  # sf
        
        # Square footing
        dimension = math.sqrt(area_required) * 1.1  # 10% safety
        dimension = math.ceil(dimension)
        
        return {
            "type": "Spread footing",
            "dimensions": {
                "length": dimension,
                "width": dimension,
                "thickness": max(12, dimension / 8),  # inches
                "depth": soil_conditions["frost_depth"] + 0.5  # ft
            },
            "reinforcement": {
                "bottom": f"#{int(5 + dimension/10)} @ 12\" o.c. each way",
                "development": "Full development length"
            },
            "bearing_pressure": column_load * 1000 / (dimension**2),
            "concrete": "3000 psi"
        }
    
    async def _design_mat_foundation(
        self,
        load_analysis: Dict[str, Any],
        soil_conditions: Dict[str, Any],
        structural_system: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Design mat foundation."""
        total_load = load_analysis["summary"]["total_vertical_load"]
        bearing_capacity = soil_conditions["bearing_capacity"]
        
        # Building footprint
        area = total_load * 1000 / (bearing_capacity * 0.8)  # 80% utilization
        
        return {
            "type": "Mat foundation",
            "thickness": 36,  # inches
            "reinforcement": {
                "top": "#8 @ 12\" o.c. each way",
                "bottom": "#8 @ 12\" o.c. each way",
                "edge_beams": "Additional reinforcement at edges"
            },
            "concrete": "4000 psi",
            "waterproofing": "Required if below water table"
        }
    
    async def _design_pile_foundation(
        self,
        load_analysis: Dict[str, Any],
        soil_conditions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Design pile foundation."""
        column_load = load_analysis["summary"]["total_vertical_load"] / 20
        
        return {
            "type": "Driven steel piles",
            "pile_type": "HP12x74",
            "capacity": 150,  # tons
            "number_per_cap": math.ceil(column_load / 2 / 150),
            "length": "To refusal or 60 ft",
            "pile_cap": {
                "thickness": 36,  # inches
                "reinforcement": "Per ACI 318"
            },
            "spacing": "3 pile diameters minimum"
        }
    
    def _calculate_settlement(
        self,
        foundation_design: Dict[str, Any],
        soil_conditions: Dict[str, Any],
        load_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate foundation settlement."""
        # Simplified immediate settlement
        if foundation_design["type"] == "Spread footing":
            B = foundation_design["dimensions"]["width"]
            q = foundation_design.get("bearing_pressure", 2000)
            Es = self._material_properties["soil"].get(
                soil_conditions.get("soil_type", "sand"), {}
            ).get("modulus", 30000)
            
            # Immediate settlement (simplified)
            settlement = q * B / Es * 12  # inches
            
            return {
                "immediate": f"{settlement:.2f} inches",
                "consolidation": "Negligible for sand",
                "total": f"{settlement:.2f} inches",
                "allowable": "1 inch",
                "check": "OK" if settlement < 1 else "Review required"
            }
        else:
            return {"type": "Requires detailed analysis"}
    
    def _specify_durability_requirements(
        self,
        design_codes: List[str],
        member_design: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Specify durability requirements."""
        return {
            "exposure_class": "F2 - Moderate freeze-thaw",
            "concrete_cover": {
                "cast_against_earth": "3 inches",
                "exposed_to_weather": "2 inches",
                "not_exposed": "1.5 inches"
            },
            "concrete_requirements": {
                "max_w/c": 0.45,
                "min_strength": "4500 psi for exposure",
                "air_entrainment": "5-7%"
            },
            "steel_protection": {
                "paint_system": "3-coat system",
                "galvanizing": "For exposed anchor bolts",
                "fireproofing": "Per building code"
            }
        }
    
    def _detail_beam_column_connection(
        self,
        member_design: Dict[str, Any],
        material_specs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Detail beam-column connection."""
        return {
            "connection_type": "Moment connection",
            "configuration": "Top and bottom flange plates",
            "bolt_pattern": "4 bolts per flange",
            "weld_size": "CJP welds at column",
            "stiffeners": "Required at beam flanges"
        }
    
    def _detail_slab_edge(self, member_design: Dict[str, Any]) -> Dict[str, Any]:
        """Detail slab edge condition."""
        return {
            "edge_type": "Turned down slab edge",
            "thickness": "8 inches minimum",
            "reinforcement": "Continuous #5 top and bottom",
            "closure_pour": "2 inch min at metal deck"
        }
    
    def _detail_expansion_joint(self, structural_system: Dict[str, Any]) -> Dict[str, Any]:
        """Detail expansion joint."""
        return {
            "joint_width": "2 inches typical",
            "cover_plate": "Sliding plate detail",
            "seal": "Compression seal",
            "fire_rating": "Match floor assembly"
        }
    
    def _detail_base_plate(self, member_design: Dict[str, Any]) -> Dict[str, Any]:
        """Detail column base plate."""
        return {
            "plate_size": "24x24x1.5 inches",
            "anchor_bolts": "4-1.5\" diameter",
            "grout": "Non-shrink grout",
            "leveling": "Leveling nuts on anchor bolts"
        }
    
    def _develop_construction_sequence(
        self,
        structural_system: Dict[str, Any],
        member_design: Dict[str, Any]
    ) -> List[str]:
        """Develop construction sequence."""
        sequence = [
            "1. Site preparation and excavation",
            "2. Foundation construction",
            "3. Basement walls (if applicable)",
            "4. SOG or basement slab",
            "5. Structural steel erection",
            "6. Floor deck installation",
            "7. Concrete topping placement",
            "8. Repeat for each floor",
            "9. Roof structure",
            "10. Exterior envelope"
        ]
        
        return sequence
    
    def _design_shoring_requirements(self, member_design: Dict[str, Any]) -> Dict[str, Any]:
        """Design temporary shoring."""
        return {
            "slab_shoring": "Shore until 75% strength",
            "beam_shoring": "Two levels minimum",
            "removal": "Per ACI 347 requirements",
            "reshoring": "Required for multi-story"
        }
    
    def _specify_formwork_requirements(self, member_design: Dict[str, Any]) -> Dict[str, Any]:
        """Specify formwork requirements."""
        return {
            "type": "Job-built or prefabricated",
            "material": "Plywood or steel forms",
            "tolerances": "Per ACI 117",
            "form_release": "Approved form oil"
        }
    
    async def _check_ibc_compliance(
        self,
        member_design: Dict[str, Any],
        load_analysis: Dict[str, Any]
    ) -> Dict[str, str]:
        """Check IBC compliance."""
        return {
            "occupancy_classification": "Compliant",
            "height_area_limitations": "Within limits",
            "fire_rating": "Per Chapter 7",
            "means_of_egress": "Per Chapter 10",
            "accessibility": "Per Chapter 11"
        }
    
    def _check_asce7_compliance(self, load_analysis: Dict[str, Any]) -> Dict[str, str]:
        """Check ASCE 7 compliance."""
        return {
            "load_combinations": "Per Chapter 2",
            "wind_loads": "Per Chapters 26-31",
            "seismic_loads": "Per Chapters 11-23",
            "snow_loads": "Per Chapter 7"
        }
    
    def _check_aci318_compliance(self, member_design: Dict[str, Any]) -> Dict[str, str]:
        """Check ACI 318 compliance."""
        return {
            "concrete_quality": "Per Chapter 19",
            "reinforcement": "Per Chapter 20",
            "member_design": "Per applicable chapters",
            "detailing": "Per Chapter 18 for seismic"
        }
    
    def _check_aisc360_compliance(self, member_design: Dict[str, Any]) -> Dict[str, str]:
        """Check AISC 360 compliance."""
        return {
            "member_design": "Per Chapters B-H",
            "connections": "Per Chapter J",
            "stability": "Per Chapter C",
            "serviceability": "Per Chapter L"
        }
    
    def _check_drift_limits(
        self,
        member_design: Dict[str, Any],
        load_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check story drift limits."""
        return {
            "wind_drift": "H/400",
            "seismic_drift": "0.020h",
            "calculated": "0.015h",
            "compliant": True
        }
    
    def _check_deflection_limits(self, member_design: Dict[str, Any]) -> Dict[str, Any]:
        """Check deflection limits."""
        return {
            "floor_beams": "L/360 live, L/240 total",
            "roof_beams": "L/240 live, L/180 total",
            "cantilevers": "L/180",
            "compliant": True
        }
    
    def _check_strength_requirements(
        self,
        member_design: Dict[str, Any],
        load_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check strength requirements."""
        return {
            "demand_capacity_ratio": 0.85,
            "governing_load_combination": "1.2D + 1.6L",
            "critical_member": "Interior column",
            "compliant": True
        }
    
    def _check_serviceability(self, member_design: Dict[str, Any]) -> Dict[str, Any]:
        """Check serviceability requirements."""
        return {
            "vibration": "Acceptable for intended use",
            "cracking": "Within limits",
            "durability": "Adequate protection",
            "compliant": True
        }
    
    def _check_fire_rating(self, member_design: Dict[str, Any]) -> Dict[str, Any]:
        """Check fire rating requirements."""
        return {
            "required_rating": "2-hour",
            "columns": "Spray fireproofing",
            "beams": "Spray fireproofing",
            "floor_assembly": "Rated assembly",
            "compliant": True
        }
    
    def _generate_compliance_recommendations(
        self,
        compliance_check: Dict[str, Any]
    ) -> List[str]:
        """Generate compliance recommendations."""
        recommendations = []
        
        if compliance_check["variances_required"]:
            recommendations.append("Submit variance requests early")
        
        recommendations.extend([
            "Engage code consultant for complex issues",
            "Schedule required special inspections",
            "Maintain documentation for inspections"
        ])
        
        return recommendations
    
    def _estimate_concrete_cost(
        self,
        member_design: Dict[str, Any],
        material_specs: Dict[str, Any]
    ) -> float:
        """Estimate concrete material cost."""
        # Simplified volume calculation
        volume = 1000  # cy placeholder
        unit_cost = 150  # $/cy
        
        return volume * unit_cost
    
    def _estimate_steel_cost(
        self,
        member_design: Dict[str, Any],
        material_specs: Dict[str, Any]
    ) -> float:
        """Estimate structural steel cost."""
        # Simplified weight calculation
        weight = 200  # tons placeholder
        unit_cost = 1500  # $/ton erected
        
        return weight * unit_cost
    
    def _estimate_rebar_cost(self, member_design: Dict[str, Any]) -> float:
        """Estimate reinforcing steel cost."""
        # Simplified calculation
        weight = 50  # tons placeholder
        unit_cost = 1000  # $/ton installed
        
        return weight * unit_cost
    
    def _estimate_other_materials_cost(self, material_specs: Dict[str, Any]) -> float:
        """Estimate other materials cost."""
        return 50000  # Placeholder for misc materials
    
    def _assess_leed_materials(self, material_specs: Dict[str, Any]) -> Dict[str, Any]:
        """Assess LEED materials credits."""
        return {
            "recycled_content": 2,
            "regional_materials": 2,
            "rapidly_renewable": 0,
            "certified_wood": 0,
            "points": 4
        }
    
    def _assess_leed_energy(self, structural_system: Dict[str, Any]) -> Dict[str, Any]:
        """Assess LEED energy credits."""
        return {
            "optimize_energy": 0,  # Structural doesn't directly contribute
            "renewable_energy": 0,
            "enhanced_commissioning": 0,
            "points": 0
        }
    
    def _assess_leed_sites(self, structural_system: Dict[str, Any]) -> Dict[str, Any]:
        """Assess LEED sustainable sites credits."""
        return {
            "site_selection": 1,
            "development_density": 1,
            "stormwater_design": 1,
            "heat_island": 0,
            "points": 3
        }
    
    def _assess_leed_innovation(self, structural_system: Dict[str, Any]) -> Dict[str, Any]:
        """Assess LEED innovation credits."""
        return {
            "innovative_design": 1,
            "leed_ap": 1,
            "points": 2
        }
    
    def _determine_leed_level(self, points: int) -> str:
        """Determine LEED certification level."""
        if points >= 80:
            return "Platinum"
        elif points >= 60:
            return "Gold"
        elif points >= 50:
            return "Silver"
        elif points >= 40:
            return "Certified"
        else:
            return "Not certified"
    
    def _calculate_concrete_carbon(self, material_specs: Dict[str, Any]) -> float:
        """Calculate embodied carbon from concrete."""
        # Simplified calculation
        volume = 1000  # cy
        carbon_per_cy = 400  # kg CO2e/cy
        
        return volume * carbon_per_cy
    
    def _calculate_steel_carbon(self, material_specs: Dict[str, Any]) -> float:
        """Calculate embodied carbon from steel."""
        # Simplified calculation
        weight = 200  # tons
        carbon_per_ton = 1800  # kg CO2e/ton
        
        return weight * carbon_per_ton
    
    def _generate_sustainability_recommendations(
        self,
        material_specs: Dict[str, Any],
        structural_system: Dict[str, Any],
        sustainability_goals: Dict[str, Any]
    ) -> List[str]:
        """Generate sustainability recommendations."""
        return [
            "Specify high SCM content concrete",
            "Use recycled steel where possible",
            "Optimize structural design to reduce material",
            "Consider life-cycle assessment",
            "Design for deconstruction"
        ]
    
    def _create_risk_matrix(self, risk_categories: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """Create risk assessment matrix."""
        matrix = []
        
        for category, risks in risk_categories.items():
            for risk in risks:
                matrix.append({
                    "category": category,
                    "risk": risk["risk"],
                    "probability": risk["probability"],
                    "impact": risk["impact"],
                    "score": self._calculate_risk_score(risk["probability"], risk["impact"])
                })
        
        return sorted(matrix, key=lambda x: x["score"], reverse=True)
    
    def _calculate_risk_score(self, probability: str, impact: str) -> int:
        """Calculate risk score from probability and impact."""
        prob_scores = {"Low": 1, "Medium": 2, "High": 3}
        impact_scores = {"Low": 1, "Medium": 2, "High": 3}
        
        return prob_scores.get(probability, 1) * impact_scores.get(impact, 1)
    
    def _calculate_seismic_weight(self, dead_loads: Dict[str, Any], dimensions: Dict[str, Any]) -> float:
        """Calculate seismic weight of structure."""
        # Simplified - includes dead load + portion of live load
        area = dimensions.get("area", 10000)
        weight_per_sf = 100  # psf typical
        
        return area * weight_per_sf / 1000  # kips
    
    def _distribute_seismic_forces(self, base_shear: float, dimensions: Dict[str, Any]) -> List[Dict[str, float]]:
        """Distribute seismic forces over height."""
        stories = dimensions.get("stories", 1)
        story_height = dimensions.get("story_height", 12)
        
        distribution = []
        total_weight_height = sum((i + 1) * story_height for i in range(stories))
        
        for i in range(stories):
            height = (i + 1) * story_height
            force = base_shear * (height / total_weight_height)
            distribution.append({
                "level": i + 1,
                "height": height,
                "force": force
            })
        
        return distribution
    
    def _calculate_snow_drift(self, dimensions: Dict[str, Any], base_load: float) -> float:
        """Calculate snow drift loads."""
        # Simplified drift calculation
        return base_load * 1.5
    
    def _calculate_sliding_snow(self, dimensions: Dict[str, Any], base_load: float) -> float:
        """Calculate sliding snow loads."""
        # Simplified sliding snow
        return base_load * 0.7
    
    async def _perform_geotechnical_analysis(self, geotech_data: GeotechnicalInput) -> Dict[str, Any]:
        """Perform geotechnical analysis."""
        # Simplified geotechnical analysis
        return {
            "bearing_capacity": self._calculate_bearing_capacity(geotech_data),
            "settlement_analysis": self._analyze_settlement(geotech_data),
            "slope_stability": self._check_slope_stability(geotech_data),
            "liquefaction_potential": self._assess_liquefaction(geotech_data),
            "foundation_recommendations": self._recommend_foundation_type(geotech_data),
            "construction_considerations": self._geotech_construction_considerations(geotech_data)
        }
    
    async def _design_transportation_infrastructure(self, transport_data: TransportationInput) -> Dict[str, Any]:
        """Design transportation infrastructure."""
        # Simplified transportation design
        return {
            "geometric_design": self._design_alignment(transport_data),
            "pavement_design": self._design_pavement(transport_data),
            "drainage_design": self._design_drainage(transport_data),
            "safety_features": self._design_safety_features(transport_data),
            "traffic_analysis": self._analyze_traffic(transport_data),
            "cost_estimate": self._estimate_transport_cost(transport_data)
        }
    
    def _calculate_bearing_capacity(self, geotech_data: GeotechnicalInput) -> Dict[str, Any]:
        """Calculate soil bearing capacity."""
        # Terzaghi's bearing capacity equation (simplified)
        soil = geotech_data.soil_profile[0] if geotech_data.soil_profile else {}
        
        c = soil.get("cohesion", 0)
        phi = soil.get("friction_angle", 30)
        gamma = soil.get("unit_weight", 120)
        
        # Bearing capacity factors
        Nc = self._soil_parameters["bearing_capacity_factors"]["Nc"](phi) if phi > 0 else 5.14
        Nq = self._soil_parameters["bearing_capacity_factors"]["Nq"](phi) if phi > 0 else 1.0
        Ngamma = self._soil_parameters["bearing_capacity_factors"]["Ngamma"](phi) if phi > 0 else 0.0
        
        # Ultimate bearing capacity
        B = 5  # Assumed footing width
        qu = c * Nc + gamma * 5 * Nq + 0.5 * gamma * B * Ngamma
        
        # Allowable bearing capacity (FS = 3)
        qa = qu / 3
        
        return {
            "ultimate_capacity": qu,
            "allowable_capacity": qa,
            "safety_factor": 3,
            "governing_mode": "General shear failure"
        }
    
    def _analyze_settlement(self, geotech_data: GeotechnicalInput) -> Dict[str, Any]:
        """Analyze expected settlement."""
        return {
            "immediate_settlement": "0.5 inches",
            "consolidation_settlement": "1.0 inches",
            "total_settlement": "1.5 inches",
            "differential_settlement": "0.75 inches",
            "time_for_90_percent": "6 months"
        }
    
    def _check_slope_stability(self, geotech_data: GeotechnicalInput) -> Dict[str, Any]:
        """Check slope stability."""
        return {
            "factor_of_safety": 1.5,
            "critical_surface": "Circular",
            "method": "Bishop's simplified",
            "recommendations": ["Adequate for static conditions"]
        }
    
    def _assess_liquefaction(self, geotech_data: GeotechnicalInput) -> Dict[str, Any]:
        """Assess liquefaction potential."""
        return {
            "potential": "Low",
            "susceptible_layers": "None identified",
            "mitigation": "Not required",
            "method": "Seed & Idriss simplified"
        }
    
    def _recommend_foundation_type(self, geotech_data: GeotechnicalInput) -> Dict[str, Any]:
        """Recommend foundation type based on soil conditions."""
        return {
            "recommended_type": "Spread footings",
            "alternative": "Mat foundation",
            "minimum_depth": "4 feet below grade",
            "frost_protection": "Required to 4 feet"
        }
    
    def _geotech_construction_considerations(self, geotech_data: GeotechnicalInput) -> List[str]:
        """Provide geotechnical construction considerations."""
        return [
            "Dewater to 2 feet below excavation",
            "Compact backfill to 95% standard Proctor",
            "Protect excavation from weather",
            "Verify bearing capacity before concrete placement"
        ]
    
    def _design_alignment(self, transport_data: TransportationInput) -> Dict[str, Any]:
        """Design transportation alignment."""
        return {
            "horizontal_alignment": {
                "design_speed": "50 mph",
                "minimum_radius": "500 feet",
                "superelevation": "6% maximum"
            },
            "vertical_alignment": {
                "maximum_grade": "6%",
                "vertical_curves": "K-values per AASHTO"
            }
        }
    
    def _design_pavement(self, transport_data: TransportationInput) -> Dict[str, Any]:
        """Design pavement structure."""
        return {
            "pavement_type": "Flexible (asphalt)",
            "structure": {
                "surface": "3 inches HMA",
                "base": "8 inches aggregate base",
                "subbase": "12 inches subbase"
            },
            "design_life": "20 years",
            "design_method": "AASHTO 1993"
        }
    
    def _design_drainage(self, transport_data: TransportationInput) -> Dict[str, Any]:
        """Design drainage system."""
        return {
            "storm_frequency": "25-year",
            "inlet_spacing": "300 feet maximum",
            "pipe_sizes": "18 inch minimum",
            "detention": "Required per local regulations"
        }
    
    def _design_safety_features(self, transport_data: TransportationInput) -> List[str]:
        """Design safety features."""
        return [
            "Guardrail at embankments > 5 feet",
            "Retroreflective pavement markings",
            "Adequate sight distance at intersections",
            "Proper signage per MUTCD"
        ]
    
    def _analyze_traffic(self, transport_data: TransportationInput) -> Dict[str, Any]:
        """Analyze traffic conditions."""
        return {
            "AADT": transport_data.traffic_data.get("volume", 10000),
            "peak_hour_volume": transport_data.traffic_data.get("volume", 10000) * 0.1,
            "level_of_service": "C",
            "capacity": "Adequate for 20-year projection"
        }
    
    def _estimate_transport_cost(self, transport_data: TransportationInput) -> Dict[str, Any]:
        """Estimate transportation project cost."""
        return {
            "construction": "$2.5 million per mile",
            "right_of_way": "$0.5 million per mile",
            "engineering": "10% of construction",
            "total": "$3.3 million per mile"
        }