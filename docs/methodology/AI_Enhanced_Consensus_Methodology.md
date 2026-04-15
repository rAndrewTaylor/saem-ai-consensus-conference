# AI-Enhanced Consensus Methodology
## SAEM 2026 AI Consensus Conference
### A Layered Approach to Modified Delphi with AI-Augmented Analysis

---

## 1. Overview

This document describes the methodology for the SAEM 2026 AI Consensus Conference, which employs a novel, multi-layered approach to consensus building. The methodology combines a traditional modified Delphi process with AI-augmented analysis, pairwise comparison surveys, and electronic real-time data collection to build a 10-year research agenda for AI in emergency medicine.

This approach is intentionally innovative. A consensus conference on AI in medicine should model the responsible, transparent use of AI in its own scientific process. Every AI-assisted step is documented, human-reviewed, and designed to augment rather than replace expert judgment.

The methodology itself represents an independent scholarly contribution and will be reported in a dedicated methods paper describing the design, execution, and validation of AI-enhanced consensus methods.

## 2. Methodological Layers

The consensus process operates across five complementary layers, each producing distinct data that can be analyzed independently and in combination.

### Layer 1: Modified Delphi Process (Backbone)
Traditional two-round modified Delphi with anonymous electronic surveys. This is the validated, citable backbone of the consensus process.

### Layer 2: Pairwise Comparison Ranking (Parallel Prioritization)
A continuously available pairwise comparison system built into the conference platform, running alongside the Delphi rounds, producing rich prioritization data through head-to-head question comparisons using a Bradley-Terry statistical model.

### Layer 3: AI-Augmented Inter-Round Synthesis
Structured use of large language models to synthesize free-text feedback, cluster themes, suggest question revisions, and detect cross-working-group overlap between Delphi rounds.

### Layer 4: Electronic Conference-Day Data Collection
Real-time electronic polling and prioritization during the conference, with offline backup protocols.

### Layer 5: Cross-Working-Group AI Analysis
Post-Delphi AI-driven thematic analysis across all five working groups to identify overlaps, gaps, tensions, and interconnections in the emerging research agenda.

---

## 3. Layer 1: Modified Delphi Process

### 3.1 Design
- **Rounds:** 2 (compressed from traditional 3 due to timeline)
- **Participants:** Working group members (8-12 per group, 5 groups)
- **Administration:** Anonymous electronic surveys (Google Forms or Qualtrics)
- **Timeline:** Round 1: Apr 25 - May 2 | Round 2: May 3 - May 9

### 3.2 Question Development
Each working group generates 10-25 candidate research questions during the kickoff meeting (Apr 19-20) and subsequent async development period (Apr 20-25). Questions are informed by:
- AI-generated evidence briefs (provided by planning committee)
- Working group members' domain expertise
- Working group description suggested topics
- Cross-cutting equity and priority population considerations

**Quality criteria for candidate questions:**
- Specific enough to guide a grant proposal
- Empirically testable
- Relevant to emergency medicine
- Addressable within a 10-year research horizon

### 3.3 Round 1 Survey
For each candidate question, respondents provide:

**A. Disposition vote (categorical):**
- Include — This question should be part of the research agenda
- Include with modifications — Important topic, needs rewording
- Exclude — Should not be prioritized

**B. Importance rating (ordinal):**
- 9-point Likert scale (1 = Not important, 5 = Moderately important, 9 = Critically important)

**C. Free-text feedback:**
- Suggested modifications (if "Include with modifications")
- Rationale for exclusion (if "Exclude")
- General comments

**D. Open-ended section:**
- Up to 3 additional research questions not on the list
- Comments on scope or direction

### 3.4 Round 2 Survey
Participants see revised questions with Round 1 results displayed:

**A. Disposition vote (binary):**
- Include
- Exclude
- (No "modify" option — modifications resolved between rounds)

**B. Importance rating:**
- Same 9-point Likert scale

**C. Final comments:**
- Open text

