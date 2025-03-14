from byaldi import RAGMultiModalModel
from typing import Dict
import time
import threading
import os



class ModelManager:
    def __init__(self):
        self.models: Dict[str, tuple[RAGMultiModalModel, float]] = {}
        self.cache_timeout = 3600  
        self._start_cleanup_thread()

    def _start_cleanup_thread(self):
        def cleanup_loop():
            while True:
                self.clear_cache()
                time.sleep(300)  

        # Start cleanup thread as daemon so it doesn't prevent app shutdown
        cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
        cleanup_thread.start()

    def get_model(self, index_path: str, index_root: str, device: str = "mps") -> RAGMultiModalModel:
        current_time = time.time()
        
        # Check if model exists
        if index_root in self.models:
            model, _ = self.models[index_root]
            # Update timestamp on access
            self.models[index_root] = (model, current_time)
            return model
        
        # Load new model
        model = RAGMultiModalModel.from_index(
            index_path=index_path, 
            index_root=index_root, 
            device=device
        )
        
        # Cache model with timestamp
        self.models[index_root] = (model, current_time)
        return model

    def clear_cache(self):
        current_time = time.time()
        expired_keys = [
            key for key, (_, timestamp) in self.models.items() 
            if current_time - timestamp > self.cache_timeout
        ]
        for key in expired_keys:
            del self.models[key]
            print(f"Cleared model for index {key} from cache")  # Optional logging
