#!/usr/bin/env python3
"""
Real-Time Telegram Signal Listener
Handles 500+ channels with rate limiting and async message processing
"""

import asyncio
import logging
import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Set, Any
from dataclasses import dataclass
import hashlib

try:
    from telethon import TelegramClient, events
    from telethon.tl.types import MessageMediaPhoto, MessageMediaDocument
except ImportError:
    print("Installing Telethon...")
    os.system("pip install telethon")
    from telethon import TelegramClient, events
    from telethon.tl.types import MessageMediaPhoto, MessageMediaDocument

from ..parser.advanced_signal_parser import AdvancedSignalParser, SignalQueue

logger = logging.getLogger(__name__)

@dataclass
class TelegramSession:
    session_name: str
    phone_number: str
    api_id: str
    api_hash: str
    is_active: bool = True
    channels_monitored: int = 0
    messages_processed: int = 0
    rate_limit_hits: int = 0

class TelegramListener:
    def __init__(self, config_path: str = "core/storage/telegram_config.json"):
        self.config_path = config_path
        self.sessions: Dict[str, TelegramClient] = {}
        self.monitored_channels: Set[str] = set()
        self.message_queue = asyncio.Queue(maxsize=10000)
        self.parser = AdvancedSignalParser()
        self.signal_queue = SignalQueue()
        self.processed_messages: Set[str] = set()
        self.rate_limiter = {}
        
    async def initialize(self):
        """Initialize Telegram sessions from config"""
        try:
            config = self._load_config()
            
            for session_config in config.get('sessions', []):
                await self._create_session(session_config)
                
            logger.info(f"Initialized {len(self.sessions)} Telegram sessions")
            
        except Exception as e:
            logger.error(f"Failed to initialize Telegram listener: {e}")
            
    async def _create_session(self, config: Dict[str, Any]):
        """Create and configure Telegram session"""
        try:
            session_name = config['session_name']
            client = TelegramClient(
                session_name,
                config['api_id'],
                config['api_hash']
            )
            
            await client.start(phone=config['phone_number'])
            
            # Register event handlers
            @client.on(events.NewMessage())
            async def message_handler(event):
                await self._handle_message(event, session_name)
            
            self.sessions[session_name] = client
            logger.info(f"Session {session_name} connected successfully")
            
        except Exception as e:
            logger.error(f"Failed to create session {config.get('session_name')}: {e}")
    
    async def _handle_message(self, event, session_name: str):
        """Handle incoming Telegram message with rate limiting"""
        try:
            # Rate limiting check
            if not await self._check_rate_limit(session_name):
                return
            
            message = event.message
            chat = await event.get_chat()
            
            # Create message fingerprint
            message_id = f"{chat.id}_{message.id}"
            
            # Skip already processed messages
            if message_id in self.processed_messages:
                return
                
            self.processed_messages.add(message_id)
            
            # Extract message data
            message_data = {
                'text': message.text or '',
                'chat_id': chat.id,
                'chat_title': getattr(chat, 'title', 'Unknown'),
                'message_id': message.id,
                'date': message.date.isoformat(),
                'session': session_name,
                'media': None
            }
            
            # Handle media messages
            if message.media:
                if isinstance(message.media, (MessageMediaPhoto, MessageMediaDocument)):
                    media_path = await self._download_media(message, chat.id, message.id)
                    message_data['media'] = media_path
                    
                    # Extract caption
                    if hasattr(message, 'caption') and message.caption:
                        message_data['text'] = message.caption
            
            # Add to processing queue
            await self.message_queue.put(message_data)
            
            logger.debug(f"Queued message from {chat.title}: {len(message_data['text'])} chars")
            
        except Exception as e:
            logger.error(f"Error handling message: {e}")
    
    async def _download_media(self, message, chat_id: int, message_id: int) -> Optional[str]:
        """Download and save media files"""
        try:
            # Create media directory
            media_dir = f"core/storage/media/{chat_id}"
            os.makedirs(media_dir, exist_ok=True)
            
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_{message_id}"
            
            # Download media
            file_path = await message.download_media(
                file=os.path.join(media_dir, filename)
            )
            
            logger.info(f"Downloaded media: {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"Failed to download media: {e}")
            return None
    
    async def _check_rate_limit(self, session_name: str) -> bool:
        """Check rate limiting for session"""
        now = datetime.now().timestamp()
        
        if session_name not in self.rate_limiter:
            self.rate_limiter[session_name] = {'count': 0, 'reset_time': now + 60}
            
        limiter = self.rate_limiter[session_name]
        
        # Reset counter if time window passed
        if now > limiter['reset_time']:
            limiter['count'] = 0
            limiter['reset_time'] = now + 60
            
        # Check if under limit (100 messages per minute per session)
        if limiter['count'] >= 100:
            logger.warning(f"Rate limit hit for session {session_name}")
            return False
            
        limiter['count'] += 1
        return True
    
    async def process_message_queue(self):
        """Process messages from queue"""
        while True:
            try:
                # Get message from queue with timeout
                message_data = await asyncio.wait_for(
                    self.message_queue.get(),
                    timeout=1.0
                )
                
                await self._process_message(message_data)
                self.message_queue.task_done()
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error processing message queue: {e}")
                await asyncio.sleep(1)
    
    async def _process_message(self, message_data: Dict[str, Any]):
        """Process individual message"""
        try:
            text = message_data.get('text', '')
            
            # Skip empty messages
            if not text.strip() and not message_data.get('media'):
                return
            
            # Handle image messages with OCR
            if message_data.get('media') and not text.strip():
                text = await self._extract_text_from_image(message_data['media'])
                if not text:
                    return
            
            # Parse signal
            signal_data = {
                'raw_text': text,
                'source': 'image' if message_data.get('media') else 'text',
                'channel_id': message_data['chat_id'],
                'image_path': message_data.get('media')
            }
            
            await self.signal_queue.add_signal(signal_data, priority=7)
            
            logger.info(f"Signal queued from {message_data['chat_title']}")
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
    
    async def _extract_text_from_image(self, image_path: str) -> Optional[str]:
        """Extract text from image using OCR"""
        try:
            # Import OCR module
            from ..ocr.image_processor import ImageOCRProcessor
            
            ocr_processor = ImageOCRProcessor()
            extracted_text = await ocr_processor.extract_text(image_path)
            
            return extracted_text
            
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            return None
    
    async def add_channels(self, channel_list: List[str]):
        """Add channels to monitoring list"""
        for channel in channel_list:
            self.monitored_channels.add(channel)
            
        # Join channels in all sessions
        for session_name, client in self.sessions.items():
            try:
                for channel in channel_list:
                    await client.get_entity(channel)
                    logger.info(f"Monitoring {channel} in session {session_name}")
                    
            except Exception as e:
                logger.error(f"Failed to join {channel} in {session_name}: {e}")
    
    async def start_monitoring(self):
        """Start monitoring all configured channels"""
        # Start message processing
        processing_task = asyncio.create_task(self.process_message_queue())
        
        # Start signal queue processing
        signal_processing_task = asyncio.create_task(
            self.signal_queue.process_queue(self.parser)
        )
        
        logger.info("Started Telegram monitoring with signal processing")
        
        # Keep services running
        await asyncio.gather(processing_task, signal_processing_task)
    
    def _load_config(self) -> Dict[str, Any]:
        """Load Telegram configuration"""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            # Create default config
            default_config = {
                'sessions': [
                    {
                        'session_name': 'main_session',
                        'phone_number': '',
                        'api_id': '',
                        'api_hash': ''
                    }
                ],
                'channels': [
                    '@ForexSignals',
                    '@GoldSignals',
                    '@CryptoTrading'
                ]
            }
            
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            with open(self.config_path, 'w') as f:
                json.dump(default_config, f, indent=2)
                
            logger.info(f"Created default config at {self.config_path}")
            return default_config
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get monitoring statistics"""
        stats = {
            'active_sessions': len(self.sessions),
            'monitored_channels': len(self.monitored_channels),
            'queue_size': self.message_queue.qsize(),
            'processed_messages': len(self.processed_messages),
            'rate_limits': {name: data['count'] for name, data in self.rate_limiter.items()}
        }
        
        return stats
    
    async def stop(self):
        """Stop all Telegram sessions"""
        for session_name, client in self.sessions.items():
            try:
                await client.disconnect()
                logger.info(f"Disconnected session {session_name}")
            except Exception as e:
                logger.error(f"Error disconnecting {session_name}: {e}")

# Multi-session manager for handling 500+ channels
class MultiSessionManager:
    def __init__(self):
        self.listeners: List[TelegramListener] = []
        self.channel_distribution: Dict[str, int] = {}
        
    async def setup_sessions(self, session_configs: List[Dict[str, Any]]):
        """Setup multiple Telegram sessions for load distribution"""
        for config in session_configs:
            listener = TelegramListener()
            await listener._create_session(config)
            self.listeners.append(listener)
            
    async def distribute_channels(self, channels: List[str], max_per_session: int = 100):
        """Distribute channels across sessions to avoid rate limits"""
        for i, channel in enumerate(channels):
            session_index = i % len(self.listeners)
            await self.listeners[session_index].add_channels([channel])
            self.channel_distribution[channel] = session_index
            
    async def start_all(self):
        """Start monitoring on all sessions"""
        tasks = []
        for listener in self.listeners:
            tasks.append(asyncio.create_task(listener.start_monitoring()))
            
        await asyncio.gather(*tasks)

# Example usage
async def main():
    """Example usage of Telegram listener"""
    listener = TelegramListener()
    
    # Initialize and start monitoring
    await listener.initialize()
    
    # Add channels to monitor
    channels = ['@ForexSignals', '@GoldTrading', '@CryptoSignals']
    await listener.add_channels(channels)
    
    # Start monitoring
    await listener.start_monitoring()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())