**D. Gap check:**
- "Looking at the full list (confirmed + remaining), are there critical gaps?"

### 3.5 Consensus Thresholds

| Round 1 Result | Action |
|---|---|
| >=80% Include (with or without modification) | **Confirmed.** Locked into final list. |
| 21-79% Include | **Gray zone.** Discussed at Meeting 2; revised and advanced to Round 2. |
| <=20% Include | **Removed.** Documented but excluded. |

| Round 2 Result | Action |
|---|---|
| >=80% Include | **Confirmed.** Added to final list. |
| 60-79% Include | **Near-consensus.** Reported separately as "approaching consensus." |
| <60% Include | **Not confirmed.** Documented but excluded from primary agenda. |

### 3.6 Data Collected
For each question at each round:
- N respondents, response rate
- % Include / % Modify / % Exclude (Round 1)
- % Include / % Exclude (Round 2)
- Mean and median importance rating (with IQR)
- All free-text comments (anonymized)
- New questions suggested
- Disposition trajectory (Round 1 → Round 2)

---

## 4. Layer 2: Pairwise Comparison Ranking

### 4.1 Rationale
Traditional Delphi asks participants to rate each question independently, which produces ceiling effects (everything rates 7-8 on a 9-point scale) and doesn't force prioritization. Pairwise comparison addresses this by asking: "Which of these two research questions is more important for the field?"

This produces a continuously updated ranking with ratio-scale properties, is less cognitively demanding per response, and captures prioritization data that Delphi alone cannot.

### 4.2 Platform
The pairwise comparison system is **built into the SAEM AI Consensus Conference platform** — the same custom web application that hosts Delphi surveys and conference-day voting. Features:
- Web-based, mobile-friendly, anonymous token-based participation
- Participants see two items at a time, choose one or skip
- Keyboard shortcuts (A/B/S) for rapid voting
- Participants can suggest new questions (moderated by co-leads)
- Adaptive pairing algorithm avoids showing the same pair twice per participant
- Laplace-smoothed Bradley-Terry scoring model: `score = (wins + 1) / (wins + losses + 2) × 100`
- Scores update incrementally after each vote (no batch recomputation)
- Live rankings visible to all participants
- Unlimited responses — participants can vote as many times as they want
- No external accounts or third-party services required

### 4.3 Implementation

**Setup (Apr 23-25, before Delphi Round 1):**
- Questions added to the platform via the admin dashboard are automatically available for pairwise comparison
- The same candidate research questions used in Delphi Round 1 appear in pairwise mode
- Question suggestion feature enabled (co-leads moderate via admin dashboard)
- Each WG's pairwise ranking accessible at `/rank/{wg_number}`

**Distribution:**
- Direct participants to the pairwise section of the conference platform alongside Delphi Round 1
- Frame it as: "After completing the Delphi survey, spend 3-5 minutes on this quick prioritization exercise. There are no wrong answers — just pick whichever question you think is more important each time."
- Keep pairwise ranking open continuously through both Delphi rounds and up to conference day

**Between Rounds:**
- Review pairwise rankings alongside Delphi results at Meeting 2
- Use pairwise data to inform discussions about gray-zone questions
- Add any new questions from Round 2 via the admin dashboard — they automatically enter pairwise rotation

**Data Collected:**
- Total votes cast per participant
- Win/loss record and Bradley-Terry score for each question
- Response times per comparison
- User-suggested new questions
- Concordance analysis: pairwise ranking vs. Delphi importance ratings

### 4.4 Analysis
- **Concordance:** Spearman rank correlation between pairwise rankings and mean Delphi importance ratings. Where do they agree? Where do they diverge?
- **Ceiling effect detection:** Identify questions that rate similarly on Delphi but are clearly differentiated by pairwise comparison
- **Prioritization:** Final research agenda ordering informed by both data streams

---

## 5. Layer 3: AI-Augmented Inter-Round Synthesis

