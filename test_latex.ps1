# Simple test script for LaTeX resume generator
$bodyJson = @'
{
  "full_name": "Kalicharan Upadhayay",
  "email": "kalicharan.upadhayay@example.com",
  "phone": "+91 98238 65388",
  "location": "Pune, Maharashtra",
  "linkedin": "https://www.linkedin.com/in/kalicharan-upadhayay-2637b4324",
  "github": "https://github.com/akashupadhayay106-au",
  "portfolio": "https://akashupadhayay106-au.github.io/portfolio-with-chatbot/",
  "summary": "Detail-oriented Data Analyst with strong expertise in data collection, data cleaning, and preprocessing using Python and SQL.",
  "skills_programming": "Python (Pandas, NumPy), SQL",
  "skills_data_analysis": "Data Collection, Data Cleaning, Data Preprocessing, EDA",
  "skills_tools": "Power BI, Tableau, Excel Charts, Jupyter Notebook, Git",
  "education": [
    {
      "degree": "BBA (Computer Applications)",
      "institution": "E.S. Divekar College",
      "location": "Varvand",
      "dates": "Jul 2022 -- May 2025",
      "gpa": "6.83"
    }
  ],
  "experience": [
    {
      "title": "Data Science Trainer",
      "company": "Skillected JSSAV Education Pvt Ltd",
      "location": "Koregaon Park, Pune",
      "dates": "Feb 2026 -- Present",
      "bullets": [
        "Deliver training on data collection, cleaning, and preprocessing using real-world datasets.",
        "Perform Exploratory Data Analysis (EDA) to identify trends and patterns.",
        "Use tools like Jupyter and Pandas for analysis."
      ]
    }
  ],
  "projects": [
    {
      "name": "Sales and Inventory Data Analysis",
      "description": [
        "Collected and cleaned 12K+ records using Python (Pandas).",
        "Performed EDA to identify trends and business patterns.",
        "Built Power BI dashboards for actionable insights."
      ]
    }
  ],
  "achievements": [
    "Delivered live YouTube sessions teaching Data Science projects from scratch."
  ],
  "certifications": [
    "Data Science Certification",
    "Python for Data Analysis"
  ]
}
'@

Write-Host "Testing LaTeX resume generation..."
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8088/api/generate-latex-resume" -Method Post -Body $bodyJson -ContentType "application/json"
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
    Write-Host "SUCCESS: LaTeX generated successfully!"
    Write-Host "Filename: $($result.filename)"
    Write-Host ""
    Write-Host "FULL LATEX CODE FROM API:"
    Write-Host "----------------------------------------"
    Write-Host $result.latex_code
    Write-Host "----------------------------------------"
    $result.latex_code | Out-File -FilePath "test_resume.tex" -Encoding utf8
    Write-Host ""
    Write-Host "Saved to: test_resume.tex"
} else {
    Write-Host "ERROR: Failed to generate LaTeX"
    Write-Host "Error: $($result.error)"
}
} catch {
    Write-Host "NETWORK ERROR: $($_.Exception.Message)"
}
