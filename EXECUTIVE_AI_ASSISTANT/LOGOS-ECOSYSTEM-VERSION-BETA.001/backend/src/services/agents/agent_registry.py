"""Agent Registry for discovering and managing AI agents."""

from typing import Dict, List, Optional, Type, Callable, Any
from uuid import UUID
import asyncio
from datetime import datetime
from collections import defaultdict
import json

from .base_agent import BaseAIAgent, AgentCategory, AgentStatus, AgentMetadata, PricingModel
from ...shared.utils.logger import get_logger
from ...shared.utils.exceptions import (
    AgentNotFoundError,
    AgentRegistrationError,
    AgentAuthorizationError
)

logger = get_logger(__name__)


class SearchCriteria:
    """Search criteria for agent discovery."""
    
    def __init__(
        self,
        category: Optional[AgentCategory] = None,
        tags: Optional[List[str]] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        pricing_model: Optional[PricingModel] = None,
        status: Optional[AgentStatus] = None,
        author: Optional[str] = None,
        capabilities: Optional[List[str]] = None,
        sort_by: str = "popularity",
        limit: int = 20,
        offset: int = 0
    ):
        self.category = category
        self.tags = tags or []
        self.min_price = min_price
        self.max_price = max_price
        self.pricing_model = pricing_model
        self.status = status or AgentStatus.ACTIVE
        self.author = author
        self.capabilities = capabilities or []
        self.sort_by = sort_by
        self.limit = limit
        self.offset = offset


