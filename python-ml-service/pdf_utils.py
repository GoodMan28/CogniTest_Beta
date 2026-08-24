import pymupdf
import base64
import os

def pdf_page_to_base64_image(pdf_path: str, page_number: int, zoom_x: float = 2.0, zoom_y: float = 2.0) -> str:
    """
    Converts a specific page of a PDF to a high-resolution base64 encoded PNG image.
    """
    try:
        doc = pymupdf.open(pdf_path)
        if page_number < 0 or page_number >= len(doc):
            raise ValueError(f"Page number {page_number} out of range for {pdf_path}")
            
        page = doc[page_number]
        # Increase zoom for better OCR quality
        mat = pymupdf.Matrix(zoom_x, zoom_y)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        
        # Convert to PNG bytes
        img_bytes = pix.tobytes("png")
        
        # Encode to Base64
        return base64.b64encode(img_bytes).decode("utf-8")
    except Exception as e:
        print(f"Error converting PDF page to image: {e}")
        return ""

def get_pdf_page_count(pdf_path: str) -> int:
    try:
        doc = pymupdf.open(pdf_path)
        return len(doc)
    except Exception as e:
        print(f"Error opening PDF: {e}")
        return 0
