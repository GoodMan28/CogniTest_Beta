import json
import defusedxml.ElementTree as ET
from defusedxml.common import DTDForbidden, EntitiesForbidden
from bson import BSON

MAX_BSON_SIZE = 16 * 1024 * 1024 # 16 MB

def check_bson_size(doc: dict) -> int:
    size = len(BSON.encode(doc))
    if size > MAX_BSON_SIZE:
        raise ValueError(f"Document exceeds MongoDB BSON limit: {size} > {MAX_BSON_SIZE}")
    return size

def sanitize_svg(svg_content: str) -> str:
    """
    Parses and serializes SVG safely to remove any DTDs, external entities, etc.
    """
    try:
        root = ET.fromstring(svg_content)
        # Check if the root tag is svg (ignoring namespace)
        if not root.tag.endswith('svg'):
            raise ValueError("Root element is not svg")
        return ET.tostring(root, encoding="unicode")
    except (DTDForbidden, EntitiesForbidden, ET.ParseError) as e:
        raise ValueError(f"Invalid or unsafe SVG content: {str(e)}")