class AgentRegistry:
    """Central registry for all AI agents in the marketplace."""
    
    def __init__(self):
        """Initialize agent registry."""
        self._agents: Dict[UUID, BaseAIAgent] = {}
        self._agent_classes: Dict[str, Type[BaseAIAgent]] = {}
        self._category_index: Dict[AgentCategory, List[UUID]] = defaultdict(list)
        self._tag_index: Dict[str, List[UUID]] = defaultdict(list)
        self._performance_cache: Dict[UUID, Dict[str, Any]] = {}
        self._claude_client = None  # Will be injected
        self._initialized = False
        
    async def initialize(self):
        """Initialize registry and load agents."""
        if self._initialized:
            return
            
        try:
            # Load built-in agents
            await self._load_builtin_agents()
            
            # Initialize performance tracking
            asyncio.create_task(self._update_performance_metrics())
            
            self._initialized = True
            logger.info("Agent registry initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize registry: {str(e)}")
            raise
    
    def register_agent_class(self, name: str, agent_class: Type[BaseAIAgent]):
        """Register an agent class for dynamic instantiation.
        
        Args:
            name: Unique name for the agent class
            agent_class: The agent class to register
        """
        if name in self._agent_classes:
            raise AgentRegistrationError(f"Agent class {name} already registered")
        
        self._agent_classes[name] = agent_class
        logger.info(f"Registered agent class: {name}")
    
    async def register_agent(self, agent: BaseAIAgent) -> UUID:
        """Register an agent instance.
        
        Args:
            agent: The agent instance to register
            
        Returns:
            The agent's UUID
        """
        agent_id = agent.metadata.id
        
        if agent_id in self._agents:
            raise AgentRegistrationError(f"Agent {agent_id} already registered")
        
        # Initialize agent
        await agent.initialize()
        
        # Inject Claude client
        agent._claude_client = self._claude_client
        
        # Add to registry
        self._agents[agent_id] = agent
        
        # Update indices
        self._category_index[agent.metadata.category].append(agent_id)
        for tag in agent.metadata.tags:
            self._tag_index[tag.lower()].append(agent_id)
        
        logger.info(f"Registered agent: {agent.metadata.name} ({agent_id})")
        return agent_id
    
    async def unregister_agent(self, agent_id: UUID):
        """Unregister an agent.
        
        Args:
            agent_id: The agent's UUID
        """
        if agent_id not in self._agents:
            raise AgentNotFoundError(f"Agent {agent_id} not found")
        
        agent = self._agents[agent_id]
        
        # Remove from indices
        self._category_index[agent.metadata.category].remove(agent_id)
        for tag in agent.metadata.tags:
            self._tag_index[tag.lower()].remove(agent_id)
        
        # Remove from registry
        del self._agents[agent_id]
        
        logger.info(f"Unregistered agent: {agent.metadata.name} ({agent_id})")
    
    def get_agent(self, agent_id: UUID) -> BaseAIAgent:
        """Get an agent by ID.
        
        Args:
            agent_id: The agent's UUID
            
        Returns:
            The agent instance
        """
        if agent_id not in self._agents:
            raise AgentNotFoundError(f"Agent {agent_id} not found")
        
        return self._agents[agent_id]
    
    async def search_agents(self, criteria: SearchCriteria) -> List[BaseAIAgent]:
        """Search for agents based on criteria.
        
        Args:
            criteria: Search criteria
            
        Returns:
            List of matching agents
        """
        matching_agents = []
        
        for agent_id, agent in self._agents.items():
            # Check category
            if criteria.category and agent.metadata.category != criteria.category:
                continue
            
            # Check status
            if criteria.status and agent.metadata.status != criteria.status:
                continue
            
            # Check author
            if criteria.author and agent.metadata.author.lower() != criteria.author.lower():
                continue
            
            # Check pricing model
            if criteria.pricing_model and agent.metadata.pricing_model != criteria.pricing_model:
                continue
            
            # Check price range
            if criteria.min_price is not None:
                price = agent.metadata.price_per_use or agent.metadata.subscription_price or 0
                if price < criteria.min_price:
                    continue
            
            if criteria.max_price is not None:
                price = agent.metadata.price_per_use or agent.metadata.subscription_price or float('inf')
                if price > criteria.max_price:
                    continue
            
            # Check tags
            if criteria.tags:
                agent_tags = [tag.lower() for tag in agent.metadata.tags]
                if not any(tag.lower() in agent_tags for tag in criteria.tags):
                    continue
            
            # Check capabilities
            if criteria.capabilities:
                agent_caps = [cap.lower() for cap in agent.metadata.capabilities]
                if not all(cap.lower() in agent_caps for cap in criteria.capabilities):
                    continue
            
            matching_agents.append(agent)
        
        # Sort results
        matching_agents = self._sort_agents(matching_agents, criteria.sort_by)
        
        # Apply pagination
        start = criteria.offset
        end = start + criteria.limit
        return matching_agents[start:end]
    
    def _sort_agents(self, agents: List[BaseAIAgent], sort_by: str) -> List[BaseAIAgent]:
        """Sort agents by specified criteria.
        
        Args:
            agents: List of agents to sort
            sort_by: Sort criteria
            
        Returns:
            Sorted list of agents
        """
        if sort_by == "popularity":
            # Sort by total executions
            return sorted(
                agents,
                key=lambda a: self._get_performance_metric(a.metadata.id, "total_executions"),
                reverse=True
            )
        elif sort_by == "rating":
            # Sort by user satisfaction score
            return sorted(
                agents,
                key=lambda a: self._get_performance_metric(a.metadata.id, "user_satisfaction_score"),
                reverse=True
            )
        elif sort_by == "price_low":
            # Sort by price (low to high)
            return sorted(
                agents,
                key=lambda a: a.metadata.price_per_use or a.metadata.subscription_price or 0
            )
        elif sort_by == "price_high":
            # Sort by price (high to low)
            return sorted(
                agents,
                key=lambda a: a.metadata.price_per_use or a.metadata.subscription_price or 0,
                reverse=True
            )
        elif sort_by == "newest":
            # Sort by creation date
            return sorted(
                agents,
                key=lambda a: a.metadata.created_at,
                reverse=True
            )
        else:
            # Default: alphabetical by name
            return sorted(agents, key=lambda a: a.metadata.name)
    
    def _get_performance_metric(self, agent_id: UUID, metric: str) -> Any:
        """Get performance metric for an agent.
        
        Args:
            agent_id: Agent UUID
            metric: Metric name
            
        Returns:
            Metric value
        """
        if agent_id in self._performance_cache:
            return self._performance_cache[agent_id].get(metric, 0)
        return 0
    
    async def _update_performance_metrics(self):
        """Periodically update performance metrics cache."""
        while True:
            try:
                for agent_id, agent in self._agents.items():
                    metrics = agent.get_performance_metrics()
                    self._performance_cache[agent_id] = metrics.model_dump()
                
                await asyncio.sleep(300)  # Update every 5 minutes
                
            except Exception as e:
                logger.error(f"Error updating performance metrics: {str(e)}")
                await asyncio.sleep(60)
    
    def get_categories(self) -> List[Dict[str, Any]]:
        """Get all available categories with agent counts.
        
        Returns:
            List of category information
        """
        categories = []
        
        for category in AgentCategory:
            agent_count = len(self._category_index.get(category, []))
            if agent_count > 0:
                categories.append({
                    "value": category.value,
                    "name": category.value.replace("_", " ").title(),
                    "agent_count": agent_count
                })
        
        return sorted(categories, key=lambda c: c["agent_count"], reverse=True)
    
    def get_popular_tags(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get popular tags.
        
        Args:
            limit: Maximum number of tags to return
            
        Returns:
            List of popular tags with counts
        """
        tag_counts = []
        
        for tag, agent_ids in self._tag_index.items():
            if len(agent_ids) > 0:
                tag_counts.append({
                    "tag": tag,
                    "count": len(agent_ids)
                })
        
        # Sort by count and return top tags
        tag_counts.sort(key=lambda t: t["count"], reverse=True)
        return tag_counts[:limit]
    
    async def check_agent_access(self, agent_id: UUID, user_id: UUID) -> bool:
        """Check if user has access to an agent.
        
        Args:
            agent_id: Agent UUID
            user_id: User UUID
            
        Returns:
            True if user has access
        """
        agent = self.get_agent(agent_id)
        return await agent.validate_access(user_id)
    
    async def execute_agent(
        self,
        agent_id: UUID,
        user_id: UUID,
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute an agent.
        
        Args:
            agent_id: Agent UUID
            user_id: User UUID
            input_data: Input data for the agent
            
        Returns:
            Agent output
        """
        agent = self.get_agent(agent_id)
        
        # Check access
        if not await self.check_agent_access(agent_id, user_id):
            raise AgentAuthorizationError("User does not have access to this agent")
        
        # Execute agent
        result = await agent.execute(input_data, user_id)
        
        return result.model_dump()
    
    async def _load_builtin_agents(self):
        """Load built-in specialized agents."""
        logger.info("Loading built-in agents...")
        
        # Import all specialized agents
        from .specialized import (
            # Arts agents
            DanceAgent, FineArtsAgent, MusicPerformanceAgent, TheaterDramaAgent,
            
            # Business agents
            BusinessStrategyAgent, EconomicsAgent, FinanceAgent, HospitalityTourismAgent,
            HumanResourcesAgent, ManufacturingAgent, ManufacturingIndustryAgent,
            MarketingAnalyticsAgent, RealEstateAgent, SocialMediaStrategyAgent, SupplyChainAgent,
            
            # Computer Science agents
            MachineLearningTheoryAgent,
            
            # Earth Sciences agents
            GeologyAgent, SeismologyAgent,
            
            # Economics agents
            BehavioralEconomicsAgent,
            
            # Engineering agents
            AerospaceEngineeringAgent, AerospacePropulsionAgent, AutomotiveAgent,
            BiomedicalEngineeringAgent, ChemicalEngineeringAgent, CivilEngineeringAgent,
            DevopsEngineeringAgent, ElectricalEngineeringAgent, EngineeringAgent,
            MachineLearningEngineeringAgent, MechanicalEngineeringAgent, RoboticsAutomationAgent,
            
            # Environment agents
            AgricultureAgent, AgricultureEnvironmentAgent, AtmosphericSciencesAgent,
            ClimatologyAgent, EnergySustainabilityAgent, MeteorologyAgent, OceanographyAgent,
            
            # Geography agents
            BiogeographyAgent, CartographyAgent, CoastalGeographyAgent, CulturalGeographyAgent,
            DesertGeographyAgent, EconomicGeographyAgent, EnvironmentalGeographyAgent,
            GeomorphologyAgent, GisAgent, GlaciologyAgent, HistoricalGeographyAgent,
            HydrologyAgent, MedicalGeographyAgent, MountainGeographyAgent, PedologyAgent,
            PhysicalGeographyAgent, PolarGeographyAgent, PoliticalGeographyAgent,
            PopulationGeographyAgent, RuralGeographyAgent, SocialGeographyAgent,
            TransportGeographyAgent, TropicalGeographyAgent, UrbanGeographyAgent,
            VolcanologyAgent, WetlandGeographyAgent,
            
            # Humanities agents
            AnthropologyAgent, ArchaeologyAgent, ArtsCultureAgent, EducationAgent,
            HistoryAgent, LinguisticsAgent, LiteratureAgent, MusicAgent,
            PhilosophyAgent, PoliticalScienceAgent, PsychologyAgent, SociologyAgent,
            
            # Languages agents
            LanguageLearningAgent,
            
            # Legal agents
            LegalAgent,
            
            # Mathematics agents
            AbstractAlgebraAgent, AlgebraTopologyAgent, AppliedMathematicsAgent,
            CalculusAgent, CombinatoricsAgent, DifferentialEquationsAgent,
            GroupTheoryAgent, LinearAlgebraAgent, MathematicsAgent, NumberTheoryAgent,
            PureMathematicsAgent, StatisticsProbabilityAgent,
            
            # Medical agents
            AllergyImmunologyAgent, AnesthesiologyAgent, CardiologyAgent,
            ClinicalGeneticsAgent, DermatologyAgent, EmergencyMedicineAgent,
            EndocrinologyAgent, ForensicPathologyAgent, GastroenterologyAgent,
            HealthcareOperationsAgent, InfectiousDiseaseAgent, InterventionalRadiologyAgent,
            MedicalAgent, NephrologyAgent, NeurologyAgent, NeuropharmacologyAgent,
            NeurosurgeryAgent, NutritionScienceAgent, OncologyAgent, OphthalmologyAgent,
            PediatricsAgent,
            
            # Other agents
            AstronomyAgent, BioinformaticsAgent, EducationAgent as OtherEducationAgent,
            GenomicsAgent, MeteorologyAgent as OtherMeteorologyAgent, NeuroscienceAgent,
            PalynologyAgent, SportsHealthAgent, SportsMedicineAgent, TransportationLogisticsAgent,
            
            # Physics agents
            PhysicsAgent,
            
            # Sciences agents
            AstrophysicsAgent, BiochemistryAgent, BiologyAgent, BiotechnologyAgent,
            BotanyAgent, ChemistryAgent, CognitiveScienceAgent, ComputerVisionAgent,
            CryptographyAgent, CybersecurityAgent, DataScienceAgent, EcologyAgent,
            EvolutionaryBiologyAgent, GeneticsAgent, MachineLearningAgent,
            MarineBiologyAgent, MaterialsScienceAgent, MicrobiologyAgent, MlopsAgent,
            NanotechnologyAgent, NlpAgent, OrganicChemistryAgent, QuantumComputingAgent,
            ScienceAgent, SystemsBiologyAgent, ZoologyAgent,
            
            # Technology agents
            AiResearchAgent, BackendDevelopmentAgent, BlockchainDevelopmentAgent,
            CloudArchitectureAgent, CybersecurityAgent as TechCybersecurityAgent,
            DataEngineeringAgent, DevopsEngineeringAgent as TechDevopsAgent,
            FrontendDevelopmentAgent, IotDevelopmentAgent, MlopsAgent as TechMlopsAgent,
            TechnologyAgent,
        )
        
        # Register all agent classes
        agent_classes = []
        
        # Get all imported classes from the specialized module
        import inspect
        from . import specialized
        
        for name, obj in inspect.getmembers(specialized):
            if inspect.isclass(obj) and issubclass(obj, BaseAIAgent) and obj != BaseAIAgent:
                agent_classes.append(obj)
        
        # Create instances and register them
        for agent_class in agent_classes:
            try:
                agent_instance = agent_class()
                await self.register_agent(agent_instance)
                self.register_agent_class(agent_class.__name__, agent_class)
            except Exception as e:
                logger.error(f"Failed to register {agent_class.__name__}: {str(e)}")
        
        logger.info(f"Loaded {len(agent_classes)} built-in agents")
    def get_stats(self) -> Dict[str, Any]:
        """Get registry statistics.
        
        Returns:
            Dictionary of statistics
        """
        total_executions = sum(
            self._get_performance_metric(agent_id, "total_executions")
            for agent_id in self._agents
        )
        
        return {
            "total_agents": len(self._agents),
            "active_agents": len([
                a for a in self._agents.values()
                if a.metadata.status == AgentStatus.ACTIVE
            ]),
            "total_categories": len([
                c for c in self._category_index
                if len(self._category_index[c]) > 0
            ]),
            "total_executions": total_executions,
            "popular_categories": self.get_categories()[:5],
            "popular_tags": self.get_popular_tags(10)
        }


# Global registry instance
agent_registry = AgentRegistry()


def get_agent_registry() -> AgentRegistry:
    """Get the global agent registry instance."""
    return agent_registry