"""
Astronomy Agent - Expert in celestial objects, space phenomena, and astronomical observation
"""

from typing import List, Dict, Any, Optional, Type
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator
import numpy as np

from ....base_agent import (, AgentStatus, PricingModel
    BaseAIAgent, AgentMetadata, AgentCategory, PricingModel,
    AgentStatus, AgentInput, AgentOutput
)
from ....shared.utils.logger import get_logger
from ....services.ai.ai_integration import ai_service

logger = get_logger(__name__)


class AstronomyInput(BaseModel):
    """Input schema for astronomy queries."""
    query: str = Field(..., description="Astronomy-related question or topic")
    observation_type: Optional[str] = Field(None, description="Type of observation (optical, radio, infrared, etc.)")
    celestial_object: Optional[str] = Field(None, description="Specific celestial object of interest")
    coordinates: Optional[Dict[str, float]] = Field(None, description="Celestial coordinates (RA, Dec)")
    time_period: Optional[str] = Field(None, description="Specific time period for observations")
    calculation_params: Optional[Dict[str, Any]] = Field(default={}, description="Parameters for astronomical calculations")


class AstronomyOutput(BaseModel):
    """Output schema for astronomy analysis."""
    analysis: str = Field(..., description="Comprehensive astronomical analysis")
    observations: List[Dict[str, Any]] = Field(..., description="Relevant observations and data")
    calculations: Dict[str, Any] = Field(..., description="Astronomical calculations and results")
    visualizations: List[str] = Field(default=[], description="Descriptions of recommended visualizations")
    recommendations: List[str] = Field(..., description="Observational recommendations")
    resources: List[str] = Field(..., description="Additional resources and references")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence in the analysis")


