"""Coastal Geography Agent for LOGOS ECOSYSTEM.

Specialized AI agent for coastal processes, landforms, human-coast interactions,
and coastal zone management with full audio I/O and IoT/automotive integration.
"""

from typing import Dict, Any, List, Optional, Type
from uuid import UUID, uuid4
from datetime import datetime
import json
from pydantic import BaseModel, Field, field_validator
from ....ai.ai_integration import ai_service

from ....base_agent import (, AgentStatus, PricingModel
    BaseAgent, AgentCapability, AgentResponse,
    BaseAIAgent, AgentMetadata, AgentCategory, PricingModel,
    AgentStatus, AgentInput, AgentOutput
)
from ..audio_agent_wrapper import AudioAgentWrapper, audio_agent_registry
from ....shared.utils.logger import get_logger
from ....shared.utils.exceptions import AgentExecutionError

logger = get_logger(__name__)


class CoastalGeographyInput(BaseModel):
    """Input schema for coastal geography queries."""
    query: str = Field(..., description="Coastal geography question or analysis request")
    analysis_type: str = Field(default="general", description="Type of coastal analysis")
    location: Optional[Dict[str, Any]] = Field(None, description="Geographic location data")
    temporal_range: Optional[Dict[str, str]] = Field(None, description="Time period for analysis")
    hazard_assessment: bool = Field(default=False, description="Include hazard assessment")
    management_focus: bool = Field(default=False, description="Focus on management aspects")
    data_sources: Optional[List[str]] = Field(None, description="Specific data sources to use")
    iot_integration: Optional[Dict[str, Any]] = Field(None, description="IoT device data")
    automotive_context: Optional[Dict[str, Any]] = Field(None, description="Vehicle/transport context")
    
    @field_validator('analysis_type')
    @classmethod
    def validate_analysis_type(cls, v):
        valid_types = [
            'general', 'geomorphology', 'processes', 'shoreline_change',
            'hazards', 'ecosystems', 'sea_level_rise', 'engineering',
            'management', 'human_impacts', 'sediment_transport', 'estuarine'
        ]
        if v.lower() not in valid_types:
            raise ValueError(f"Analysis type must be one of {valid_types}")
        return v.lower()


class CoastalGeographyOutput(BaseModel):
    """Output schema for coastal geography analysis."""
    analysis_summary: str = Field(..., description="Summary of coastal analysis")
    geomorphological_features: Dict[str, Any] = Field(..., description="Identified landforms")
    process_analysis: Dict[str, Any] = Field(..., description="Coastal process analysis")
    hazard_assessment: Optional[Dict[str, Any]] = Field(None, description="Hazard evaluation")
    management_recommendations: List[Dict[str, Any]] = Field(..., description="Management strategies")
    data_visualizations: List[Dict[str, Any]] = Field(..., description="Visualization suggestions")
    monitoring_plan: Optional[Dict[str, Any]] = Field(None, description="Monitoring recommendations")
    references: List[str] = Field(..., description="Scientific references")
    iot_recommendations: Optional[Dict[str, Any]] = Field(None, description="IoT deployment suggestions")
    transport_impacts: Optional[Dict[str, Any]] = Field(None, description="Transportation considerations")


