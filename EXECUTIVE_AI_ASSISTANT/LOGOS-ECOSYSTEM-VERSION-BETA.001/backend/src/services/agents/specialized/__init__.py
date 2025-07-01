"""
Specialized AI agents for various domains.
"""

from .arts.dance_agent import DanceAgent
from .arts.fine_arts_agent import FineArtsAgent
from .arts.music_performance_agent import MusicPerformanceAgent
from .arts.theater_drama_agent import TheaterDramaAgent
from .business.business_agent import BusinessStrategyAgent
from .business.economics_agent import EconomicsAgent
from .business.finance_agent import FinanceAgent
from .business.hospitality_tourism_agent import HospitalityTourismAgent
from .business.human_resources_agent import HumanResourcesAgent
from .business.manufacturing_agent import ManufacturingAgent
from .business.manufacturing_industry_agent import ManufacturingIndustryAgent
from .business.marketing_analytics_agent import MarketingAnalyticsAgent
from .business.real_estate_agent import RealEstateAgent
from .business.social_media_strategy_agent import SocialMediaStrategyAgent
from .business.supply_chain_agent import SupplyChainAgent
from .computer_science.machine_learning_theory_agent import MachineLearningTheoryAgent
from .earth_sciences.geology_agent import GeologyAgent
from .earth_sciences.seismology_agent import SeismologyAgent
from .economics.behavioral_economics_agent import BehavioralEconomicsAgent
from .engineering.aerospace_engineering_agent import AerospaceEngineeringAgent
from .engineering.aerospace_propulsion_agent import AerospacePropulsionAgent
from .engineering.automotive_agent import AutomotiveAgent
from .engineering.biomedical_engineering_agent import BiomedicalEngineeringAgent
from .engineering.chemical_engineering_agent import ChemicalEngineeringAgent
from .engineering.civil_engineering_agent import CivilEngineeringAgent
from .engineering.devops_engineering_agent import DevopsEngineeringAgent
from .engineering.electrical_engineering_agent import ElectricalEngineeringAgent
from .engineering.engineering_agent import EngineeringAgent
from .engineering.machine_learning_engineering_agent import MachineLearningEngineeringAgent
from .engineering.mechanical_engineering_agent import MechanicalEngineeringAgent
from .engineering.robotics_automation_agent import RoboticsAutomationAgent
from .environment.agriculture_agent import AgricultureAgent
from .environment.agriculture_environment_agent import AgricultureEnvironmentAgent
from .environment.atmospheric_sciences_agent import AtmosphericSciencesAgent
from .environment.climatology_agent import ClimatologyAgent
from .environment.energy_sustainability_agent import EnergySustainabilityAgent
from .environment.meteorology_agent import MeteorologyAgent
from .environment.oceanography_agent import OceanographyAgent
from .geography.biogeography_agent import BiogeographyAgent
from .geography.cartography_agent import CartographyAgent
from .geography.coastal_geography_agent import CoastalGeographyAgent
from .geography.cultural_geography_agent import CulturalGeographyAgent
from .geography.desert_geography_agent import DesertGeographyAgent
from .geography.economic_geography_agent import EconomicGeographyAgent
from .geography.environmental_geography_agent import EnvironmentalGeographyAgent
from .geography.geomorphology_agent import GeomorphologyAgent
from .geography.gis_agent import GisAgent
from .geography.glaciology_agent import GlaciologyAgent
from .geography.historical_geography_agent import HistoricalGeographyAgent
from .geography.hydrology_agent import HydrologyAgent
from .geography.medical_geography_agent import MedicalGeographyAgent
from .geography.mountain_geography_agent import MountainGeographyAgent
from .geography.pedology_agent import PedologyAgent
from .geography.physical_geography_agent import PhysicalGeographyAgent
from .geography.polar_geography_agent import PolarGeographyAgent
from .geography.political_geography_agent import PoliticalGeographyAgent
from .geography.population_geography_agent import PopulationGeographyAgent
from .geography.rural_geography_agent import RuralGeographyAgent
from .geography.social_geography_agent import SocialGeographyAgent
from .geography.transport_geography_agent import TransportGeographyAgent
from .geography.tropical_geography_agent import TropicalGeographyAgent
from .geography.urban_geography_agent import UrbanGeographyAgent
from .geography.volcanology_agent import VolcanologyAgent
from .geography.wetland_geography_agent import WetlandGeographyAgent
from .humanities.anthropology_agent import AnthropologyAgent
from .humanities.archaeology_agent import ArchaeologyAgent
from .humanities.arts_culture_agent import ArtsCultureAgent
from .humanities.education_agent import EducationAgent
from .humanities.history_agent import HistoryAgent
from .humanities.linguistics_agent import LinguisticsAgent
from .humanities.literature_agent import LiteratureAgent
from .humanities.music_agent import MusicAgent
from .humanities.philosophy_agent import PhilosophyAgent
from .humanities.political_science_agent import PoliticalScienceAgent
from .humanities.psychology_agent import PsychologyAgent
from .humanities.sociology_agent import SociologyAgent
from .languages.language_learning_agent import LanguageLearningAgent
from .legal.international_trade_law_agent import InternationalTradeLawAgent
from .mathematics.abstract_algebra_agent import AbstractAlgebraAgent
from .mathematics.algebra_topology_agent import AlgebraTopologyAgent
from .mathematics.calculus_agent import CalculusAgent
from .mathematics.differential_equations_agent import DifferentialEquationsAgent
from .mathematics.discrete_mathematics_agent import DiscreteMathematicsAgent
from .mathematics.game_theory_agent import GameTheoryAgent
from .mathematics.group_theory_agent import GroupTheoryAgent
from .mathematics.linear_algebra_agent import LinearAlgebraAgent
from .mathematics.mathematics_agent import MathematicsAgent
from .mathematics.number_theory_agent import NumberTheoryAgent
from .mathematics.real_analysis_agent import RealAnalysisAgent
from .mathematics.statistics_probability_agent import StatisticsProbabilityAgent
from .medical.cardiology_agent import CardiologyAgent
from .medical.clinical_genetics_agent import ClinicalGeneticsAgent
from .medical.dermatology_agent import DermatologyAgent
from .medical.emergency_medicine_agent import EmergencyMedicineAgent
from .medical.forensic_pathology_agent import ForensicPathologyAgent
from .medical.gastroenterology_agent import GastroenterologyAgent
from .medical.genomics_agent import GenomicsAgent
from .medical.healthcare_operations_agent import HealthcareOperationsAgent
from .medical.interventional_radiology_agent import InterventionalRadiologyAgent
from .medical.medical_agent import MedicalDiagnosisAgent
from .medical.neurology_agent import NeurologyAgent
from .medical.neuropharmacology_agent import NeuropharmacologyAgent
from .medical.neurosurgery_agent import NeurosurgeryAgent
from .medical.nutrition_science_agent import NutritionScienceAgent
from .medical.oncology_agent import OncologyAgent
from .medical.ophthalmology_agent import OphthalmologyAgent
from .medical.pediatrics_agent import PediatricsAgent
from .medical.psychiatry_agent import PsychiatryAgent
from .medical.public_health_agent import PublicHealthAgent
from .medical.sports_medicine_agent import SportsMedicineAgent
from .medical.veterinary_medicine_agent import VeterinaryMedicineAgent
from .other.agriculture_agent import AgricultureAgent
from .other.constitutional_law_agent import ConstitutionalLawAgent
from .other.criminal_law_agent import CriminalLawAgent
from .other.education_agent import EducationAgent
from .other.legal_agent import LegalDocumentAnalyzer
from .other.neuropharmacology_agent import NeuropharmacologyAgent
from .other.research_development_agent import ResearchDevelopmentAgent
from .other.sports_fitness_agent import SportsFitnessAgent
from .other.transportation_logistics_agent import TransportationLogisticsAgent
from .other.urban_planning_agent import UrbanPlanningAgent
from .physics.quantum_field_theory_agent import QuantumFieldTheoryAgent
from .sciences.analytical_chemistry_agent import AnalyticalChemistryAgent
from .sciences.astronomy_agent import AstronomyAgent
from .sciences.astrophysics_agent import AstrophysicsAgent
from .sciences.atmospheric_sciences_agent import AtmosphericSciencesAgent
from .sciences.biology_agent import BiologyAgent
from .sciences.biotechnology_agent import BiotechnologyAgent
from .sciences.chemistry_agent import ChemistryAgent
from .sciences.condensed_matter_physics_agent import CondensedMatterPhysicsAgent
from .sciences.forensic_science_agent import ForensicScienceAgent
from .sciences.genetics_agent import GeneticsAgent
from .sciences.genomics_agent import GenomicsAgent
from .sciences.marine_biology_agent import MarineBiologyAgent
from .sciences.materials_science_agent import MaterialsScienceAgent
from .sciences.molecular_biology_agent import MolecularBiologyAgent
from .sciences.nanotechnology_agent import NanotechnologyAgent
from .sciences.neuroscience_agent import NeuroscienceAgent
from .sciences.nuclear_physics_agent import NuclearPhysicsAgent
from .sciences.nutrition_science_agent import NutritionScienceAgent
from .sciences.organic_chemistry_agent import OrganicChemistryAgent
from .sciences.particle_physics_agent import ParticlePhysicsAgent
from .sciences.physics_agent import PhysicsAgent
from .sciences.political_science_agent import PoliticalScienceAgent
from .sciences.quantum_computing_agent import QuantumComputingAgent
from .sciences.quantum_mechanics_agent import QuantumMechanicsAgent
from .sciences.quantum_physics_agent import QuantumPhysicsAgent
from .sciences.science_agent import ScienceAgent
from .technology.ai_research_agent import AIResearchAgent
from .technology.blockchain_development_agent import BlockchainDevelopmentAgent
from .technology.cloud_architecture_agent import CloudArchitectureAgent
from .technology.computer_vision_agent import ComputerVisionAgent
from .technology.cryptography_agent import CryptographyAgent
from .technology.cybersecurity_agent import CybersecurityAgent
from .technology.data_science_agent import DataScienceAgent
from .technology.devops_engineering_agent import DevopsEngineeringAgent
from .technology.mlops_agent import MlopsAgent
from .technology.nlp_agent import NLPAgent
from .technology.technology_agent import TechnologyAgent

