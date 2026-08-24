import os
import pymupdf

def calculate_pdf_pages(directory):
    total_pages = 0
    pdf_count = 0
    for root, _, files in os.walk(directory):
        for file in files:
            if file.lower().endswith('.pdf'):
                try:
                    pdf_path = os.path.join(root, file)
                    doc = pymupdf.open(pdf_path)
                    total_pages += len(doc)
                    pdf_count += 1
                except Exception as e:
                    print(f"Error opening {file}: {e}")
    return total_pages, pdf_count

if __name__ == '__main__':
    directory = 'C:/Users/Abhineet Anand/Desktop/CogniTest/Sample_material'
    total_pages, pdf_count = calculate_pdf_pages(directory)
    print(f"Total PDFs found: {pdf_count}")
    print(f"Total pages across all PDFs: {total_pages}")
    print(f"Estimated Cost at $0.015 per page: ${total_pages * 0.015:.2f}")