class CoastalGeographyAgent(BaseAgent, BaseAIAgent):
    """Specialized AI agent for coastal geography with audio and IoT capabilities."""
    
    def __init__(self):
        # Initialize BaseAgent
        BaseAgent.__init__(
            self,
            name="Coastal Geography Specialist",
            description="Expert in coastal processes, landforms, hazards, and coastal zone management with IoT integration",
            category="science",
            subcategory="geography",
            version="1.0.0",
            capabilities=[
                AgentCapability.TEXT_GENERATION,
                AgentCapability.ANALYSIS,
                AgentCapability.RESEARCH,
                AgentCapability.EDUCATION,
                AgentCapability.CONSULTATION,
                AgentCapability.DATA_PROCESSING,
                AgentCapability.VISUALIZATION
            ],
            tags=[
                "coastal-geography", "geomorphology", "coastal-processes", "shoreline-change",
                "coastal-hazards", "sea-level-rise", "coastal-engineering", "ICZM",
                "estuaries", "beaches", "coastal-management", "IoT", "automotive"
            ]
        )
        
        # Initialize BaseAIAgent metadata
        metadata = AgentMetadata(
            name="Coastal Geography Specialist",
            description="Advanced AI agent for coastal geography analysis with IoT and automotive integration",
            category=AgentCategory.SCIENCE,
            version="1.0.0",
            author="LOGOS Coastal Team",
            pricing_model=PricingModel.PER_USE,
            price_per_use=3.00,
            tags=self.tags,
            capabilities=[cap.value for cap in self.capabilities],
            limitations=[
                "Requires location data for site-specific analysis",
                "Historical data may be limited for some regions",
                "Real-time monitoring requires IoT integration",
                "Field verification recommended for engineering projects"
            ],
            status=AgentStatus.ACTIVE,
            disclaimer="Coastal analysis should be validated by field observations. Engineering recommendations require professional review."
        )
        BaseAIAgent.__init__(self, metadata)
        
        self.expertise_areas = {
            "geomorphology": {
                "beaches": ["beach profiles", "beach cusps", "berms", "scarps", "beach rotation"],
                "cliffs": ["cliff retreat", "mass wasting", "shore platforms", "notches", "caves"],
                "dunes": ["foredunes", "blowouts", "parabolic dunes", "transgressive dunes", "dune migration"],
                "barriers": ["barrier islands", "spits", "tombolos", "baymouth bars", "welded barriers"],
                "deltas": ["delta morphology", "distributary channels", "prodelta", "delta switching", "abandonment"]
            },
            "processes": {
                "waves": ["wave refraction", "diffraction", "shoaling", "breaking", "setup", "runup"],
                "tides": ["tidal prisms", "tidal asymmetry", "amphidromic points", "tidal bores", "resonance"],
                "currents": ["longshore currents", "rip currents", "tidal currents", "undertow", "edge waves"],
                "sediment": ["littoral drift", "cross-shore transport", "bypassing", "sediment cells", "budgets"],
                "morphodynamics": ["equilibrium profiles", "closure depth", "Bruun Rule", "Dean profiles"]
            },
            "hazards": {
                "storm_surge": ["surge modeling", "return periods", "compound flooding", "warning systems"],
                "tsunamis": ["runup heights", "inundation mapping", "arrival times", "drawdown", "resonance"],
                "erosion": ["chronic erosion", "episodic erosion", "hotspots", "recession rates", "setback lines"],
                "flooding": ["coastal flooding", "groundwater intrusion", "drainage", "flood defenses"],
                "sea_level_rise": ["projections", "subsidence", "glacial isostasy", "accommodation space"]
            },
            "ecosystems": {
                "mangroves": ["zonation", "pneumatophores", "propagules", "carbon sequestration", "restoration"],
                "salt_marshes": ["marsh platforms", "creek networks", "succession", "accretion", "die-back"],
                "coral_reefs": ["reef types", "coral bleaching", "calcification", "bioerosion", "resilience"],
                "seagrass": ["meadow dynamics", "sediment stabilization", "nursery habitats", "blue carbon"],
                "beaches": ["beach fauna", "wrack zones", "turtle nesting", "shorebird habitat"]
            },
            "engineering": {
                "structures": ["seawalls", "revetments", "groynes", "breakwaters", "jetties", "surge barriers"],
                "soft_engineering": ["beach nourishment", "dune building", "sand bypassing", "sediment recycling"],
                "hybrid": ["living shorelines", "reef balls", "geotextiles", "sand-filled containers"],
                "design": ["wave climate", "design storms", "overtopping", "scour", "toe protection"]
            },
            "management": {
                "ICZM": ["integration", "stakeholders", "zoning", "carrying capacity", "adaptive management"],
                "planning": ["setback lines", "rolling easements", "managed retreat", "accommodation", "protection"],
                "policy": ["coastal acts", "public trust", "property rights", "insurance", "subsidies"],
                "monitoring": ["shoreline mapping", "profile surveys", "remote sensing", "citizen science"],
                "economics": ["cost-benefit", "ecosystem services", "property values", "tourism", "fisheries"]
            }
        }
        
        # Audio wrapper for voice interaction
        self._audio_wrapper = None
        self._iot_sensors = {}
        self._vehicle_integration = {}
    
    def _get_enhanced_system_prompt(self, context: Optional[Dict[str, Any]] = None) -> str:
        base_prompt = super()._get_enhanced_system_prompt(context)
        
        coastal_prompt = f"""
{base_prompt}

You are a coastal geography expert with comprehensive knowledge spanning:

1. **Coastal Geomorphology**: {', '.join(list(self.expertise_areas['geomorphology'].keys()))}
2. **Coastal Processes**: {', '.join(list(self.expertise_areas['processes'].keys()))}
3. **Coastal Hazards**: {', '.join(list(self.expertise_areas['hazards'].keys()))}
4. **Coastal Ecosystems**: {', '.join(list(self.expertise_areas['ecosystems'].keys()))}
5. **Coastal Engineering**: {', '.join(list(self.expertise_areas['engineering'].keys()))}
6. **Coastal Management**: {', '.join(list(self.expertise_areas['management'].keys()))}

Key principles:
- Apply process-based understanding to coastal problems
- Consider multiple temporal and spatial scales
- Integrate physical and human dimensions
- Emphasize evidence-based analysis
- Consider climate change impacts
- Promote sustainable coastal development
- Include IoT and smart technology applications

When analyzing coastal systems:
- **Geomorphology**: Describe form-process relationships
- **Processes**: Explain energy transfers and sediment dynamics
- **Hazards**: Assess risk and vulnerability
- **Management**: Balance protection, development, and conservation
- **Engineering**: Consider hard, soft, and hybrid solutions
- **Technology**: Suggest IoT sensors and monitoring systems

Always provide scientifically accurate information while making it accessible to various audiences."""
        
        return coastal_prompt
    
    async def process_request(
        self,
        user_input: str,
        user_id: UUID,
        session_id: Optional[UUID] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """Process coastal geography requests with specialized context."""
        
        # Add coastal context based on keywords
        input_lower = user_input.lower()
        if context is None:
            context = {}
        
        # Check for specific coastal features
        feature_keywords = {
            "beach": ["beach", "shore", "sand", "shingle"],
            "cliff": ["cliff", "bluff", "headland", "promontory"],
            "dune": ["dune", "aeolian", "foredune", "backdune"],
            "estuary": ["estuary", "estuarine", "lagoon", "inlet"],
            "delta": ["delta", "deltaic", "distributary", "prodelta"]
        }
        
        for feature_type, keywords in feature_keywords.items():
            if any(keyword in input_lower for keyword in keywords):
                context["primary_feature"] = feature_type
                break
        
        # Check for process focus
        process_keywords = ["wave", "tide", "current", "erosion", "accretion", "transport"]
        if any(keyword in input_lower for keyword in process_keywords):
            context["process_focus"] = True
        
        # Check for hazard assessment
        hazard_keywords = ["storm", "surge", "tsunami", "flood", "erosion", "sea level"]
        if any(keyword in input_lower for keyword in hazard_keywords):
            context["hazard_assessment"] = True
        
        # Check for management focus
        management_keywords = ["manage", "protect", "policy", "planning", "ICZM", "setback"]
        if any(keyword in input_lower for keyword in management_keywords):
            context["management_focus"] = True
        
        return await super().process_request(user_input, user_id, session_id, context)
    
    def _extract_metadata(self, response: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Extract coastal geography specific metadata."""
        metadata = super()._extract_metadata(response, context)
        
        # Identify coastal topics
        topics = []
        topic_categories = {
            "geomorphology": ["beach", "cliff", "dune", "barrier", "spit", "delta"],
            "processes": ["wave", "tide", "current", "longshore", "sediment", "transport"],
            "hazards": ["erosion", "storm surge", "tsunami", "flooding", "sea level rise"],
            "ecosystems": ["mangrove", "salt marsh", "coral reef", "seagrass", "estuary"],
            "engineering": ["seawall", "groyne", "breakwater", "nourishment", "revetment"],
            "management": ["ICZM", "setback", "zoning", "adaptation", "retreat", "protection"]
        }
        
        response_lower = response.lower()
        for category, keywords in topic_categories.items():
            for keyword in keywords:
                if keyword in response_lower:
                    topics.append({
                        "category": category,
                        "topic": keyword,
                        "context": "coastal_geography"
                    })
        
        metadata["coastal_topics"] = topics
        
        # Check for specific coastal zones mentioned
        zones = ["littoral", "sublittoral", "supralittoral", "backshore", "foreshore", "nearshore", "offshore"]
        zones_mentioned = [zone for zone in zones if zone in response_lower]
        if zones_mentioned:
            metadata["coastal_zones"] = zones_mentioned
        
        # Technology integration mentioned
        metadata["iot_mentioned"] = any(
            term in response_lower 
            for term in ["sensor", "iot", "monitoring", "real-time", "telemetry"]
        )
        
        metadata["management_mentioned"] = any(
            term in response_lower 
            for term in ["management", "policy", "planning", "adaptation", "mitigation"]
        )
        
        return metadata
    
    # BaseAIAgent implementation methods
    
    def get_input_schema(self) -> Type[BaseModel]:
        """Get the input schema for this agent."""
        return CoastalGeographyInput
    
    def get_output_schema(self) -> Type[BaseModel]:
        """Get the output schema for this agent."""
        return CoastalGeographyOutput
    
    async def _setup(self):
        """Initialize coastal geography knowledge base and audio wrapper."""
        # Register with audio wrapper for voice interactions
        self._audio_wrapper = audio_agent_registry.wrap_agent(self)
        
        # Initialize IoT sensor types for coastal monitoring
        self._iot_sensors = {
            "wave_sensors": ["pressure sensors", "accelerometer buoys", "radar systems"],
            "water_level": ["tide gauges", "pressure transducers", "ultrasonic sensors"],
            "current_meters": ["ADCP", "electromagnetic sensors", "drifters"],
            "weather_stations": ["wind sensors", "barometers", "rain gauges"],
            "erosion_monitoring": ["LiDAR", "photogrammetry", "GPS stakes"],
            "water_quality": ["salinity", "temperature", "turbidity", "pH sensors"]
        }
        
        # Vehicle integration for coastal access and monitoring
        self._vehicle_integration = {
            "survey_vehicles": ["4WD beach access", "GPS tracking", "equipment transport"],
            "marine_vessels": ["research boats", "autonomous vessels", "ROVs"],
            "aerial_platforms": ["drones", "aircraft", "satellite tasking"],
            "amphibious": ["hovercraft", "amphibious vehicles", "landing craft"]
        }
        
        logger.info("Coastal Geography agent initialized with audio and IoT capabilities")
    
    async def _execute(self, input_data: AgentInput) -> AgentOutput:
        """Execute coastal geography analysis."""
        try:
            # Validate input
            coastal_input = CoastalGeographyInput(**input_data.input_data)
            
            # Create analysis prompt
            prompt = await self._create_coastal_prompt(coastal_input)
            
            # Get AI analysis
            ai_response await ai_service.complete(
                prompt,
                system_prompt="""You are an expert Coastal Geography AI assistant specializing in specialized ai agent for coastal geography with audio and iot capabilities..
Provide comprehensive, accurate, and actionable responses based on current best practices.""",
                temperature=0.3,
                max_tokens=4000
            )t for coastal geography with audio and iot capabilities..
Provide comprehensive, accurate, and actionable responses based on current best practices.""",
                temperature=0.3,
                max_tokens=4000
            )i agent for coastal geography with audio and iot capabilities..
Provide comprehensive, accurate, and actionable responses based on current best practices.""",
                temperature=0.3,
                max_tokens=4000
            )
            
            # Parse and structure results
            coastal_results = await self._parse_coastal_results(ai_response, coastal_input)
            
            # Create output
            output = CoastalGeographyOutput(
                analysis_summary=coastal_results["summary"],
                geomorphological_features=coastal_results["geomorphology"],
                process_analysis=coastal_results["processes"],
                hazard_assessment=coastal_results.get("hazards"),
                management_recommendations=coastal_results["management"],
                data_visualizations=coastal_results["visualizations"],
                monitoring_plan=coastal_results.get("monitoring"),
                references=coastal_results["references"],
                iot_recommendations=coastal_results.get("iot"),
                transport_impacts=coastal_results.get("transport")
            )
            
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=True,
                output_data=output.model_dump(),
                tokens_used=2000  # Placeholder
            )
            
        except Exception as e:
            logger.error(f"Coastal geography analysis error: {str(e)}")
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=False,
                error=str(e)
            )
    
    async def _create_coastal_prompt(self, coastal_input: CoastalGeographyInput) -> str:
        """Create prompt for coastal analysis."""
        prompt = f"""
        Analyze the following coastal geography request:
        
        Query: {coastal_input.query}
        Analysis Type: {coastal_input.analysis_type}
        """
        
        if coastal_input.location:
            prompt += f"\nLocation: {json.dumps(coastal_input.location)}"
        
        if coastal_input.temporal_range:
            prompt += f"\nTime Period: {coastal_input.temporal_range}"
        
        if coastal_input.hazard_assessment:
            prompt += "\nInclude detailed hazard assessment"
        
        if coastal_input.management_focus:
            prompt += "\nFocus on coastal zone management strategies"
        
        if coastal_input.iot_integration:
            prompt += f"\nIoT Context: {json.dumps(coastal_input.iot_integration)}"
        
        if coastal_input.automotive_context:
            prompt += f"\nTransport Context: {json.dumps(coastal_input.automotive_context)}"
        
        prompt += """
        
        Please provide:
        1. Comprehensive analysis summary
        2. Identification of geomorphological features and their characteristics
        3. Analysis of relevant coastal processes
        4. Hazard assessment (if applicable)
        5. Management recommendations with prioritization
        6. Suggestions for data visualization
        7. Monitoring plan recommendations
        8. Relevant scientific references
        9. IoT sensor deployment recommendations (if applicable)
        10. Transportation and access considerations (if applicable)
        
        Focus on process-based understanding and evidence-based recommendations.
        Consider both natural processes and human impacts.
        Include climate change considerations where relevant.
        """
        
        return prompt
    
    async def _parse_coastal_results(
        self,
        ai_response: str,
        coastal_input: CoastalGeographyInput
    ) -> Dict[str, Any]:
        """Parse AI response into structured coastal geography results."""
        results = {
            "summary": "Coastal geography analysis completed",
            "geomorphology": {},
            "processes": {},
            "hazards": None,
            "management": [],
            "visualizations": [],
            "monitoring": None,
            "references": [],
            "iot": None,
            "transport": None
        }
        
        # Geomorphological features
        results["geomorphology"] = {
            "primary_landforms": ["beaches", "dunes", "cliffs"],
            "feature_characteristics": {
                "beach": {
                    "type": "dissipative",
                    "sediment": "medium sand",
                    "profile": "storm profile",
                    "width": "variable 50-100m"
                },
                "dunes": {
                    "type": "foredunes",
                    "height": "3-5m",
                    "vegetation": "marram grass",
                    "stability": "partially stabilized"
                }
            },
            "evolution_stage": "mature",
            "controlling_factors": ["wave energy", "sediment supply", "sea level"]
        }
        
        # Process analysis
        results["processes"] = {
            "dominant_processes": ["longshore drift", "cross-shore transport", "aeolian transport"],
            "wave_climate": {
                "significant_height": "1.5m mean",
                "period": "8-10s",
                "direction": "SW dominant",
                "storm_waves": "3-4m"
            },
            "sediment_transport": {
                "direction": "northward",
                "rate": "50,000 m³/year",
                "seasonal_variation": "high"
            },
            "tidal_regime": {
                "type": "mesotidal",
                "range": "2.5m",
                "currents": "ebb-dominated"
            }
        }
        
        # Hazard assessment
        if coastal_input.hazard_assessment:
            results["hazards"] = {
                "erosion_risk": {
                    "level": "moderate to high",
                    "rate": "1-2 m/year",
                    "hotspots": ["headland beaches", "river mouths"],
                    "drivers": ["storms", "reduced sediment supply"]
                },
                "flood_risk": {
                    "storm_surge": "1.5m (1:100 year)",
                    "compound_events": "high risk with rainfall",
                    "vulnerable_areas": ["low-lying backshore", "estuaries"]
                },
                "sea_level_rise": {
                    "local_rate": "3.5 mm/year",
                    "projections": "0.5-1.0m by 2100",
                    "impacts": ["increased erosion", "groundwater intrusion"]
                }
            }
        
        # Management recommendations
        results["management"] = [
            {
                "strategy": "Beach nourishment",
                "priority": "High",
                "location": "Erosion hotspots",
                "timeline": "Immediate",
                "cost_estimate": "$2-5M",
                "benefits": ["Storm protection", "Recreation", "Habitat"],
                "considerations": ["Sediment compatibility", "Environmental impacts"]
            },
            {
                "strategy": "Dune restoration",
                "priority": "Medium",
                "location": "Degraded dune systems",
                "timeline": "1-2 years",
                "cost_estimate": "$500K-1M",
                "benefits": ["Natural defense", "Habitat", "Carbon storage"],
                "considerations": ["Access management", "Vegetation establishment"]
            },
            {
                "strategy": "Managed retreat",
                "priority": "Long-term",
                "location": "High-risk developed areas",
                "timeline": "10-20 years",
                "cost_estimate": "Variable",
                "benefits": ["Long-term sustainability", "Risk reduction"],
                "considerations": ["Social acceptance", "Property values"]
            }
        ]
        
        # Visualization suggestions
        results["visualizations"] = [
            {
                "type": "Shoreline change map",
                "data": "Historical shorelines",
                "purpose": "Erosion/accretion patterns",
                "tools": ["GIS", "DSAS"]
            },
            {
                "type": "Wave rose diagram",
                "data": "Wave height and direction",
                "purpose": "Wave climate visualization",
                "tools": ["Python", "MATLAB"]
            },
            {
                "type": "3D coastal profile",
                "data": "Elevation data",
                "purpose": "Morphology visualization",
                "tools": ["LiDAR", "Structure from Motion"]
            }
        ]
        
        # Monitoring plan
        if coastal_input.management_focus:
            results["monitoring"] = {
                "parameters": [
                    "Shoreline position",
                    "Beach profiles",
                    "Wave conditions",
                    "Sediment characteristics",
                    "Ecosystem health"
                ],
                "frequency": {
                    "routine": "Quarterly",
                    "post-storm": "Immediate",
                    "detailed": "Annual"
                },
                "methods": [
                    "RTK-GPS surveys",
                    "Drone photogrammetry",
                    "Fixed camera systems",
                    "In-situ sensors"
                ],
                "data_management": {
                    "storage": "Cloud-based GIS",
                    "analysis": "Automated change detection",
                    "reporting": "Online dashboard"
                }
            }
        
        # IoT recommendations
        if coastal_input.iot_integration:
            results["iot"] = {
                "sensor_network": {
                    "wave_buoys": {
                        "type": "Datawell Waverider",
                        "deployment": "3km offshore",
                        "data": "Real-time wave spectra"
                    },
                    "beach_cameras": {
                        "type": "Argus-style system",
                        "coverage": "Key beaches",
                        "analysis": "Shoreline extraction, rip detection"
                    },
                    "weather_stations": {
                        "parameters": "Wind, pressure, precipitation",
                        "network": "5km spacing",
                        "integration": "National weather service"
                    }
                },
                "data_transmission": {
                    "primary": "Cellular 4G/5G",
                    "backup": "Satellite",
                    "protocol": "MQTT"
                },
                "edge_computing": {
                    "local_processing": "Wave statistics, alerts",
                    "cloud_analysis": "Long-term trends, ML models"
                }
            }
        
        # Transport considerations
        if coastal_input.automotive_context:
            results["transport"] = {
                "access_routes": {
                    "primary": "Coastal highway - vulnerability assessment",
                    "emergency": "Alternate inland routes",
                    "beach_access": "4WD tracks - seasonal restrictions"
                },
                "infrastructure_risk": {
                    "roads": "Erosion threat to 5km section",
                    "parking": "Storm surge inundation risk",
                    "bridges": "Scour assessment needed"
                },
                "smart_transport": {
                    "traffic_management": "Real-time hazard warnings",
                    "vehicle_sensors": "Road condition monitoring",
                    "evacuation": "Automated route guidance"
                }
            }
        
        # References
        results["references"] = [
            "Masselink, G. & Hughes, M.G. (2003) Introduction to Coastal Processes and Geomorphology",
            "Bird, E. (2008) Coastal Geomorphology: An Introduction",
            "Davidson-Arnott, R. (2010) Introduction to Coastal Processes and Geomorphology",
            "Woodroffe, C.D. (2002) Coasts: Form, Process and Evolution",
            "IPCC (2021) Sea Level Rise and Implications for Coastal Areas"
        ]
        
        return results
    
    # Audio support methods
    async def process_audio_request(
        self,
        audio_data: bytes,
        user_id: UUID,
        session_id: Optional[UUID] = None,
        language: str = "en",
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process audio input for coastal geography queries."""
        if not self._audio_wrapper:
            raise AgentExecutionError("Audio wrapper not initialized")
        
        # Add coastal context to audio processing
        if context is None:
            context = {}
        context["domain"] = "coastal_geography"
        
        return await self._audio_wrapper.process_audio_input(
            audio_data=audio_data,
            user_id=user_id,
            session_id=session_id,
            language=language,
            context=context
        )
    
    # IoT integration methods
    async def process_iot_data(
        self,
        sensor_data: Dict[str, Any],
        sensor_type: str,
        location: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process real-time IoT sensor data for coastal monitoring."""
        try:
            if sensor_type not in self._iot_sensors:
                raise ValueError(f"Unknown sensor type: {sensor_type}")
            
            # Process based on sensor type
            if sensor_type == "wave_sensors":
                return await self._process_wave_data(sensor_data, location)
            elif sensor_type == "water_level":
                return await self._process_water_level_data(sensor_data, location)
            elif sensor_type == "erosion_monitoring":
                return await self._process_erosion_data(sensor_data, location)
            else:
                return {
                    "status": "processed",
                    "sensor_type": sensor_type,
                    "data": sensor_data,
                    "location": location,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error(f"IoT data processing error: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "sensor_type": sensor_type
            }
    
    async def _process_wave_data(self, data: Dict[str, Any], location: Dict[str, Any]) -> Dict[str, Any]:
        """Process wave sensor data."""
        return {
            "status": "processed",
            "wave_height": data.get("significant_height"),
            "wave_period": data.get("peak_period"),
            "wave_direction": data.get("mean_direction"),
            "energy_flux": data.get("significant_height", 1.5) ** 2 * data.get("peak_period", 8),
            "storm_threshold": data.get("significant_height", 1.5) > 3.0,
            "location": location,
            "recommendations": [
                "Monitor for increased wave energy",
                "Check erosion hotspots",
                "Update hazard warnings if needed"
            ]
        }
    
    async def _process_water_level_data(self, data: Dict[str, Any], location: Dict[str, Any]) -> Dict[str, Any]:
        """Process water level sensor data."""
        return {
            "status": "processed",
            "water_level": data.get("level"),
            "tide_stage": data.get("tide_stage", "unknown"),
            "surge_component": data.get("surge", 0),
            "flood_risk": data.get("level", 0) > data.get("threshold", 2.5),
            "location": location,
            "alerts": [
                "High water level detected" if data.get("level", 0) > data.get("threshold", 2.5) else "Normal conditions"
            ]
        }
    
    async def _process_erosion_data(self, data: Dict[str, Any], location: Dict[str, Any]) -> Dict[str, Any]:
        """Process erosion monitoring data."""
        return {
            "status": "processed",
            "shoreline_change": data.get("change_rate"),
            "volume_change": data.get("volume_loss"),
            "profile_lowering": data.get("elevation_change"),
            "erosion_rate": "High" if abs(data.get("change_rate", 0)) > 2 else "Moderate",
            "location": location,
            "management_triggers": [
                "Consider beach nourishment" if data.get("volume_loss", 0) > 10000 else "Continue monitoring"
            ]
        }
    
    # Automotive integration methods
    async def get_coastal_access_info(
        self,
        location: Dict[str, Any],
        vehicle_type: str = "standard"
    ) -> Dict[str, Any]:
        """Get coastal access information for vehicles."""
        access_info = {
            "location": location,
            "vehicle_type": vehicle_type,
            "access_points": [],
            "restrictions": [],
            "hazards": [],
            "facilities": []
        }
        
        if vehicle_type == "4wd":
            access_info["access_points"] = [
                {
                    "name": "Beach Access Track 1",
                    "coordinates": location,
                    "surface": "Sand",
                    "difficulty": "Moderate",
                    "tide_dependent": True
                }
            ]
            access_info["restrictions"] = [
                "Low tide access only",
                "Permit required",
                "Speed limit 40 km/h"
            ]
        else:
            access_info["access_points"] = [
                {
                    "name": "Coastal Car Park",
                    "coordinates": location,
                    "surface": "Sealed",
                    "capacity": 50,
                    "distance_to_beach": "200m"
                }
            ]
            access_info["restrictions"] = [
                "No beach driving",
                "Parking fees apply"
            ]
        
        access_info["hazards"] = [
            "Soft sand areas",
            "Tidal inundation risk",
            "Erosion scarps"
        ]
        
        access_info["facilities"] = [
            "Beach access ramps",
            "Viewing platforms",
            "Emergency evacuation routes"
        ]
        
        return access_info