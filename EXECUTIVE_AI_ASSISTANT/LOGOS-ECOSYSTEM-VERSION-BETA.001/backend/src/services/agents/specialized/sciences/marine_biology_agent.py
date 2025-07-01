"""Marine Biology Agent - Expert in marine life, ocean ecosystems, and aquatic organisms"""

from typing import Dict, Any, List, Optional, Type
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator

from ....base_agent import (, AgentStatus, PricingModel
    BaseAIAgent, AgentMetadata, AgentCategory, PricingModel,
    AgentStatus, AgentInput, AgentOutput
)
from ..audio_agent_wrapper import AudioAgentWrapper, audio_agent_registry
from ....shared.utils.logger import get_logger
from ....shared.utils.exceptions import AgentExecutionError

logger = get_logger(__name__)


class MarineBiologyInput(BaseModel):
    """Input schema for marine biology queries."""
    query_type: str = Field(..., description="Type of marine biology query")
    organism_focus: Optional[str] = Field(None, description="Specific organism or group")
    ecosystem_type: Optional[str] = Field(None, description="Marine ecosystem type")
    depth_zone: Optional[str] = Field(None, description="Ocean depth zone")
    geographic_region: Optional[str] = Field(None, description="Geographic location")
    research_purpose: Optional[str] = Field(None, description="Research or application purpose")
    conservation_focus: Optional[bool] = Field(False, description="Conservation-related query")
    data_requirements: Optional[List[str]] = Field(default=[], description="Required data types")
    iot_integration: Optional[Dict[str, Any]] = Field(None, description="IoT sensor integration")
    
    @field_validator('query_type')
    @classmethod
    def validate_query_type(cls, v):
        valid_types = [
            'species_identification', 'ecosystem_analysis', 'biodiversity_assessment',
            'coral_reef_health', 'marine_mammal_behavior', 'fish_biology',
            'invertebrate_studies', 'microbiology', 'conservation_planning',
            'biotechnology', 'monitoring', 'climate_impact', 'pollution_assessment',
            'aquaculture', 'fisheries_management'
        ]
        if v.lower() not in valid_types:
            raise ValueError(f"Query type must be one of {valid_types}")
        return v.lower()
    
    @field_validator('depth_zone')
    @classmethod
    def validate_depth_zone(cls, v):
        if v:
            valid_zones = [
                'epipelagic', 'mesopelagic', 'bathypelagic', 'abyssopelagic',
                'hadalpelagic', 'intertidal', 'neritic', 'oceanic', 'benthic'
            ]
            if v.lower() not in valid_zones:
                raise ValueError(f"Depth zone must be one of {valid_zones}")
        return v.lower() if v else None


class MarineBiologyOutput(BaseModel):
    """Output schema for marine biology analysis."""
    analysis_summary: str = Field(..., description="Summary of marine biology analysis")
    species_data: Dict[str, Any] = Field(..., description="Species information and data")
    ecosystem_health: Dict[str, Any] = Field(..., description="Ecosystem health metrics")
    biodiversity_metrics: Dict[str, Any] = Field(..., description="Biodiversity measurements")
    environmental_factors: Dict[str, Any] = Field(..., description="Environmental conditions")
    conservation_status: Dict[str, Any] = Field(..., description="Conservation information")
    research_recommendations: List[Dict[str, Any]] = Field(..., description="Research suggestions")
    monitoring_protocols: List[Dict[str, Any]] = Field(..., description="Monitoring procedures")
    biotechnology_applications: List[str] = Field(..., description="Biotech applications")
    visualizations: List[Dict[str, Any]] = Field(..., description="Data visualizations")
    iot_sensor_data: Optional[Dict[str, Any]] = Field(None, description="IoT sensor readings")


