"""Fine-Tuning Service for LOGOS Ecosystem - Custom Model Training"""

from typing import List, Dict, Any, Optional, Tuple, Union
import asyncio
import json
import os
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
import numpy as np
from pathlib import Path
import hashlib
import pickle

# ML Framework imports
try:
    import torch
    from torch.utils.data import Dataset, DataLoader
    from transformers import (
        AutoTokenizer, 
        AutoModelForCausalLM,
        AutoModelForSequenceClassification,
        TrainingArguments,
        Trainer,
        DataCollatorWithPadding,
        EarlyStoppingCallback
    )
    from datasets import Dataset as HFDataset
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import wandb
    WANDB_AVAILABLE = True
except ImportError:
    WANDB_AVAILABLE = False

try:
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, f1_score, precision_recall_fscore_support
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings

settings = get_settings()
from ...infrastructure.database import Base
from ...infrastructure.cache import cache_manager
from ..model_registry import ModelRegistry

logger = get_logger(__name__)


class ModelType(Enum):
    CAUSAL_LM = "causal_lm"  # Text generation
    SEQUENCE_CLASSIFICATION = "sequence_classification"  # Classification
    TOKEN_CLASSIFICATION = "token_classification"  # NER
    QUESTION_ANSWERING = "question_answering"  # QA
    EMBEDDINGS = "embeddings"  # Sentence embeddings


class TrainingStatus(Enum):
    PREPARING = "preparing"
    TRAINING = "training"
    EVALUATING = "evaluating"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class TrainingConfig:
    """Configuration for model training"""
    model_name: str
    model_type: ModelType
    base_model: str = "microsoft/DialoGPT-small"  # Default small model
    learning_rate: float = 5e-5
    train_batch_size: int = 8
    eval_batch_size: int = 8
    num_epochs: int = 3
    warmup_steps: int = 100
    weight_decay: float = 0.01
    max_length: int = 512
    gradient_accumulation_steps: int = 1
    fp16: bool = True
    save_steps: int = 500
    eval_steps: int = 500
    logging_steps: int = 100
    save_total_limit: int = 3
    load_best_model_at_end: bool = True
    metric_for_best_model: str = "eval_loss"
    greater_is_better: bool = False
    push_to_hub: bool = False
    hub_model_id: Optional[str] = None
    use_wandb: bool = True
    early_stopping_patience: int = 3