### 5.1 Rationale
Between Delphi rounds, co-leads must synthesize dozens of free-text comments, identify themes, revise question wording, and detect overlap with other groups. This is time-consuming and subjective. AI synthesis provides a structured, reproducible starting point that co-leads then validate and modify.

### 5.2 Process

```
Round 1 closes
       |
       v
[Planning committee exports all Round 1 data]
       |
       v
[AI synthesis pipeline runs] ──── Prompts documented, outputs logged
       |
       v
[AI produces structured report per WG]
       |
       v
[Co-leads review AI report] ──── Accept / Reject / Modify each suggestion
       |
       v
[Co-leads finalize Round 2 questions]
       |
       v
[Human decisions documented alongside AI suggestions]
       |
       v
Round 2 launches
```

### 5.3 AI Synthesis Components

**Component A: Comment Theme Clustering**
- Input: All free-text comments for a given question
- Output: 3-5 identified themes with representative quotes
- Purpose: Help co-leads quickly grasp the range of feedback

**Component B: Question Revision Suggestions**
- Input: Original question text + all "modify" votes with comments
- Output: 1-3 suggested revised versions with rationale
- Purpose: Give co-leads concrete starting points for revision (not final wording)

**Component C: New Question Synthesis**
- Input: All "additional question" suggestions from the open-ended section
- Output: Deduplicated, organized list with suggested wording and mapping to existing questions
- Purpose: Identify genuinely new ideas vs. restatements of existing questions

**Component D: Cross-WG Overlap Detection**
- Input: All 5 WGs' question lists and free-text comments
- Output: Flagged overlaps, tensions, and potential synergies
- Purpose: Alert co-leads to coordination opportunities before Round 2

### 5.4 Human-in-the-Loop Protocol
Every AI output goes through explicit human review:

| AI Output | Human Action | Documentation |
|---|---|---|
| Theme clusters | Co-leads confirm, correct, or add themes | Logged in meeting notes |
| Question revisions | Co-leads accept, reject, or further edit each suggestion | Decision + rationale recorded |
| New question synthesis | Co-leads decide which to add to Round 2 | Decision + rationale recorded |
| Cross-WG overlap flags | Planning committee reviews; coordinates between WG co-leads | Resolution documented |

### 5.5 Transparency and Reproducibility
All AI interactions are fully documented:
- Model used (name, version)
- Exact prompts (stored in repository)
- Raw AI outputs (archived)
- Human review decisions with rationale
- Final outputs after human editing

This documentation serves both scientific reproducibility and the methods paper.

### 5.6 Validation Approach
For 2 of the 5 working groups (selected at random), co-leads will independently complete their Round 1 synthesis *before* seeing the AI output. This produces paired human-only vs. AI-augmented syntheses for direct comparison:
- Do humans and AI identify the same themes?
- Are AI-suggested revisions adopted, modified, or rejected?
- Does AI synthesis save time? (co-leads self-report)
- Does AI identify cross-WG overlaps that humans miss (or vice versa)?

---

## 6. Layer 4: Conference-Day Electronic Data Collection

### 6.1 Design Principles
- All audience input captured electronically for analysis
- System must work with degraded or no internet (offline backup)
- Low friction — participants should be able to vote in under 60 seconds per round
- Real-time results available to facilitators (but displayed to audience only at designated times to avoid anchoring)

### 6.2 Primary Platform: SAEM AI Consensus Conference Platform
All conference-day voting is conducted through the **custom-built SAEM AI Consensus Conference platform** — the same web application used for Delphi surveys and pairwise ranking. Features:
- Real-time voting with live results via Server-Sent Events (SSE)
- Three parallel voting methods: priority ranking, importance rating (1-9), and point allocation (100-point budget)
- Admin-controlled session lifecycle (create, start, phase toggle, stop)
- Pre- and post-deliberation voting phases with built-in deliberation shift analysis
- Works on any device with a web browser
- No accounts or app downloads required — participants use anonymous tokens
- All data stored in a single, unified database alongside Delphi and pairwise results