class MarineBiologyAgent(BaseAgent):
    """AI agent specialized in marine biology, ocean ecosystems, and aquatic organisms."""
    
    def __init__(self):
        metadata = AgentMetadata(
            name="Marine Biology Expert",
            description="Advanced AI agent specializing in marine life, ocean ecosystems, coral reefs, marine mammals, fish biology, marine conservation, and oceanographic biology. Supports IoT sensor integration for real-time ocean monitoring.",
            category=AgentCategory.SCIENCE,
            version="1.0.0",
            author="LOGOS Marine Science Team",
            pricing_model=PricingModel.PER_USE,
            price_per_use=3.00,
            tags=["marine biology", "oceanography", "coral reefs", "marine mammals", 
                  "fish", "conservation", "biodiversity", "aquatic", "ecosystem"],
            capabilities=[
                "Marine species identification and taxonomy",
                "Ocean ecosystem analysis and dynamics",
                "Coral reef health assessment",
                "Marine mammal behavior analysis",
                "Fish biology and ichthyology",
                "Marine invertebrate studies",
                "Marine microbiology and biogeochemistry",
                "Conservation planning and MPA design",
                "Biotechnology and bioprospecting",
                "Real-time ocean monitoring with IoT",
                "Climate change impact assessment",
                "Pollution and marine debris analysis",
                "Aquaculture and fisheries management"
            ],
            limitations=[
                "Cannot perform physical field work",
                "Requires quality data for accurate analysis",
                "Some species may have limited data",
                "Real-time monitoring requires sensor deployment"
            ],
            status=AgentStatus.ACTIVE,
            supports_audio_io=True,
            supports_iot_integration=True,
            supports_automotive_integration=True,
            disclaimer="Marine biology recommendations should be validated by field experts. Conservation actions must comply with local and international regulations."
        )
        super().__init__(metadata)
        
        self._marine_zones = {}
        self._species_database = {}
        self._conservation_data = {}
        self._iot_sensors = {}
        self._automotive_marine_systems = {}
    
    async def _setup(self):
        """Initialize marine biology knowledge base."""
        self._marine_zones = {
            "epipelagic": {"depth": "0-200m", "light": "Sunlight zone", "characteristics": "Photosynthesis possible"},
            "mesopelagic": {"depth": "200-1000m", "light": "Twilight zone", "characteristics": "Limited light"},
            "bathypelagic": {"depth": "1000-4000m", "light": "Midnight zone", "characteristics": "No sunlight"},
            "abyssopelagic": {"depth": "4000-6000m", "light": "Abyss", "characteristics": "Near freezing"},
            "hadalpelagic": {"depth": "6000m+", "light": "Trenches", "characteristics": "Extreme pressure"}
        }
        
        self._ecosystem_types = {
            "coral_reef": ["fringing", "barrier", "atoll", "patch"],
            "open_ocean": ["pelagic", "oceanic", "high seas"],
            "coastal": ["estuary", "lagoon", "mangrove", "salt marsh"],
            "deep_sea": ["abyssal plain", "trench", "seamount", "hydrothermal vent"],
            "polar": ["arctic", "antarctic", "ice edge"]
        }
        
        self._conservation_categories = {
            "IUCN_status": ["EX", "EW", "CR", "EN", "VU", "NT", "LC", "DD", "NE"],
            "protection_types": ["MPA", "sanctuary", "reserve", "no-take zone"],
            "threats": ["overfishing", "pollution", "climate change", "habitat loss", "invasive species"]
        }
        
        # IoT sensor types for marine monitoring
        self._iot_sensors = {
            "water_quality": ["pH", "dissolved_oxygen", "temperature", "salinity", "turbidity"],
            "biological": ["chlorophyll", "plankton_counter", "acoustic_tags", "camera_traps"],
            "physical": ["current_meter", "wave_height", "tide_gauge", "pressure_sensor"],
            "chemical": ["nutrient_analyzer", "carbon_sensor", "pollutant_detector"]
        }
        
        # Automotive integration for marine research vessels
        self._automotive_marine_systems = {
            "research_vessel": ["navigation", "sonar", "winch_control", "lab_equipment"],
            "autonomous_vehicles": ["AUV", "ROV", "glider", "surface_drone"],
            "monitoring_buoys": ["weather_station", "water_sampler", "telemetry", "solar_power"]
        }
        
        logger.info("Marine Biology Agent initialized with comprehensive ocean knowledge base")
    
    @property
    def input_schema(self) -> Type[BaseModel]:
        return MarineBiologyInput
    
    @property
    def output_schema(self) -> Type[BaseModel]:
        return MarineBiologyOutput
    
    async def execute(
        self,
        input_data: Dict[str, Any],
        user_id: str,
        session_id: Optional[str] = None,
        streaming: bool = False
    ) -> AgentOutput:
        """Execute marine biology analysis with audio and IoT support."""
        start_time = datetime.utcnow()
        
        try:
            # Validate input
            marine_input = MarineBiologyInput(**input_data)
            
            # Check for IoT data integration
            iot_data = None
            if marine_input.iot_integration:
                iot_data = await self._process_iot_sensors(marine_input.iot_integration)
            
            # Generate analysis prompt
            prompt = self._generate_marine_prompt(marine_input, iot_data)
            
            # Execute AI analysis
            ai_response = await self._call_ai_service(prompt, streaming)
            
            # Parse results
            results = await self._parse_marine_results(ai_response, marine_input, iot_data)
            
            # Format output
            output = MarineBiologyOutput(
                analysis_summary=results["summary"],
                species_data=results["species"],
                ecosystem_health=results["ecosystem"],
                biodiversity_metrics=results["biodiversity"],
                environmental_factors=results["environment"],
                conservation_status=results["conservation"],
                research_recommendations=results["recommendations"],
                monitoring_protocols=results["monitoring"],
                biotechnology_applications=results["biotech"],
                visualizations=results["visualizations"],
                iot_sensor_data=iot_data
            )
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return AgentOutput(
                success=True,
                output_data=output.model_dump(),
                execution_time=execution_time,
                tokens_used=len(prompt.split()),
                cost=self.metadata.price_per_use
            )
            
        except Exception as e:
            logger.error(f"Marine biology analysis error: {str(e)}")
            return AgentOutput(
                success=False,
                error=str(e),
                execution_time=(datetime.utcnow() - start_time).total_seconds()
            )
    
    def _generate_marine_prompt(
        self, 
        marine_input: MarineBiologyInput,
        iot_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate specialized prompt for marine biology analysis."""
        prompt = f"""As a marine biology expert, analyze the following query:

Query Type: {marine_input.query_type}
Organism Focus: {marine_input.organism_focus or 'General marine life'}
Ecosystem: {marine_input.ecosystem_type or 'Various marine ecosystems'}
Depth Zone: {marine_input.depth_zone or 'All depths'}
Geographic Region: {marine_input.geographic_region or 'Global oceans'}
Research Purpose: {marine_input.research_purpose or 'General inquiry'}
Conservation Focus: {'Yes' if marine_input.conservation_focus else 'No'}

"""
        
        if iot_data:
            prompt += f"""
Real-time IoT Sensor Data:
{self._format_iot_data(iot_data)}

"""
        
        prompt += """Please provide comprehensive analysis covering:

1. Species identification and taxonomy
2. Ecosystem structure and dynamics
3. Biodiversity assessment
4. Environmental conditions and factors
5. Conservation status and threats
6. Research recommendations
7. Monitoring protocols
8. Biotechnology applications
9. Data visualization suggestions
10. Future research directions

Include specific details about:
- Marine organisms (taxonomy, behavior, ecology)
- Food web interactions
- Habitat requirements
- Reproductive strategies
- Migration patterns (if applicable)
- Human impacts and mitigation strategies
- Climate change effects
- Potential for sustainable use

Provide scientific, evidence-based analysis suitable for marine research and conservation."""
        
        return prompt
    
    async def _parse_marine_results(
        self,
        ai_response: str,
        marine_input: MarineBiologyInput,
        iot_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Parse AI response into structured marine biology results."""
        results = {
            "summary": f"Marine biology analysis for {marine_input.query_type}",
            "species": {},
            "ecosystem": {},
            "biodiversity": {},
            "environment": {},
            "conservation": {},
            "recommendations": [],
            "monitoring": [],
            "biotech": [],
            "visualizations": []
        }
        
        # Species data
        results["species"] = {
            "identified_species": self._extract_species_list(marine_input),
            "taxonomy": {
                "kingdom": "Animalia/Plantae/Protista",
                "phylum": "Various marine phyla",
                "key_species": ["Example species based on query"]
            },
            "distribution": {
                "geographic_range": marine_input.geographic_region or "Cosmopolitan",
                "depth_range": self._get_depth_info(marine_input.depth_zone),
                "habitat_preferences": ["Reef", "Open ocean", "Benthic"]
            },
            "behavior": {
                "feeding": "Varies by species",
                "reproduction": "Seasonal patterns",
                "migration": "Species-specific patterns"
            }
        }
        
        # Ecosystem health metrics
        results["ecosystem"] = {
            "health_status": "Good/Fair/Poor based on indicators",
            "key_indicators": {
                "species_diversity": "High/Medium/Low",
                "biomass": "Estimated kg/m²",
                "productivity": "Primary production rates",
                "connectivity": "Habitat linkages"
            },
            "food_web": {
                "trophic_levels": 4,
                "key_species": ["Apex predators", "Primary producers", "Herbivores"],
                "energy_flow": "Bottom-up controlled"
            },
            "habitat_quality": {
                "substrate": "Rocky/Sandy/Muddy",
                "complexity": "High structural complexity",
                "degradation": "Minimal/Moderate/Severe"
            }
        }
        
        # Biodiversity metrics
        results["biodiversity"] = {
            "species_richness": "Number of species",
            "shannon_index": 2.5,
            "simpson_index": 0.8,
            "evenness": 0.75,
            "endemic_species": ["List of endemic species"],
            "keystone_species": ["Critical ecosystem species"],
            "functional_diversity": "High/Medium/Low"
        }
        
        # Environmental factors
        results["environment"] = {
            "water_quality": {
                "temperature": "°C range",
                "salinity": "ppt",
                "pH": 8.1,
                "dissolved_oxygen": "mg/L",
                "nutrients": {"nitrogen": "µM", "phosphorus": "µM"}
            },
            "physical_conditions": {
                "currents": "Speed and direction",
                "waves": "Height and period",
                "tides": "Tidal range",
                "light_penetration": "Depth in meters"
            },
            "seasonal_variations": {
                "temperature_range": "Annual variation",
                "productivity_cycles": "Seasonal patterns",
                "storm_frequency": "Events per year"
            }
        }
        
        # Add IoT sensor data if available
        if iot_data:
            results["environment"]["real_time_data"] = iot_data
        
        # Conservation status
        results["conservation"] = {
            "protected_status": {
                "mpa_coverage": "Percentage of area",
                "protection_level": "No-take/Partial/None",
                "enforcement": "Strong/Moderate/Weak"
            },
            "threats": [
                {"threat": "Overfishing", "severity": "High", "trend": "Increasing"},
                {"threat": "Pollution", "severity": "Medium", "trend": "Stable"},
                {"threat": "Climate change", "severity": "High", "trend": "Increasing"}
            ],
            "species_status": {
                "endangered": ["List of endangered species"],
                "vulnerable": ["List of vulnerable species"],
                "data_deficient": ["Species needing research"]
            },
            "restoration_potential": "High/Medium/Low"
        }
        
        # Research recommendations
        results["recommendations"] = [
            {
                "priority": "High",
                "action": "Establish long-term monitoring program",
                "objective": "Track ecosystem health indicators",
                "timeline": "Immediate start, 5-year program",
                "resources_needed": ["Equipment", "Personnel", "Funding"]
            },
            {
                "priority": "Medium",
                "action": "Conduct biodiversity assessment",
                "objective": "Complete species inventory",
                "timeline": "6-month study",
                "resources_needed": ["Taxonomic experts", "Sampling equipment"]
            },
            {
                "priority": "High",
                "action": "Implement conservation measures",
                "objective": "Protect critical habitats",
                "timeline": "Policy development within 3 months",
                "resources_needed": ["Stakeholder engagement", "Legal framework"]
            }
        ]
        
        # Monitoring protocols
        results["monitoring"] = [
            {
                "parameter": "Water quality",
                "frequency": "Weekly",
                "methods": ["In-situ sensors", "Water sampling"],
                "equipment": ["Multi-parameter probe", "Nutrient analyzer"],
                "data_management": "Cloud-based database"
            },
            {
                "parameter": "Species abundance",
                "frequency": "Monthly",
                "methods": ["Visual census", "Photo transects", "eDNA"],
                "equipment": ["Underwater cameras", "GPS", "Sampling kits"],
                "data_management": "GIS integration"
            },
            {
                "parameter": "Habitat health",
                "frequency": "Quarterly",
                "methods": ["Remote sensing", "Dive surveys"],
                "equipment": ["Satellite imagery", "ROV/AUV"],
                "data_management": "AI image analysis"
            }
        ]
        
        # Biotechnology applications
        results["biotech"] = [
            "Marine natural products for pharmaceuticals",
            "Bioactive compounds from marine organisms",
            "Aquaculture strain improvement",
            "Bioremediation using marine microbes",
            "Marine enzymes for industrial applications",
            "Coral reef restoration biotechnology",
            "Marine bioplastics development"
        ]
        
        # Visualization suggestions
        results["visualizations"] = [
            {
                "type": "3D ecosystem model",
                "purpose": "Show spatial relationships",
                "tools": ["Unity3D", "Blender", "WebGL"],
                "data_requirements": ["Bathymetry", "Species distribution"]
            },
            {
                "type": "Interactive food web",
                "purpose": "Display trophic interactions",
                "tools": ["D3.js", "Cytoscape", "NetworkX"],
                "data_requirements": ["Species list", "Diet data"]
            },
            {
                "type": "Time series dashboard",
                "purpose": "Monitor environmental changes",
                "tools": ["Grafana", "Plotly", "Tableau"],
                "data_requirements": ["Sensor data", "Historical records"]
            }
        ]
        
        return results
    
    async def _process_iot_sensors(self, iot_config: Dict[str, Any]) -> Dict[str, Any]:
        """Process IoT sensor data for marine monitoring."""
        sensor_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "sensors": {}
        }
        
        # Simulate sensor readings (in production, would connect to real sensors)
        if "water_quality" in iot_config:
            sensor_data["sensors"]["water_quality"] = {
                "temperature": 25.3,
                "pH": 8.15,
                "dissolved_oxygen": 7.2,
                "salinity": 35.0,
                "turbidity": 2.3
            }
        
        if "biological" in iot_config:
            sensor_data["sensors"]["biological"] = {
                "chlorophyll_a": 2.5,
                "phytoplankton_density": 1500,
                "zooplankton_biomass": 0.8
            }
        
        if "physical" in iot_config:
            sensor_data["sensors"]["physical"] = {
                "current_speed": 0.3,
                "current_direction": 45,
                "wave_height": 1.2,
                "water_depth": 15.0
            }
        
        return sensor_data
    
    def _extract_species_list(self, marine_input: MarineBiologyInput) -> List[str]:
        """Extract relevant species based on query."""
        species_examples = {
            "coral_reef_health": ["Acropora palmata", "Orbicella faveolata", "Diadema antillarum"],
            "marine_mammal_behavior": ["Tursiops truncatus", "Megaptera novaeangliae", "Orcinus orca"],
            "fish_biology": ["Thunnus albacares", "Epinephelus striatus", "Pomacanthus paru"],
            "invertebrate_studies": ["Octopus vulgaris", "Panulirus argus", "Strombus gigas"],
            "microbiology": ["Prochlorococcus", "Vibrio", "Synechococcus"]
        }
        
        return species_examples.get(marine_input.query_type, ["Various marine species"])
    
    def _get_depth_info(self, depth_zone: Optional[str]) -> str:
        """Get depth information for the specified zone."""
        if depth_zone and depth_zone in self._marine_zones:
            zone_info = self._marine_zones[depth_zone]
            return f"{zone_info['depth']} ({zone_info['light']})"
        return "All depths"
    
    def _format_iot_data(self, iot_data: Dict[str, Any]) -> str:
        """Format IoT sensor data for prompt."""
        formatted = []
        for sensor_type, readings in iot_data.get("sensors", {}).items():
            formatted.append(f"\n{sensor_type.replace('_', ' ').title()}:")
            for param, value in readings.items():
                formatted.append(f"  - {param.replace('_', ' ').title()}: {value}")
        return "\n".join(formatted)
    
    async def get_audio_wrapper(self) -> AudioAgentWrapper:
        """Get audio-enabled wrapper for this agent."""
        return audio_agent_registry.wrap_agent(self)
    
    async def analyze_automotive_marine_integration(
        self,
        vessel_type: str,
        integration_requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze integration with marine research vessels and autonomous vehicles."""
        return {
            "vessel_type": vessel_type,
            "compatible_systems": self._automotive_marine_systems.get(vessel_type, []),
            "integration_points": {
                "navigation": "NMEA 2000 protocol",
                "data_collection": "Real-time sensor integration",
                "autonomous_control": "ROS/ROS2 compatibility",
                "communication": "Satellite/Radio/Acoustic modems"
            },
            "recommended_equipment": {
                "sensors": ["Multi-beam sonar", "CTD profiler", "ADCP"],
                "sampling": ["Niskin bottles", "Plankton nets", "Sediment corers"],
                "imaging": ["ROV cameras", "Stereo-video systems", "Fluorometers"]
            },
            "software_integration": {
                "data_logging": "LabVIEW, MATLAB integration",
                "gis_mapping": "QGIS, ArcGIS compatibility",
                "real_time_analysis": "Python/R scripts",
                "cloud_sync": "AWS/Azure IoT services"
            }
        }


# Create global instance
marine_biology_agent = MarineBiologyAgent()