@dataclass
class TrainingDataset:
    """Training dataset container"""
    train_data: List[Dict[str, Any]]
    eval_data: List[Dict[str, Any]]
    test_data: Optional[List[Dict[str, Any]]] = None
    label_mapping: Optional[Dict[str, int]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TrainingMetrics:
    """Training metrics and results"""
    epoch: int
    train_loss: float
    eval_loss: float
    eval_accuracy: Optional[float] = None
    eval_f1: Optional[float] = None
    eval_precision: Optional[float] = None
    eval_recall: Optional[float] = None
    learning_rate: float = 0.0
    train_runtime: float = 0.0
    eval_runtime: float = 0.0
    samples_per_second: float = 0.0


class CustomDataset(Dataset):
    """Custom PyTorch dataset for fine-tuning"""
    
    def __init__(self, 
                 data: List[Dict[str, Any]], 
                 tokenizer: Any,
                 max_length: int = 512,
                 model_type: ModelType = ModelType.CAUSAL_LM):
        self.data = data
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.model_type = model_type
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        item = self.data[idx]
        
        if self.model_type == ModelType.CAUSAL_LM:
            # For text generation
            text = item.get('text', '') or f"{item.get('input', '')}{item.get('output', '')}"
            encoding = self.tokenizer(
                text,
                truncation=True,
                padding='max_length',
                max_length=self.max_length,
                return_tensors='pt'
            )
            encoding['labels'] = encoding['input_ids'].clone()
            
        elif self.model_type == ModelType.SEQUENCE_CLASSIFICATION:
            # For classification
            encoding = self.tokenizer(
                item['text'],
                truncation=True,
                padding='max_length',
                max_length=self.max_length,
                return_tensors='pt'
            )
            encoding['labels'] = torch.tensor(item['label'])
        
        return {k: v.squeeze() for k, v in encoding.items()}


class DatasetPreparation:
    """Dataset preparation utilities"""
    
    @staticmethod
    def prepare_conversation_data(conversations: List[List[Dict[str, str]]]) -> List[Dict[str, str]]:
        """Prepare conversation data for fine-tuning"""
        prepared_data = []
        
        for conversation in conversations:
            context = ""
            for i, turn in enumerate(conversation):
                if i == len(conversation) - 1:
                    # Last turn is the target
                    prepared_data.append({
                        'input': context,
                        'output': turn['content']
                    })
                else:
                    # Build context
                    context += f"{turn['role']}: {turn['content']}\n"
        
        return prepared_data
    
    @staticmethod
    def prepare_classification_data(texts: List[str], labels: List[Union[str, int]]) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        """Prepare classification data"""
        # Create label mapping if strings
        if isinstance(labels[0], str):
            unique_labels = sorted(set(labels))
            label_mapping = {label: i for i, label in enumerate(unique_labels)}
            numeric_labels = [label_mapping[label] for label in labels]
        else:
            label_mapping = None
            numeric_labels = labels
        
        prepared_data = [
            {'text': text, 'label': label}
            for text, label in zip(texts, numeric_labels)
        ]
        
        return prepared_data, label_mapping
    
    @staticmethod
    def prepare_qa_data(questions: List[str], contexts: List[str], answers: List[str]) -> List[Dict[str, str]]:
        """Prepare question-answering data"""
        return [
            {
                'question': q,
                'context': c,
                'answer': a
            }
            for q, c, a in zip(questions, contexts, answers)
        ]


class ModelTrainer:
    """Handles model training operations"""
    
    def __init__(self, config: TrainingConfig):
        self.config = config
        self.model = None
        self.tokenizer = None
        self.trainer = None
        self.metrics_history: List[TrainingMetrics] = []
        
        if TRANSFORMERS_AVAILABLE:
            self._initialize_model_and_tokenizer()
        else:
            logger.error("Transformers library not available")
    
    def _initialize_model_and_tokenizer(self):
        """Initialize model and tokenizer"""
        self.tokenizer = AutoTokenizer.from_pretrained(self.config.base_model)
        
        # Add padding token if not present
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        if self.config.model_type == ModelType.CAUSAL_LM:
            self.model = AutoModelForCausalLM.from_pretrained(
                self.config.base_model,
                torch_dtype=torch.float16 if self.config.fp16 else torch.float32
            )
        elif self.config.model_type == ModelType.SEQUENCE_CLASSIFICATION:
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.config.base_model,
                num_labels=2  # Will be updated based on data
            )
    
    def compute_metrics(self, eval_pred):
        """Compute metrics for evaluation"""
        predictions, labels = eval_pred
        
        if self.config.model_type == ModelType.SEQUENCE_CLASSIFICATION:
            predictions = np.argmax(predictions, axis=1)
            precision, recall, f1, _ = precision_recall_fscore_support(
                labels, predictions, average='weighted'
            )
            accuracy = accuracy_score(labels, predictions)
            
            return {
                'accuracy': accuracy,
                'f1': f1,
                'precision': precision,
                'recall': recall
            }
        else:
            # For generation tasks, use perplexity
            return {'perplexity': np.exp(predictions.mean())}
    
    def train(self, dataset: TrainingDataset, output_dir: str) -> Dict[str, Any]:
        """Train the model"""
        if not TRANSFORMERS_AVAILABLE:
            raise RuntimeError("Transformers library not available")
        
        # Create datasets
        train_dataset = CustomDataset(
            dataset.train_data,
            self.tokenizer,
            self.config.max_length,
            self.config.model_type
        )
        
        eval_dataset = CustomDataset(
            dataset.eval_data,
            self.tokenizer,
            self.config.max_length,
            self.config.model_type
        )
        
        # Update num_labels for classification
        if self.config.model_type == ModelType.SEQUENCE_CLASSIFICATION and dataset.label_mapping:
            self.model.config.num_labels = len(dataset.label_mapping)
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir=output_dir,
            num_train_epochs=self.config.num_epochs,
            per_device_train_batch_size=self.config.train_batch_size,
            per_device_eval_batch_size=self.config.eval_batch_size,
            warmup_steps=self.config.warmup_steps,
            weight_decay=self.config.weight_decay,
            logging_dir=f"{output_dir}/logs",
            logging_steps=self.config.logging_steps,
            save_steps=self.config.save_steps,
            eval_steps=self.config.eval_steps,
            evaluation_strategy="steps",
            save_total_limit=self.config.save_total_limit,
            load_best_model_at_end=self.config.load_best_model_at_end,
            metric_for_best_model=self.config.metric_for_best_model,
            greater_is_better=self.config.greater_is_better,
            fp16=self.config.fp16,
            gradient_accumulation_steps=self.config.gradient_accumulation_steps,
            report_to=["wandb"] if self.config.use_wandb and WANDB_AVAILABLE else ["none"],
            push_to_hub=self.config.push_to_hub,
            hub_model_id=self.config.hub_model_id
        )
        
        # Initialize trainer
        self.trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            tokenizer=self.tokenizer,
            compute_metrics=self.compute_metrics,
            callbacks=[
                EarlyStoppingCallback(
                    early_stopping_patience=self.config.early_stopping_patience
                )
            ] if self.config.early_stopping_patience > 0 else []
        )
        
        # Train
        train_result = self.trainer.train()
        
        # Save model
        self.trainer.save_model()
        
        # Evaluate
        eval_result = self.trainer.evaluate()
        
        return {
            'train_result': train_result,
            'eval_result': eval_result,
            'model_path': output_dir
        }


