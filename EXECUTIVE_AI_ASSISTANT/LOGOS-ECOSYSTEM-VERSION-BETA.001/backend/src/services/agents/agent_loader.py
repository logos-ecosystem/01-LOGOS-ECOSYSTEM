"""Dynamic agent loader for discovering and registering all specialized agents."""

import os
import importlib
import inspect
from typing import Dict, Type, List, Tuple
from pathlib import Path

from .base_agent import BaseAIAgent
from .agent_registry import AgentRegistry
from ...shared.utils.logger import get_logger

logger = get_logger(__name__)


class AgentLoader:
    """Dynamically loads and registers all specialized agents."""
    
    def __init__(self, registry: AgentRegistry):
        self.registry = registry
        self.loaded_agents: Dict[str, Type[BaseAIAgent]] = {}
        self.agent_stats = {
            'total': 0,
            'by_category': {},
            'loaded': 0,
            'failed': 0
        }
    
    async def load_all_agents(self) -> Dict[str, any]:
        """Discover and load all agent classes from the specialized directory."""
        specialized_dir = Path(__file__).parent / 'specialized'
        
        # Scan all category directories
        for category_dir in specialized_dir.iterdir():
            if category_dir.is_dir() and not category_dir.name.startswith('__'):
                await self._load_category_agents(category_dir)
        
        logger.info(f"Agent loading complete: {self.agent_stats}")
        return self.agent_stats
    
    async def _load_category_agents(self, category_dir: Path):
        """Load all agents from a category directory."""
        category_name = category_dir.name
        self.agent_stats['by_category'][category_name] = 0
        
        # Find all Python files in the category
        for agent_file in category_dir.glob('*.py'):
            if agent_file.name.startswith('__'):
                continue
                
            try:
                # Import the module
                module_path = f'src.services.agents.specialized.{category_name}.{agent_file.stem}'
                module = importlib.import_module(module_path)
                
                # Find all agent classes in the module
                for name, obj in inspect.getmembers(module):
                    if (inspect.isclass(obj) and 
                        issubclass(obj, BaseAIAgent) and 
                        obj != BaseAIAgent and
                        not inspect.isabstract(obj)):
                        
                        # Register the agent
                        agent_key = f"{category_name}.{name}"
                        self.registry.register_agent_class(agent_key, obj)
                        self.loaded_agents[agent_key] = obj
                        
                        self.agent_stats['total'] += 1
                        self.agent_stats['by_category'][category_name] += 1
                        self.agent_stats['loaded'] += 1
                        
                        logger.debug(f"Loaded agent: {agent_key}")
                        
            except Exception as e:
                logger.error(f"Failed to load agents from {agent_file}: {str(e)}")
                self.agent_stats['failed'] += 1
    
    def get_agent_catalog(self) -> List[Dict[str, any]]:
        """Get a catalog of all loaded agents with their metadata."""
        catalog = []
        
        for key, agent_class in self.loaded_agents.items():
            try:
                # Create a temporary instance to get metadata
                agent = agent_class()
                metadata = agent.metadata
                
                catalog.append({
                    'key': key,
                    'name': metadata.name,
                    'description': metadata.description,
                    'category': metadata.category.value,
                    'version': metadata.version,
                    'author': metadata.author,
                    'pricing_model': metadata.pricing_model.value,
                    'price': metadata.price_per_use or metadata.price_per_month,
                    'tags': metadata.tags,
                    'capabilities': metadata.capabilities,
                    'status': metadata.status.value
                })
            except Exception as e:
                logger.warning(f"Failed to get metadata for {key}: {str(e)}")
        
        return catalog
    
    def get_agents_by_category(self, category: str) -> Dict[str, Type[BaseAIAgent]]:
        """Get all agents in a specific category."""
        return {
            key: agent for key, agent in self.loaded_agents.items()
            if key.startswith(f"{category}.")
        }
    
    def get_agent_class(self, key: str) -> Type[BaseAIAgent]:
        """Get a specific agent class by its key."""
        return self.loaded_agents.get(key)


# Create a function to automatically load all agents
async def auto_load_agents(registry: AgentRegistry) -> AgentLoader:
    """Automatically discover and load all agents."""
    loader = AgentLoader(registry)
    await loader.load_all_agents()
    return loader


# Predefined list of core agents that should always be available
CORE_AGENTS = {
    # Medical
    'medical.MedicalDiagnosisAgent': 'Medical Diagnosis Assistant',
    'medical.CardiologyAgent': 'Cardiology Specialist',
    'medical.NeurologyAgent': 'Neurology Expert',
    'medical.PediatricsAgent': 'Pediatrics Specialist',
    
    # Technology
    'technology.AIResearchAgent': 'AI Research Assistant',
    'technology.CybersecurityAgent': 'Cybersecurity Analyst',
    'technology.DataScienceAgent': 'Data Science Expert',
    'technology.DevOpsEngineeringAgent': 'DevOps Engineer',
    
    # Business
    'business.FinanceAgent': 'Financial Analyst',
    'business.MarketingAnalyticsAgent': 'Marketing Analytics Expert',
    'business.SupplyChainAgent': 'Supply Chain Optimizer',
    
    # Sciences
    'sciences.PhysicsAgent': 'Physics Expert',
    'sciences.ChemistryAgent': 'Chemistry Specialist',
    'sciences.BiologyAgent': 'Biology Expert',
    'sciences.AstronomyAgent': 'Astronomy Specialist',
    
    # Engineering
    'engineering.SoftwareEngineeringAgent': 'Software Engineering Expert',
    'engineering.MechanicalEngineeringAgent': 'Mechanical Engineer',
    'engineering.ElectricalEngineeringAgent': 'Electrical Engineer',
    
    # Mathematics
    'mathematics.CalculusAgent': 'Calculus Expert',
    'mathematics.StatisticsProbabilityAgent': 'Statistics & Probability Expert',
    'mathematics.LinearAlgebraAgent': 'Linear Algebra Specialist',
    
    # Geography
    'geography.GISAgent': 'GIS Specialist',
    'geography.ClimatologyAgent': 'Climatology Expert',
    'geography.UrbanGeographyAgent': 'Urban Geography Analyst',
    
    # Humanities
    'humanities.PhilosophyAgent': 'Philosophy Expert',
    'humanities.HistoryAgent': 'History Scholar',
    'humanities.PsychologyAgent': 'Psychology Expert',
    
    # Meta
    'meta.EcosystemMetaAssistant': 'LOGOS Ecosystem Assistant',
}