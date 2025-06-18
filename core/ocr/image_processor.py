#!/usr/bin/env python3
"""
Advanced OCR Image Processor for Trading Signals
Handles image-based signals with fallback mechanisms and preprocessing
"""

import os
import asyncio
import logging
from typing import Optional, Dict, Any
import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

try:
    import easyocr
except ImportError:
    print("Installing EasyOCR...")
    os.system("pip install easyocr")
    import easyocr

logger = logging.getLogger(__name__)

class ImageOCRProcessor:
    def __init__(self):
        self.reader = None
        self.fallback_enabled = True
        self.preprocessing_enabled = True
        
    async def initialize(self):
        """Initialize OCR reader with error handling"""
        try:
            self.reader = easyocr.Reader(['en'], gpu=False)
            logger.info("OCR processor initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OCR: {e}")
            self.reader = None
    
    async def extract_text(self, image_path: str) -> Optional[str]:
        """Extract text from image with preprocessing and fallback"""
        try:
            if not self.reader:
                await self.initialize()
                
            if not self.reader:
                logger.error("OCR reader not available")
                return None
                
            # Preprocess image
            processed_image = await self._preprocess_image(image_path)
            
            # Extract text
            if processed_image is not None:
                result = self.reader.readtext(processed_image)
                extracted_text = self._combine_text_results(result)
                
                if extracted_text.strip():
                    logger.info(f"OCR extracted: {len(extracted_text)} characters")
                    return extracted_text
                    
            # Fallback: try original image
            if self.fallback_enabled:
                result = self.reader.readtext(image_path)
                extracted_text = self._combine_text_results(result)
                
                if extracted_text.strip():
                    logger.info("OCR successful with fallback")
                    return extracted_text
                    
            logger.warning("OCR extraction returned empty result")
            return None
            
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            return None
    
    async def _preprocess_image(self, image_path: str) -> Optional[np.ndarray]:
        """Preprocess image for better OCR accuracy"""
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                return None
                
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply noise reduction
            denoised = cv2.fastNlMeansDenoising(gray)
            
            # Enhance contrast
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(denoised)
            
            # Apply threshold
            _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Morphological operations to clean up
            kernel = np.ones((1,1), np.uint8)
            cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            return cleaned
            
        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            return None
    
    def _combine_text_results(self, ocr_results) -> str:
        """Combine OCR results into readable text"""
        try:
            text_parts = []
            
            for detection in ocr_results:
                if len(detection) >= 2:
                    text = detection[1]
                    confidence = detection[2] if len(detection) > 2 else 1.0
                    
                    # Filter by confidence
                    if confidence > 0.5:
                        text_parts.append(text)
            
            return ' '.join(text_parts)
            
        except Exception as e:
            logger.error(f"Failed to combine OCR results: {e}")
            return ""
    
    async def batch_process(self, image_paths: list) -> Dict[str, str]:
        """Process multiple images in batch"""
        results = {}
        
        for image_path in image_paths:
            try:
                text = await self.extract_text(image_path)
                results[image_path] = text or ""
            except Exception as e:
                logger.error(f"Batch processing error for {image_path}: {e}")
                results[image_path] = ""
                
        return results
    
    async def validate_image(self, image_path: str) -> bool:
        """Validate if image is suitable for OCR"""
        try:
            # Check file exists
            if not os.path.exists(image_path):
                return False
                
            # Check file size
            file_size = os.path.getsize(image_path)
            if file_size < 1024:  # Less than 1KB
                return False
                
            # Try to load image
            image = cv2.imread(image_path)
            if image is None:
                return False
                
            # Check dimensions
            height, width = image.shape[:2]
            if height < 50 or width < 50:
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Image validation failed: {e}")
            return False

# Alternative OCR using Tesseract (fallback)
class TesseractOCRProcessor:
    def __init__(self):
        self.available = False
        self._check_availability()
    
    def _check_availability(self):
        """Check if Tesseract is available"""
        try:
            import pytesseract
            self.available = True
            logger.info("Tesseract OCR available as fallback")
        except ImportError:
            logger.warning("Tesseract OCR not available")
    
    async def extract_text(self, image_path: str) -> Optional[str]:
        """Extract text using Tesseract"""
        if not self.available:
            return None
            
        try:
            import pytesseract
            from PIL import Image
            
            image = Image.open(image_path)
            text = pytesseract.image_to_string(image)
            
            return text.strip() if text else None
            
        except Exception as e:
            logger.error(f"Tesseract OCR failed: {e}")
            return None