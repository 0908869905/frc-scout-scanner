
import sys
try:
    from pypdf import PdfReader
except ImportError:
    print("pypdf mismatch")
    sys.exit(1)

reader = PdfReader("2026GameManual.pdf")
with open("game_manual.txt", "w", encoding="utf-8") as f:
    for page in reader.pages:
        text = page.extract_text()
        f.write(text)
        f.write("\n")
print("Extraction complete.")
