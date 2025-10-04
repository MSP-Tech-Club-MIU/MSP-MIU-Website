import sys
import re
import json
import pdfplumber

DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]
TIME_RANGE_RE = re.compile(
    r'\d{1,2}:\d{2}\s*(?:AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM)',
    re.I
)

def clean(text):
    """Normalize cell text by removing newlines and extra spaces."""
    if not text:
        return ""
    return " ".join(text.split())

def parse_schedule(pdf_path):
    buckets = {d: [] for d in DAYS}

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if not table:
                continue

            headers = table[0]  # first row = table header
            for row in table[1:]:
                if not row or not row[0]:
                    continue

                code = clean(row[0])
                name = clean(row[1]) if len(row) > 1 else ""
                course_label = f"{code} - {name}" if code and name else code or name

                # Loop over the 6 day columns (Sat→Thu)
                for i, day in enumerate(DAYS, start=3):
                    if i >= len(row):
                        continue
                    cell = clean(row[i]) if row[i] else ""
                    if not cell:
                        continue

                    times = TIME_RANGE_RE.findall(cell)
                    for t in times:
                        buckets[day].append({
                            "course": course_label,
                            "time": t.strip()
                        })

    # Optional: sort each day's sessions by time
    for d in DAYS:
        buckets[d].sort(key=lambda x: x["time"])

    return buckets

def main(pdf_path):
    buckets = parse_schedule(pdf_path)
    print(json.dumps(buckets, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pdfparse.py <StudentSchedule.pdf>")
        sys.exit(1)
    main(sys.argv[1])