class AstronomyAgent(BaseAgent):
    """
    Specialized agent for astronomy and space science applications.
    Provides comprehensive astronomical knowledge and analysis capabilities.
    """
    
    def __init__(self):
        metadata = AgentMetadata(
            name="Astronomy Specialist",
            description="""Expert AI agent for celestial objects, space phenomena, and astronomical observation.
            Specializes in stellar astronomy, planetary science, galactic astronomy, cosmology,
            observational astronomy, radio astronomy, space missions, astrodynamics, astrobiology,
            and applied astronomy. Provides detailed analysis, calculations, and educational insights.""",
            category=AgentCategory.PHYSICS,
            version="1.0.0",
            author="LOGOS Astronomy Team",
            pricing_model=PricingModel.PER_USE,
            price_per_use=2.00,
            tags=["astronomy", "space", "cosmology", "astrophysics", "planetary science", "stellar"],
            capabilities=[
                "Stellar classification and evolution analysis",
                "Planetary system dynamics and exoplanet characterization",
                "Galaxy morphology and cosmological calculations",
                "Observational planning and telescope optimization",
                "Space mission trajectory and orbital mechanics",
                "Astrobiology and habitability assessments",
                "Time and coordinate system conversions",
                "Spectroscopic and photometric analysis"
            ],
            limitations=[
                "Cannot access real-time telescope data",
                "Calculations are approximations for educational purposes",
                "Cannot predict unpublished astronomical discoveries"
            ],
            status=AgentStatus.ACTIVE
        )
        super().__init__(metadata)
        
        # Astronomical constants
        self.astronomical_constants = {
            'c': 299792458,  # Speed of light (m/s)
            'G': 6.67430e-11,  # Gravitational constant
            'h': 6.62607015e-34,  # Planck constant
            'k_B': 1.380649e-23,  # Boltzmann constant
            'AU': 1.495978707e11,  # Astronomical unit (m)
            'pc': 3.0857e16,  # Parsec (m)
            'ly': 9.4607e15,  # Light-year (m)
            'M_sun': 1.9885e30,  # Solar mass (kg)
            'R_sun': 6.96e8,  # Solar radius (m)
            'L_sun': 3.828e26,  # Solar luminosity (W)
            'M_earth': 5.972e24,  # Earth mass (kg)
            'R_earth': 6.371e6,  # Earth radius (m)
        }
    
    async def _setup(self):
        """Initialize astronomy agent resources."""
        logger.info("Astronomy agent initialized")
    
    def get_input_schema(self) -> Type[BaseModel]:
        """Get the input schema for this agent."""
        return AstronomyInput
    
    def get_output_schema(self) -> Type[BaseModel]:
        """Get the output schema for this agent."""
        return AstronomyOutput
    
    async def _execute(self, input_data: AgentInput) -> AgentOutput:
        """Execute astronomy analysis using Claude AI."""
        try:
            # Validate input
            astro_input = AstronomyInput(**input_data.input_data)
            
            # Create comprehensive system prompt
            system_prompt = """You are an expert Astronomy AI assistant with comprehensive knowledge of:
- Stellar astronomy: star classification, evolution, binary systems, variable stars
- Planetary science: solar system, exoplanets, planetary atmospheres, moons
- Galactic astronomy: galaxy types, Milky Way structure, galaxy clusters
- Cosmology: Big Bang theory, dark matter/energy, universe structure
- Observational astronomy: telescopes, spectroscopy, photometry
- Radio astronomy: pulsars, quasars, SETI
- Space missions: past, current, and future missions
- Astrodynamics: orbital mechanics, trajectory design
- Astrobiology: habitable zones, biosignatures, extremophiles

Provide detailed, scientifically accurate responses with:
1. Clear explanations of astronomical concepts
2. Relevant calculations when applicable
3. Observational recommendations
4. Current research insights
5. Educational resources

Always cite approximate values and explain uncertainties in astronomical measurements."""
            
            # Build specialized prompt based on query type
            user_prompt = await self._build_astronomy_prompt(astro_input)
            
            # Get AI response
            ai_response = await ai_service.complete(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.7,
                max_tokens=4000
            )
            
            # Perform any requested calculations
            calculations = await self._perform_calculations(astro_input)
            
            # Parse and structure the response
            output = await self._parse_astronomy_response(ai_response, astro_input, calculations)
            
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=True,
                output_data=output.model_dump(),
                tokens_used=1500  # Placeholder
            )
            
        except Exception as e:
            logger.error(f"Astronomy agent execution error: {str(e)}")
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=False,
                error=str(e)
            )
    
    async def _build_astronomy_prompt(self, astro_input: AstronomyInput) -> str:
        """Build a detailed prompt for astronomy queries."""
        prompt_parts = [f"Query: {astro_input.query}"]
        
        if astro_input.celestial_object:
            prompt_parts.append(f"Celestial Object of Interest: {astro_input.celestial_object}")
        
        if astro_input.observation_type:
            prompt_parts.append(f"Observation Type: {astro_input.observation_type}")
        
        if astro_input.coordinates:
            coord_str = f"RA: {astro_input.coordinates.get('ra', 'N/A')}, Dec: {astro_input.coordinates.get('dec', 'N/A')}"
            prompt_parts.append(f"Coordinates: {coord_str}")
        
        if astro_input.time_period:
            prompt_parts.append(f"Time Period: {astro_input.time_period}")
        
        if astro_input.calculation_params:
            prompt_parts.append(f"Calculation Parameters: {astro_input.calculation_params}")
        
        prompt_parts.append("\nPlease provide a comprehensive astronomical analysis including:")
        prompt_parts.append("1. Detailed explanation of the astronomical concepts involved")
        prompt_parts.append("2. Relevant observational data and techniques")
        prompt_parts.append("3. Any calculations or estimations (show your work)")
        prompt_parts.append("4. Practical observational recommendations")
        prompt_parts.append("5. Current research status and future prospects")
        prompt_parts.append("6. Educational resources for further learning")
        
        return "\n".join(prompt_parts)
    
    async def _perform_calculations(self, astro_input: AstronomyInput) -> Dict[str, Any]:
        """Perform astronomical calculations based on input parameters."""
        calculations = {}
        
        if not astro_input.calculation_params:
            return calculations
        
        params = astro_input.calculation_params
        
        # Distance calculations
        if 'parallax' in params:
            parallax_arcsec = params['parallax']
            distance_pc = 1 / parallax_arcsec if parallax_arcsec > 0 else None
            if distance_pc:
                calculations['distance'] = {
                    'parsecs': distance_pc,
                    'light_years': distance_pc * 3.26156,
                    'astronomical_units': distance_pc * 206265,
                    'method': 'parallax'
                }
        
        # Magnitude calculations
        if 'apparent_magnitude' in params and 'distance_pc' in params:
            m = params['apparent_magnitude']
            d = params['distance_pc']
            M = m - 5 * np.log10(d) + 5
            calculations['absolute_magnitude'] = {
                'value': M,
                'distance_modulus': m - M
            }
        
        # Orbital period calculations (Kepler's third law)
        if 'semi_major_axis_au' in params and 'central_mass_solar' in params:
            a = params['semi_major_axis_au']
            M = params['central_mass_solar']
            period_years = np.sqrt(a**3 / M)
            calculations['orbital_period'] = {
                'years': period_years,
                'days': period_years * 365.25,
                'hours': period_years * 365.25 * 24
            }
        
        # Stellar luminosity from temperature and radius
        if 'temperature_k' in params and 'radius_solar' in params:
            T = params['temperature_k']
            R = params['radius_solar']
            # Stefan-Boltzmann law: L = 4πR²σT⁴
            L_solar = (R**2) * ((T/5778)**4)  # 5778K is solar temperature
            calculations['luminosity'] = {
                'solar_luminosities': L_solar,
                'watts': L_solar * self.astronomical_constants['L_sun']
            }
        
        # Redshift to velocity
        if 'redshift' in params:
            z = params['redshift']
            # For small z, v ≈ cz
            if z < 0.1:
                velocity = self.astronomical_constants['c'] * z / 1000  # km/s
            else:
                # Relativistic formula
                velocity = self.astronomical_constants['c'] * ((1 + z)**2 - 1) / ((1 + z)**2 + 1) / 1000
            
            calculations['recession_velocity'] = {
                'km_per_second': velocity,
                'fraction_of_c': velocity * 1000 / self.astronomical_constants['c']
            }
        
        return calculations
    
    async def _parse_astronomy_response(
        self, 
        ai_response: str, 
        astro_input: AstronomyInput,
        calculations: Dict[str, Any]
    ) -> AstronomyOutput:
        """Parse AI response and structure astronomy output."""
        
        # Extract key observations from the response
        observations = []
        
        # Add any performed calculations as observations
        if calculations:
            for calc_type, calc_data in calculations.items():
                observations.append({
                    'type': calc_type,
                    'data': calc_data,
                    'timestamp': datetime.utcnow().isoformat()
                })
        
        # Generate visualization recommendations based on query type
        visualizations = []
        if 'star' in astro_input.query.lower() or 'stellar' in astro_input.query.lower():
            visualizations.append("Hertzsprung-Russell diagram showing stellar evolution")
            visualizations.append("Light curve plot for variable star analysis")
        
        if 'galaxy' in astro_input.query.lower():
            visualizations.append("Galaxy morphology classification chart")
            visualizations.append("Hubble sequence diagram")
        
        if 'planet' in astro_input.query.lower() or 'exoplanet' in astro_input.query.lower():
            visualizations.append("Transit light curve for exoplanet detection")
            visualizations.append("Radial velocity curve")
            visualizations.append("Habitable zone diagram")
        
        # Generate recommendations
        recommendations = [
            "Use appropriate filters for your observation type",
            "Consider atmospheric conditions and light pollution",
            "Plan observations during optimal viewing times",
            "Utilize astronomy software for precise calculations",
            "Join local astronomy clubs for practical experience"
        ]
        
        # Add specific recommendations based on observation type
        if astro_input.observation_type == 'radio':
            recommendations.append("Check for radio frequency interference in your area")
        elif astro_input.observation_type == 'optical':
            recommendations.append("Use appropriate eyepieces for desired magnification")
        
        # Educational resources
        resources = [
            "NASA Astrophysics Data System (ADS) for research papers",
            "SIMBAD astronomical database for object information",
            "Stellarium software for sky simulation",
            "IAU Minor Planet Center for asteroid/comet data",
            "arXiv.org astro-ph section for latest research"
        ]
        
        # Add specific resources based on topic
        if 'exoplanet' in astro_input.query.lower():
            resources.append("NASA Exoplanet Archive")
            resources.append("exoplanets.org database")
        
        # Calculate confidence score based on query specificity
        confidence_score = 0.85
        if astro_input.celestial_object:
            confidence_score += 0.05
        if astro_input.coordinates:
            confidence_score += 0.05
        if calculations:
            confidence_score += 0.05
        
        confidence_score = min(confidence_score, 0.95)
        
        return AstronomyOutput(
            analysis=ai_response,
            observations=observations,
            calculations=calculations,
            visualizations=visualizations,
            recommendations=recommendations,
            resources=resources,
            confidence_score=confidence_score
        )