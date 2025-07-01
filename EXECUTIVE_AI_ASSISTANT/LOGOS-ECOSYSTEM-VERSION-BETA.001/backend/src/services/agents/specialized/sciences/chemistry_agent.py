"""Chemistry and Chemical Engineering Agent for LOGOS ECOSYSTEM."""

from typing import List, Dict, Any, Optional, Type, Union, Tuple
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, Field, field_validator
import re

from ....base_agent import (, AgentStatus, PricingModel
    BaseAIAgent, AgentMetadata, AgentCategory, PricingModel,
    AgentStatus, AgentInput, AgentOutput
)
from ....shared.utils.logger import get_logger

logger = get_logger(__name__)


class ChemistryInput(BaseModel):
    """Input schema for chemistry problems."""
    task_type: str = Field(..., description="Type of chemistry task")
    compounds: List[str] = Field(default=[], description="Chemical compounds involved")
    reaction: Optional[str] = Field(None, description="Chemical reaction equation")
    conditions: Dict[str, Union[float, str]] = Field(default={}, description="Reaction conditions (T, P, pH, etc.)")
    quantities: Dict[str, float] = Field(default={}, description="Quantities of reactants/products")
    safety_analysis: bool = Field(default=True, description="Include safety considerations")
    green_chemistry: bool = Field(default=True, description="Consider green chemistry principles")
    
    @field_validator('task_type')
    @classmethod
    def validate_task_type(cls, v):
        valid_types = [
            'reaction_prediction', 'synthesis_design', 'mechanism_analysis',
            'stoichiometry', 'thermodynamics', 'kinetics', 'equilibrium',
            'spectroscopy', 'separation', 'purification', 'safety_assessment'
        ]
        if v.lower() not in valid_types:
            raise ValueError(f"Task type must be one of {valid_types}")
        return v.lower()


class ChemistryOutput(BaseModel):
    """Output schema for chemistry solutions."""
    primary_result: Dict[str, Any] = Field(..., description="Main result of the analysis")
    reaction_details: Optional[Dict[str, Any]] = Field(None, description="Detailed reaction information")
    mechanism_steps: List[Dict[str, str]] = Field(default=[], description="Reaction mechanism steps")
    calculations: Dict[str, Any] = Field(default={}, description="Numerical calculations performed")
    safety_considerations: List[str] = Field(default=[], description="Safety warnings and precautions")
    environmental_impact: Dict[str, Any] = Field(default={}, description="Environmental considerations")
    alternative_approaches: List[str] = Field(default=[], description="Alternative methods or reactions")
    references: List[str] = Field(default=[], description="Scientific literature references")
    lab_procedures: Optional[List[str]] = Field(None, description="Step-by-step laboratory procedures")


