"""
LaTeX Resume Generator Service
Generates professional LaTeX resume from structured resume data using Jinja2 templates
"""
from jinja2 import Template

LATEX_TEMPLATE = r"""
\documentclass[letterpaper,10.8pt]{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}

{% if style_preset == "elegant" %}
\usepackage{charter}
{% elif style_preset == "technical" %}
\usepackage[scaled]{helvet}
\renewcommand{\familydefault}{\sfdefault}
{% endif %}

\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

{% if style_preset == "elegant" %}
\addtolength{\oddsidemargin}{-0.4in}
\addtolength{\evensidemargin}{-0.4in}
\addtolength{\textwidth}{0.8in}
\addtolength{\topmargin}{-.5in}
\addtolength{\textheight}{1.0in}
{% else %}
\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.6in}
\addtolength{\textheight}{1.1in}
{% endif %}

\urlstyle{same}
\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

\pdfgentounicode=1

\begin{document}

%----------HEADING----------
\begin{center}
    \textbf{\Huge \scshape {{ full_name }}} \\ \vspace{1pt}
    \small {{ contact_line }}
\end{center}

%-----------SUMMARY-----------
\section{Summary}
{{ summary }}

%-----------SKILLS-----------
\section{Skills}
\begin{itemize}[leftmargin=0.15in]
    \item \textbf{Programming:} {{ skills_programming }}
    \item \textbf{Data Analysis:} {{ skills_data_analysis }}
    \item \textbf{Tools:} {{ skills_tools }}
\end{itemize}

%-----------EXPERIENCE-----------
\section{Professional Experience}
\begin{itemize}[leftmargin=0.15in, label={}]
{{ experience_items }}
\end{itemize}

%-----------PROJECTS-----------
\section{Projects}
\begin{itemize}[leftmargin=0.15in]
{{ projects_items }}
\end{itemize}

%-----------EDUCATION-----------
\section{Education}
\begin{itemize}[leftmargin=0.15in, label={}]
{{ education_items }}
\end{itemize}

{% if show_achievements %}
%-----------ACHIEVEMENTS-----------
\section{Achievements}
\begin{itemize}[leftmargin=0.15in]
{{ achievements_items }}
\end{itemize}
{% endif %}

{% if show_certifications %}
%-----------CERTIFICATIONS-----------
\section{Certifications}
\begin{itemize}[leftmargin=0.15in]
{{ certifications_items }}
\end{itemize}
{% endif %}

\end{document}
"""


def generate_latex_resume(data: dict) -> str:
    """
    Generate LaTeX resume from structured data using Jinja2 template

    Args:
        data: Dictionary containing all resume sections

    Returns:
        Complete LaTeX document as string
    """
    template = Template(LATEX_TEMPLATE)
    return template.render(**data)