### 6.3 Conference-Day Voting Protocol

**Session Structure (per working group, ~45 min):**

| Phase | Duration | Activity | Data Collected |
|---|---|---|---|
| Presentation | 10 min | Co-leads present findings | None (audience listens) |
| Clarification | 5 min | Audience Q&A on the questions | Questions logged |
| Initial Vote | 5 min | Audience rates top 5 priority questions (forced ranking) | Priority rankings per attendee |
| Breakout Discussion | 15 min | Small group deliberation on questions | Facilitator notes; audience can submit comments electronically |
| Revised Vote | 5 min | Post-discussion re-vote | Updated rankings; pre/post comparison |
| New Suggestions | 5 min | Audience submits new questions or modifications | Free-text submissions |

**Cross-WG Prioritization (end of day, ~30 min):**
- All confirmed questions from all 5 WGs displayed
- Each attendee allocates a fixed "priority budget" (e.g., 100 points) across all questions
- Produces a unified, cross-WG priority ranking of the full research agenda

### 6.4 Offline Backup Protocol

**Trigger:** Internet connectivity confirmed unreliable during setup (morning of May 21)

**Backup Option A: Pre-Loaded Tablets (preferred)**
- Load survey forms onto 20 tablets using offline-capable survey tool (e.g., KoboToolbox, ODK Collect)
- Pass tablets during voting periods
- Sync data when connectivity restored

**Backup Option B: Paper Ballots**
- Pre-printed ballots with all confirmed questions listed per WG
- Participants rank top 5 by writing numbers
- For cross-WG prioritization: "sticker dollars" approach (colored stickers of different point values)
- Planning committee enters data manually post-conference

**Backup Option C: Local Network**
- Bring a portable Wi-Fi router running a local survey server
- Participants connect to local network and vote via browser
- No internet required — everything runs on the local server

### 6.5 Data Collected on Conference Day
- Individual-level priority rankings (pre- and post-discussion)
- Deliberation shift: how rankings change after breakout discussion
- Free-text suggestions and modifications
- Cross-WG unified priority ranking
- Attendance per session (via electronic check-in)
- Demographic data of voters (role, career stage, institution type — voluntary)

---

## 7. Layer 5: Cross-Working-Group AI Analysis

### 7.1 Timing
After all Delphi rounds complete (May 10) and before conference day (May 21).

### 7.2 Inputs
- Final consensus question lists from all 5 WGs (with % agreement data)
- Pairwise comparison rankings from all 5 WGs
- Free-text comments and deliberation notes
- Evidence brief key themes
- Working group descriptions

### 7.3 AI Analysis Components

**A. Thematic Overlap Map**
- Identify questions that address similar themes across different WGs
- Produce a matrix showing thematic connections between WGs
- Flag potential redundancies for resolution

**B. Gap Analysis**
- Compare the combined research agenda against the original working group descriptions
- Identify suggested topics that no WG addressed
- Identify emerging themes from free-text that don't map to any existing question

**C. Research Agenda Visualization**
- Generate a structured map of the full research agenda
- Cluster questions by theme across WGs
- Identify "hub" questions that connect multiple domains
- Produce a visual representation for conference-day presentation

**D. Tension and Trade-off Identification**
- Identify questions across WGs that may be in tension (e.g., WG1 pushing automation vs. WG4 emphasizing human oversight)
- Frame these as productive tensions for conference-day discussion

### 7.4 Human Review
- Planning committee reviews all AI analysis outputs
- Cross-WG findings shared with co-leads before conference day
- Co-leads identify any mischaracterizations or missing connections
- Final analysis presented at conference as a synthesis layer

---

## 8. Data Management and Analysis Plan

### 8.1 Data Repository
All data stored in:
- **Google Drive:** Survey responses, meeting notes, deliberation records
- **GitHub Repository:** Analysis scripts, AI prompts, methodology documentation
- Survey platform exports archived in both locations