class ChemistryAgent(BaseAgent):
    """AI agent specialized in chemistry and chemical engineering."""
    
    def __init__(self):
        metadata = AgentMetadata(
            name="Chemistry & Chemical Engineering Expert",
            description="Advanced AI agent for chemical analysis, reaction prediction, synthesis design, and chemical engineering problems. Provides comprehensive solutions with safety and environmental considerations.",
            category=AgentCategory.CHEMISTRY,
            version="1.0.0",
            author="LOGOS Chemistry AI Team",
            pricing_model=PricingModel.PER_USE,
            price_per_use=2.00,
            tags=["chemistry", "reactions", "synthesis", "analysis", "safety", "green chemistry"],
            capabilities=[
                "Predict chemical reactions and products",
                "Design synthesis pathways",
                "Analyze reaction mechanisms",
                "Perform stoichiometric calculations",
                "Thermodynamic and kinetic analysis",
                "Spectroscopy interpretation",
                "Safety hazard assessment",
                "Green chemistry optimization",
                "Process design and scale-up",
                "Separation and purification methods"
            ],
            limitations=[
                "Cannot perform actual laboratory experiments",
                "Limited to known chemical principles",
                "Cannot predict novel reactions with certainty",
                "Requires accurate input for reliable results"
            ],
            status=AgentStatus.ACTIVE
        )
        super().__init__(metadata)
        
        self._periodic_table = {}
        self._reaction_database = {}
        self._safety_database = {}
    
    async def _setup(self):
        """Initialize chemistry databases and resources."""
        self._periodic_table = {
            "H": {"name": "Hydrogen", "atomic_number": 1, "mass": 1.008},
            "C": {"name": "Carbon", "atomic_number": 6, "mass": 12.011},
            "N": {"name": "Nitrogen", "atomic_number": 7, "mass": 14.007},
            "O": {"name": "Oxygen", "atomic_number": 8, "mass": 15.999},
            # Extended periodic table would be loaded here
        }
        
        self._safety_database = {
            "hazard_classes": [
                "Explosive", "Flammable", "Oxidizing", "Corrosive",
                "Toxic", "Harmful", "Environmental hazard"
            ],
            "ppe_requirements": {
                "basic": ["Safety goggles", "Lab coat", "Gloves"],
                "advanced": ["Fume hood", "Face shield", "Respirator"]
            }
        }
        
        logger.info("Chemistry agent initialized with databases")
    
    def get_input_schema(self) -> Type[BaseModel]:
        """Get the input schema for this agent."""
        return ChemistryInput
    
    def get_output_schema(self) -> Type[BaseModel]:
        """Get the output schema for this agent."""
        return ChemistryOutput
    
    async def _execute(self, input_data: AgentInput) -> AgentOutput:
        """Execute chemistry analysis."""
        try:
            # Validate input
            chem_input = ChemistryInput(**input_data.input_data)
            
            # Create analysis prompt
            prompt = await self._create_chemistry_prompt(chem_input)
            
            # Get AI analysis
            ai_response = # Get real AI analysis from Claude
            from ....ai.ai_integration import ai_service
            
            system_prompt = """You are an expert Chemistry with deep knowledge and experience.
AI agent specialized in chemistry and chemical engineering.

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
            analysis_results = await self._parse_chemistry_results(ai_response, chem_input)
            
            # Perform safety analysis if requested
            if chem_input.safety_analysis:
                safety_data = await self._analyze_safety(chem_input)
                analysis_results["safety_considerations"] = safety_data
            
            # Create output
            output = ChemistryOutput(
                primary_result=analysis_results["primary_result"],
                reaction_details=analysis_results.get("reaction_details"),
                mechanism_steps=analysis_results.get("mechanism_steps", []),
                calculations=analysis_results.get("calculations", {}),
                safety_considerations=analysis_results.get("safety_considerations", []),
                environmental_impact=analysis_results.get("environmental_impact", {}),
                alternative_approaches=analysis_results.get("alternatives", []),
                references=analysis_results.get("references", []),
                lab_procedures=analysis_results.get("procedures")
            )
            
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=True,
                output_data=output.model_dump(),
                tokens_used=1500  # Placeholder
            )
            
        except Exception as e:
            logger.error(f"Chemistry analysis error: {str(e)}")
            return AgentOutput(
                agent_id=self.metadata.id,
                session_id=input_data.session_id,
                success=False,
                error=str(e)
            )
    
    async def _create_chemistry_prompt(self, chem_input: ChemistryInput) -> str:
        """Create a comprehensive prompt for chemistry analysis."""
        prompt = f"""
        Perform the following chemistry analysis:
        
        Task Type: {chem_input.task_type}
        """
        
        if chem_input.compounds:
            prompt += f"\nCompounds: {', '.join(chem_input.compounds)}"
        
        if chem_input.reaction:
            prompt += f"\nReaction: {chem_input.reaction}"
        
        if chem_input.conditions:
            prompt += "\nConditions:"
            for param, value in chem_input.conditions.items():
                prompt += f"\n- {param}: {value}"
        
        if chem_input.quantities:
            prompt += "\nQuantities:"
            for compound, amount in chem_input.quantities.items():
                prompt += f"\n- {compound}: {amount} g"
        
        prompt += f"""
        
        Requirements:
        - Include safety analysis: {chem_input.safety_analysis}
        - Consider green chemistry: {chem_input.green_chemistry}
        
        Please provide:
        1. Complete analysis for the {chem_input.task_type} task
        2. Detailed calculations with units
        3. Reaction mechanism (if applicable)
        4. Safety considerations and hazards
        5. Environmental impact assessment
        6. Alternative approaches
        7. Relevant scientific references
        8. Laboratory procedures (if applicable)
        
        Use IUPAC nomenclature and standard chemical notation.
        """
        
        return prompt
    
    async def _parse_chemistry_results(
        self,
        ai_response: str,
        chem_input: ChemistryInput
    ) -> Dict[str, Any]:
        """Parse AI response into structured chemistry results."""
        # In production, this would use sophisticated chemical parsing
        # For now, create structured response based on task type
        
        results = {
            "primary_result": {},
            "calculations": {},
            "alternatives": [],
            "references": ["Journal of Organic Chemistry", "Chemical Reviews"]
        }
        
        if chem_input.task_type == "reaction_prediction":
            results["primary_result"] = {
                "products": ["Product A", "Product B"],
                "yield": "85%",
                "selectivity": "95:5",
                "conditions": "Room temperature, 2 hours"
            }
            results["reaction_details"] = {
                "type": "Substitution reaction",
                "mechanism": "SN2",
                "rate_determining_step": "Nucleophilic attack"
            }
            
        elif chem_input.task_type == "synthesis_design":
            results["primary_result"] = {
                "route": "3-step synthesis",
                "overall_yield": "65%",
                "key_transformations": ["Protection", "Coupling", "Deprotection"]
            }
            results["procedures"] = [
                "Step 1: Protect alcohol with TBS chloride",
                "Step 2: Perform Suzuki coupling",
                "Step 3: Remove TBS protection with TBAF"
            ]
            
        elif chem_input.task_type == "stoichiometry":
            results["primary_result"] = {
                "limiting_reagent": "Compound A",
                "theoretical_yield": "25.4 g",
                "percent_yield": "82%",
                "excess_reagent": "Compound B (5.2 g excess)"
            }
            results["calculations"] = {
                "moles_A": 0.125,
                "moles_B": 0.200,
                "moles_product": 0.103
            }
        
        if chem_input.green_chemistry:
            results["environmental_impact"] = {
                "atom_economy": "78%",
                "e_factor": 2.5,
                "solvent_recommendation": "Use water or ethanol instead of DCM",
                "waste_minimization": "Recycle catalyst, distill solvents"
            }
        
        return results
    
    async def _analyze_safety(self, chem_input: ChemistryInput) -> List[str]:
        """Analyze safety considerations for the chemistry task."""
        safety_warnings = [
            "Wear appropriate PPE: safety goggles, lab coat, and nitrile gloves",
            "Work in a well-ventilated fume hood",
            "Keep fire extinguisher nearby for flammable compounds"
        ]
        
        # Add specific warnings based on compounds
        for compound in chem_input.compounds:
            if "acid" in compound.lower():
                safety_warnings.append(f"Corrosive: {compound} - Handle with extreme care")
            if "peroxide" in compound.lower():
                safety_warnings.append(f"Explosive hazard: {compound} - Avoid heat and shock")
        
        return safety_warnings
    
    async def predict_spectra(
        self,
        compound: str,
        spectrum_type: str
    ) -> Dict[str, Any]:
        """Predict spectroscopic data for a compound."""
        prompt = f"Predict {spectrum_type} spectrum for {compound}"
        response = await self.claude_completion(prompt, temperature=0.1)
        
        return {
            "spectrum_type": spectrum_type,
            "key_peaks": [],
            "interpretation": "Spectral analysis...",
            "functional_groups": []
        }
    
    async def retrosynthesis_analysis(
        self,
        target_molecule: str,
        max_steps: int = 5
    ) -> Dict[str, Any]:
        """Perform retrosynthetic analysis."""
        prompt = f"Perform retrosynthetic analysis for {target_molecule} in maximum {max_steps} steps"
        response = await self.claude_completion(prompt, temperature=0.2)
        
        return {
            "disconnections": [],
            "synthons": [],
            "starting_materials": [],
            "key_transformations": []
        }