__all__ = [
    "AIResearchAgent",
    "AbstractAlgebraAgent",
    "AerospaceEngineeringAgent",
    "AerospacePropulsionAgent",
    "AgricultureAgent",
    "AgricultureAgent",
    "AgricultureEnvironmentAgent",
    "AlgebraTopologyAgent",
    "AnalyticalChemistryAgent",
    "AnthropologyAgent",
    "ArchaeologyAgent",
    "ArtsCultureAgent",
    "AstronomyAgent",
    "AstrophysicsAgent",
    "AtmosphericSciencesAgent",
    "AtmosphericSciencesAgent",
    "AutomotiveAgent",
    "BehavioralEconomicsAgent",
    "BiogeographyAgent",
    "BiologyAgent",
    "BiomedicalEngineeringAgent",
    "BiotechnologyAgent",
    "BlockchainDevelopmentAgent",
    "BusinessStrategyAgent",
    "CalculusAgent",
    "CardiologyAgent",
    "CartographyAgent",
    "ChemicalEngineeringAgent",
    "ChemistryAgent",
    "CivilEngineeringAgent",
    "ClimatologyAgent",
    "ClinicalGeneticsAgent",
    "CloudArchitectureAgent",
    "CoastalGeographyAgent",
    "ComputerVisionAgent",
    "CondensedMatterPhysicsAgent",
    "ConstitutionalLawAgent",
    "CriminalLawAgent",
    "CryptographyAgent",
    "CulturalGeographyAgent",
    "CybersecurityAgent",
    "DanceAgent",
    "DataScienceAgent",
    "DermatologyAgent",
    "DesertGeographyAgent",
    "DevopsEngineeringAgent",
    "DevopsEngineeringAgent",
    "DifferentialEquationsAgent",
    "DiscreteMathematicsAgent",
    "EconomicGeographyAgent",
    "EconomicsAgent",
    "EducationAgent",
    "EducationAgent",
    "ElectricalEngineeringAgent",
    "EmergencyMedicineAgent",
    "EnergySustainabilityAgent",
    "EngineeringAgent",
    "EnvironmentalGeographyAgent",
    "FinanceAgent",
    "FineArtsAgent",
    "ForensicPathologyAgent",
    "ForensicScienceAgent",
    "GameTheoryAgent",
    "GastroenterologyAgent",
    "GeneticsAgent",
    "GenomicsAgent",
    "GenomicsAgent",
    "GeologyAgent",
    "GeomorphologyAgent",
    "GisAgent",
    "GlaciologyAgent",
    "GroupTheoryAgent",
    "HealthcareOperationsAgent",
    "HistoricalGeographyAgent",
    "HistoryAgent",
    "HospitalityTourismAgent",
    "HumanResourcesAgent",
    "HydrologyAgent",
    "InternationalTradeLawAgent",
    "InterventionalRadiologyAgent",
    "LanguageLearningAgent",
    "LegalDocumentAnalyzer",
    "LinearAlgebraAgent",
    "LinguisticsAgent",
    "LiteratureAgent",
    "MachineLearningEngineeringAgent",
    "MachineLearningTheoryAgent",
    "ManufacturingAgent",
    "ManufacturingIndustryAgent",
    "MarineBiologyAgent",
    "MarketingAnalyticsAgent",
    "MaterialsScienceAgent",
    "MathematicsAgent",
    "MechanicalEngineeringAgent",
    "MedicalDiagnosisAgent",
    "MedicalGeographyAgent",
    "MeteorologyAgent",
    "MlopsAgent",
    "MolecularBiologyAgent",
    "MountainGeographyAgent",
    "MusicAgent",
    "MusicPerformanceAgent",
    "NLPAgent",
    "NanotechnologyAgent",
    "NeurologyAgent",
    "NeuropharmacologyAgent",
    "NeuropharmacologyAgent",
    "NeuroscienceAgent",
    "NeurosurgeryAgent",
    "NuclearPhysicsAgent",
    "NumberTheoryAgent",
    "NutritionScienceAgent",
    "NutritionScienceAgent",
    "OceanographyAgent",
    "OncologyAgent",
    "OphthalmologyAgent",
    "OrganicChemistryAgent",
    "ParticlePhysicsAgent",
    "PediatricsAgent",
    "PedologyAgent",
    "PhilosophyAgent",
    "PhysicalGeographyAgent",
    "PhysicsAgent",
    "PolarGeographyAgent",
    "PoliticalGeographyAgent",
    "PoliticalScienceAgent",
    "PoliticalScienceAgent",
    "PopulationGeographyAgent",
    "PsychiatryAgent",
    "PsychologyAgent",
    "PublicHealthAgent",
    "QuantumComputingAgent",
    "QuantumFieldTheoryAgent",
    "QuantumMechanicsAgent",
    "QuantumPhysicsAgent",
    "RealAnalysisAgent",
    "RealEstateAgent",
    "ResearchDevelopmentAgent",
    "RoboticsAutomationAgent",
    "RuralGeographyAgent",
    "ScienceAgent",
    "SeismologyAgent",
    "SocialGeographyAgent",
    "SocialMediaStrategyAgent",
    "SociologyAgent",
    "SportsFitnessAgent",
    "SportsMedicineAgent",
    "StatisticsProbabilityAgent",
    "SupplyChainAgent",
    "TechnologyAgent",
    "TheaterDramaAgent",
    "TransportGeographyAgent",
    "TransportationLogisticsAgent",
    "TropicalGeographyAgent",
    "UrbanGeographyAgent",
    "UrbanPlanningAgent",
    "VeterinaryMedicineAgent",
    "VolcanologyAgent",
    "WetlandGeographyAgent",
]
