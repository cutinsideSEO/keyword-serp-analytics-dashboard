"""Utilities for Supabase RPC response handling.

Supabase RPC can return data in multiple formats:
- Direct dict: {"field": "value"}
- Wrapped in list: [{"field": "value"}]
- Wrapped with function name: {"function_name": {"field": "value"}}
- Combination: [{"function_name": {"field": "value"}}]

These helpers normalize all formats to consistent Python types.
"""
from typing import Any, Dict, List, Optional


def unwrap_rpc_single(data: Any, function_name: Optional[str] = None) -> Dict:
    """
    Unwrap RPC response that should return a single object.

    Args:
        data: Raw RPC response (result.data)
        function_name: Optional RPC function name for nested unwrapping

    Returns:
        Dict with the response data, or empty dict if None/invalid

    Example:
        >>> result = client.rpc("get_kpis", {...}).execute()
        >>> data = unwrap_rpc_single(result.data, "get_kpis")
    """
    if data is None:
        return {}
    # Unwrap list wrapper
    if isinstance(data, list):
        data = data[0] if len(data) > 0 else {}
    # Unwrap function name wrapper
    if isinstance(data, dict) and function_name and function_name in data:
        data = data[function_name]
    return data if isinstance(data, dict) else {}


def unwrap_rpc_list(data: Any) -> List[Dict]:
    """
    Unwrap RPC response that should return a list of objects.

    Args:
        data: Raw RPC response (result.data)

    Returns:
        List of dicts, or empty list if None/invalid

    Example:
        >>> result = client.rpc("get_items", {...}).execute()
        >>> items = unwrap_rpc_list(result.data)
    """
    if data is None:
        return []
    if isinstance(data, list):
        return data
    # Handle {"items": [...]} wrapper
    if isinstance(data, dict) and "items" in data:
        return data["items"]
    # Single item returned as dict
    return [data] if isinstance(data, dict) else []