class FineTuningService:
    """Main fine-tuning service for LOGOS Ecosystem"""
    
    def __init__(self):
        self.model_registry = ModelRegistry()
        self.cache = cache_manager
        self.training_jobs: Dict[str, Dict[str, Any]] = {}
        self.models_dir = Path(settings.MODELS_DIR) / "fine_tuned"
        self.models_dir.mkdir(parents=True, exist_ok=True)
    
    async def create_training_job(self,
                                name: str,
                                description: str,
                                dataset: TrainingDataset,
                                config: TrainingConfig) -> str:
        """Create a new training job"""
        job_id = hashlib.md5(f"{name}_{datetime.utcnow()}".encode()).hexdigest()[:12]
        
        self.training_jobs[job_id] = {
            'id': job_id,
            'name': name,
            'description': description,
            'config': config,
            'dataset': dataset,
            'status': TrainingStatus.PREPARING,
            'created_at': datetime.utcnow(),
            'started_at': None,
            'completed_at': None,
            'metrics': [],
            'error': None
        }
        
        # Start training asynchronously
        asyncio.create_task(self._run_training_job(job_id))
        
        return job_id
    
    async def _run_training_job(self, job_id: str):
        """Run training job asynchronously"""
        job = self.training_jobs[job_id]
        
        try:
            # Update status
            job['status'] = TrainingStatus.TRAINING
            job['started_at'] = datetime.utcnow()
            
            # Create output directory
            output_dir = self.models_dir / job_id
            output_dir.mkdir(exist_ok=True)
            
            # Initialize trainer
            trainer = ModelTrainer(job['config'])
            
            # Train model
            result = trainer.train(
                dataset=job['dataset'],
                output_dir=str(output_dir)
            )
            
            # Update job with results
            job['status'] = TrainingStatus.COMPLETED
            job['completed_at'] = datetime.utcnow()
            job['result'] = result
            job['model_path'] = str(output_dir)
            
            # Register model
            await self._register_fine_tuned_model(job)
            
        except Exception as e:
            logger.error(f"Training job {job_id} failed: {str(e)}")
            job['status'] = TrainingStatus.FAILED
            job['error'] = str(e)
            job['completed_at'] = datetime.utcnow()
    
    async def _register_fine_tuned_model(self, job: Dict[str, Any]):
        """Register fine-tuned model in model registry"""
        await self.model_registry.register_model(
            name=job['name'],
            version="1.0",
            model_type="fine_tuned",
            provider="local",
            config={
                'base_model': job['config'].base_model,
                'model_type': job['config'].model_type.value,
                'training_config': {
                    'epochs': job['config'].num_epochs,
                    'learning_rate': job['config'].learning_rate,
                    'batch_size': job['config'].train_batch_size
                }
            },
            metadata={
                'job_id': job['id'],
                'description': job['description'],
                'model_path': job['model_path'],
                'training_duration': (
                    job['completed_at'] - job['started_at']
                ).total_seconds() if job.get('completed_at') else None,
                'final_metrics': job.get('result', {}).get('eval_result', {})
            }
        )
    
    async def get_training_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get status of a training job"""
        job = self.training_jobs.get(job_id)
        if not job:
            raise ValueError(f"Training job {job_id} not found")
        
        return {
            'id': job['id'],
            'name': job['name'],
            'status': job['status'].value,
            'created_at': job['created_at'].isoformat(),
            'started_at': job['started_at'].isoformat() if job['started_at'] else None,
            'completed_at': job['completed_at'].isoformat() if job['completed_at'] else None,
            'error': job.get('error'),
            'metrics': job.get('result', {}).get('eval_result', {}) if job['status'] == TrainingStatus.COMPLETED else None
        }
    
    async def list_training_jobs(self, status: Optional[TrainingStatus] = None) -> List[Dict[str, Any]]:
        """List all training jobs"""
        jobs = []
        
        for job in self.training_jobs.values():
            if status is None or job['status'] == status:
                jobs.append(await self.get_training_job_status(job['id']))
        
        return sorted(jobs, key=lambda x: x['created_at'], reverse=True)
    
    async def prepare_dataset_from_conversations(self,
                                               conversations: List[List[Dict[str, str]]],
                                               test_size: float = 0.1,
                                               val_size: float = 0.1) -> TrainingDataset:
        """Prepare dataset from conversation data"""
        # Prepare data
        prepared_data = DatasetPreparation.prepare_conversation_data(conversations)
        
        # Split data
        train_data, test_data = train_test_split(
            prepared_data, 
            test_size=test_size, 
            random_state=42
        )
        
        train_data, eval_data = train_test_split(
            train_data,
            test_size=val_size / (1 - test_size),
            random_state=42
        )
        
        return TrainingDataset(
            train_data=train_data,
            eval_data=eval_data,
            test_data=test_data,
            metadata={
                'total_samples': len(prepared_data),
                'train_samples': len(train_data),
                'eval_samples': len(eval_data),
                'test_samples': len(test_data)
            }
        )
    
    async def prepare_classification_dataset(self,
                                          texts: List[str],
                                          labels: List[Union[str, int]],
                                          test_size: float = 0.1,
                                          val_size: float = 0.1) -> TrainingDataset:
        """Prepare classification dataset"""
        # Prepare data
        prepared_data, label_mapping = DatasetPreparation.prepare_classification_data(texts, labels)
        
        # Split data
        train_data, test_data = train_test_split(
            prepared_data,
            test_size=test_size,
            random_state=42,
            stratify=[d['label'] for d in prepared_data]
        )
        
        train_data, eval_data = train_test_split(
            train_data,
            test_size=val_size / (1 - test_size),
            random_state=42,
            stratify=[d['label'] for d in train_data]
        )
        
        return TrainingDataset(
            train_data=train_data,
            eval_data=eval_data,
            test_data=test_data,
            label_mapping=label_mapping,
            metadata={
                'num_classes': len(label_mapping) if label_mapping else len(set(labels)),
                'class_distribution': {
                    'train': self._calculate_class_distribution(train_data),
                    'eval': self._calculate_class_distribution(eval_data),
                    'test': self._calculate_class_distribution(test_data)
                }
            }
        )
    
    def _calculate_class_distribution(self, data: List[Dict[str, Any]]) -> Dict[int, int]:
        """Calculate class distribution in dataset"""
        distribution = {}
        for item in data:
            label = item['label']
            distribution[label] = distribution.get(label, 0) + 1
        return distribution
    
    async def fine_tune_openai_model(self,
                                   training_file: str,
                                   model: str = "gpt-3.5-turbo",
                                   n_epochs: int = 3,
                                   suffix: Optional[str] = None) -> Dict[str, Any]:
        """Fine-tune OpenAI model"""
        if not OPENAI_AVAILABLE:
            raise RuntimeError("OpenAI library not available")
        
        # Upload training file
        with open(training_file, 'rb') as f:
            upload_response = await openai.File.create(
                file=f,
                purpose='fine-tune'
            )
        
        # Create fine-tuning job
        fine_tune_response = await openai.FineTuningJob.create(
            training_file=upload_response.id,
            model=model,
            hyperparameters={
                "n_epochs": n_epochs
            },
            suffix=suffix
        )
        
        job_id = fine_tune_response.id
        
        # Monitor job status
        while True:
            job_status = await openai.FineTuningJob.retrieve(job_id)
            
            if job_status.status == 'succeeded':
                return {
                    'status': 'completed',
                    'model_id': job_status.fine_tuned_model,
                    'job_id': job_id
                }
            elif job_status.status == 'failed':
                return {
                    'status': 'failed',
                    'error': job_status.error,
                    'job_id': job_id
                }
            
            await asyncio.sleep(30)  # Check every 30 seconds
    
    async def evaluate_fine_tuned_model(self,
                                      model_path: str,
                                      test_dataset: List[Dict[str, Any]],
                                      model_type: ModelType) -> Dict[str, Any]:
        """Evaluate a fine-tuned model"""
        if not TRANSFORMERS_AVAILABLE:
            raise RuntimeError("Transformers library not available")
        
        # Load model and tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        
        if model_type == ModelType.CAUSAL_LM:
            model = AutoModelForCausalLM.from_pretrained(model_path)
        elif model_type == ModelType.SEQUENCE_CLASSIFICATION:
            model = AutoModelForSequenceClassification.from_pretrained(model_path)
        
        # Create test dataset
        test_data = CustomDataset(
            test_dataset,
            tokenizer,
            max_length=512,
            model_type=model_type
        )
        
        # Evaluate
        trainer = Trainer(
            model=model,
            tokenizer=tokenizer,
            compute_metrics=self.compute_metrics if model_type == ModelType.SEQUENCE_CLASSIFICATION else None
        )
        
        results = trainer.evaluate(eval_dataset=test_data)
        
        return results
    
    async def export_model(self,
                         job_id: str,
                         export_format: str = "onnx") -> str:
        """Export fine-tuned model to different formats"""
        job = self.training_jobs.get(job_id)
        if not job or job['status'] != TrainingStatus.COMPLETED:
            raise ValueError(f"Training job {job_id} not found or not completed")
        
        model_path = Path(job['model_path'])
        export_path = model_path / f"exported_{export_format}"
        export_path.mkdir(exist_ok=True)
        
        if export_format == "onnx":
            # Export to ONNX format
            from transformers import AutoTokenizer
            from optimum.onnxruntime import ORTModelForCausalLM
            
            model = ORTModelForCausalLM.from_pretrained(
                model_path,
                export=True
            )
            model.save_pretrained(export_path)
            
            # Copy tokenizer
            tokenizer = AutoTokenizer.from_pretrained(model_path)
            tokenizer.save_pretrained(export_path)
        
        elif export_format == "tflite":
            # Export to TensorFlow Lite
            # Implementation for TFLite export
            pass
        
        return str(export_path)


# Singleton instance
_fine_tuning_service: Optional[FineTuningService] = None


def get_fine_tuning_service() -> FineTuningService:
    """Get or create fine-tuning service instance"""
    global _fine_tuning_service
    if _fine_tuning_service is None:
        _fine_tuning_service = FineTuningService()
    return _fine_tuning_service