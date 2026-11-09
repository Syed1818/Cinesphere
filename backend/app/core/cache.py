import time
from typing import Any, Dict, Optional, Tuple
from loguru import logger

# Bounded in-memory TTL cache storage: key -> (expires_at_timestamp, stored_value)
_memory_cache: Dict[str, Tuple[float, Any]] = {}
MAX_CACHE_ENTRIES: int = 1000


def _prune_expired():
    """Internal helper to prune expired cache items when reaching capacity."""
    now = time.time()
    expired = [k for k, (exp, _) in _memory_cache.items() if now > exp]
    for k in expired:
        _memory_cache.pop(k, None)
    # If still exceeding capacity, evict oldest 20%
    if len(_memory_cache) >= MAX_CACHE_ENTRIES:
        sorted_keys = sorted(_memory_cache.keys(), key=lambda k: _memory_cache[k][0])
        for k in sorted_keys[: len(sorted_keys) // 5]:
            _memory_cache.pop(k, None)


async def init_cache():
    """Initializes in-memory cache storage."""
    _memory_cache.clear()
    logger.info("In-memory TTL cache initialized.")


async def close_cache():
    """Cleans up in-memory cache storage."""
    _memory_cache.clear()
    logger.info("In-memory cache cleared.")


async def cache_get(key: str) -> Optional[Any]:
    """Retrieves an item from the in-memory cache if it hasn't expired."""
    entry = _memory_cache.get(key)
    if not entry:
        return None
    expires_at, value = entry
    if time.time() > expires_at:
        _memory_cache.pop(key, None)
        return None
    return value


async def cache_set(key: str, value: Any, ttl_seconds: int = 3600):
    """Stores an item in the in-memory cache with a TTL (seconds), pruning if capacity exceeded."""
    if len(_memory_cache) >= MAX_CACHE_ENTRIES:
        _prune_expired()
    expires_at = time.time() + ttl_seconds
    _memory_cache[key] = (expires_at, value)


async def cache_delete(key: str):
    """Deletes an exact key from the in-memory cache."""
    _memory_cache.pop(key, None)


async def cache_delete_pattern(pattern: str):
    """Deletes keys matching a wildcard prefix (e.g. 'recs:user:*')."""
    prefix = pattern.replace("*", "")
    to_delete = [k for k in _memory_cache if k.startswith(prefix)]
    for k in to_delete:
        _memory_cache.pop(k, None)