### 8.2 Quantitative Analysis

| Analysis | Data Sources | Method |
|---|---|---|
| Consensus rates | Delphi R1, R2 | % agreement per question per round |
| Priority ranking | Pairwise comparison | Bradley-Terry model (conference platform) |
| Concordance | Delphi importance + pairwise ranking | Spearman rank correlation |
| Deliberation shift | Conference pre/post votes | Paired comparison of rankings |
| Cross-WG overlap | All WG question lists | Thematic analysis (AI-assisted + human) |
| AI synthesis validation | Human-only vs AI-augmented syntheses | Qualitative comparison (2 WGs) |

### 8.3 Qualitative Analysis
- Free-text comments coded thematically (AI-assisted, human-validated)
- Meeting deliberation notes analyzed for decision rationale
- Conference-day breakout discussion captured and synthesized

### 8.4 Methods Paper Analyses
The methodology paper will report:
- Concordance between Delphi and pairwise comparison results
- AI synthesis accuracy (vs. human-only synthesis in validation WGs)
- Time savings from AI augmentation (co-lead self-report)
- Participant experience with the multi-method approach (brief post-conference survey)
- Recommendations for future AI-enhanced consensus processes

---

## 9. Timeline Integration

| Date | Delphi | Pairwise | AI Synthesis | Conference Day |
|---|---|---|---|---|
| Apr 19-20 | Meeting 1: Generate questions | | | |
| Apr 20-25 | Async question development | | | |
| Apr 23-25 | | Set up pairwise surveys | | |
| Apr 25 | Round 1 launches | Pairwise surveys go live | | |
| May 2 | Round 1 closes | Pairwise continues | AI synthesis runs | |
| May 2-3 | Meeting 2: Review + revise | Review pairwise data | Co-leads review AI output | |
| May 3 | Round 2 launches | Add new Qs to pairwise | | |
| May 9 | Round 2 closes | Pairwise continues | | |
| May 10-11 | Meeting 3: Finalize | Review final pairwise | Cross-WG AI analysis | |
| May 12 | 2-page summaries due | | | |
| May 15 | | | | Platform tested |
| May 16 | | | | Dry run |
| May 21 | | | | **CONFERENCE DAY** |

---

## 10. Ethical Considerations

- All Delphi responses are anonymous to other group members
- AI tools are used for synthesis and analysis, not for generating research questions or making consensus decisions
- Human experts retain all decision-making authority
- AI outputs are always presented as suggestions, never as decisions
- Full transparency: all prompts, outputs, and human review decisions documented
- Participants will be informed that AI tools are used in the synthesis process
- No individual-level data shared outside the research team
- Conference-day polling data reported in aggregate only

---

## 11. Publications

### 11.1 Proceedings Manuscript (AEM)
- ~10,000 words
- Combined output of all 5 working groups
- Reports consensus research questions with % agreement data
- Conference-day prioritization results
- All working group co-leads and active members included per journal policy

### 11.2 Education Manuscript (AEM Education and Training)
- WG3 findings specific to education, training, and competency
- Standalone literature review and full Delphi results

### 11.3 Methodology Manuscript
- Novel contribution: AI-enhanced consensus methodology
- Reports: process design, validation results, concordance analysis, participant experience
- Target journal: Journal of Clinical Epidemiology, Medical Decision Making, or similar methods journal
- Could also target JAMIA for the AI/informatics angle

### 11.4 Individual Working Group Manuscripts
- Each WG may pursue standalone manuscripts based on their full Delphi results and literature review
- Not guaranteed acceptance — each WG responsible for producing a publishable manuscript
- Encouraged but optional

---

## Appendices

- **Appendix A:** AI Synthesis Prompts (see separate document)
- **Appendix B:** Pairwise Survey Setup Guide
- **Appendix C:** Conference-Day Polling Setup and Backup Protocols
- **Appendix D:** Data Dictionary
- **Appendix E:** Post-Conference Participant Experience Survey
