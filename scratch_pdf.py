import pymupdf

def test_pdf():
    try:
        doc = pymupdf.open('C:/Users/Abhineet Anand/Desktop/CogniTest/Sample_material/Physics/Study Package 1.pdf')
        print(f"Total Pages: {len(doc)}")
        for i in range(min(20, len(doc))):
            text = doc[i].get_text()
            if text.strip():
                print(f'---MAIN PDF PAGE {i}---')
                print(text[:200].encode('utf-8', 'ignore').decode('utf-8'))
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    test_pdf()
