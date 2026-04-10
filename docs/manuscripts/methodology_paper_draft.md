# AI-Enhanced Modified Delphi Methodology for Medical Consensus Conferences: Design and Rationale for a Multi-Method Approach

## Authors

R. Andrew Taylor, MD, MHS^1*; Jeremiah S. Hinson, MD, PhD^2*; [Working Group Co-Leads]^3-12; [Planning Committee Members]; [Methodologist]; [Librarian Team]

^1 Department of Emergency Medicine, Yale School of Medicine, New Haven, CT
^2 Department of Emergency Medicine, Johns Hopkins University School of Medicine, Baltimore, MD
[Additional affiliations]

\* Co-first authors
Corresponding author: R. Andrew Taylor, MD, MHS [contact details]

---

## ABSTRACT

**Background:** Medical consensus conferences are a cornerstone of research agenda development, yet the methodology has remained largely unchanged for decades. The traditional Delphi method, while well-validated, faces challenges in synthesizing large volumes of qualitative feedback, detecting cross-domain overlaps, and triangulating priorities across complementary elicitation methods. Advances in artificial intelligence (AI) offer opportunities to augment — but not replace — human judgment in this process.

**Objectives:** We describe the design and rationale for an AI-enhanced, multi-method consensus process developed for the 2026 Society for Academic Emergency Medicine (SAEM) Consensus Conference on Artificial Intelligence and Emergency Medicine. The methodology integrates three priority elicitation layers — modified Delphi survey, pairwise comparison ranking, and conference-day live voting — with a structured AI synthesis pipeline operating under human-in-the-loop oversight.

**Methods:** Five working groups (40-60 domain experts total) participated in a compressed two-round modified Delphi process with predefined consensus thresholds (>=80% for confirmation, <=20% for removal). Concurrently, a pairwise comparison survey using Bayesian ranking generated an independent priority ordering. Between rounds, a four-component AI synthesis pipeline (comment theme clustering, question revision suggestion, new question synthesis, and cross-working-group overlap detection) processed qualitative data under structured prompts with full human review. Conference-day voting added a third independent elicitation method. Concordance across all three methods was assessed using Spearman rank correlation. A prespecified validation substudy compared AI-augmented versus human-only synthesis in two randomly selected working groups.

**Results:** [To be completed after conference]

**Conclusions:** [To be completed after conference. Will address feasibility, concordance findings, AI synthesis validation results, and recommendations for future consensus conferences.]

**Keywords:** consensus methods, Delphi technique, artificial intelligence, research priority setting, emergency medicine, pairwise comparison

---

## INTRODUCTION

Medical consensus conferences serve a critical function in defining research agendas, establishing clinical guidelines, and setting policy priorities.^1,2 The Society for Academic Emergency Medicine (SAEM) has a long tradition of convening consensus conferences to address the most pressing questions facing the specialty, including recent conferences on social emergency medicine (2021),^3 racism in emergency medicine research (2022),^4 and precision emergency medicine (2023).^5

The modified Delphi method remains the dominant approach for these efforts, valued for its structured iterative feedback, anonymity, and statistical aggregation of expert judgment.^6,7 However, as consensus conference scope and participation have grown, several methodological limitations have become apparent. First, the volume of free-text qualitative data generated in multi-question, multi-working-group surveys can overwhelm the synthesis capacity of small co-lead teams working under tight timelines. Second, traditional Delphi surveys provide ordinal importance ratings but do not directly elicit forced-choice priority comparisons, which may better reflect how funding and policy decisions are actually made. Third, opportunities for cross-working-group coordination are often identified late in the process, after questions have been finalized within silos. Finally, the traditional single-method approach provides no mechanism for triangulating priorities across complementary elicitation strategies, limiting confidence in the resulting agenda.

Recent advances in large language models (LLMs) and AI-assisted analysis offer potential solutions to several of these challenges — not as replacements for expert judgment, but as tools to augment the speed, consistency, and comprehensiveness of synthesis under the transparent oversight of human decision-makers. Separately, the field of preference elicitation has produced well-validated alternatives to Likert-scale rating, including pairwise comparison methods with Bayesian scoring that can generate continuous priority rankings from simple binary choices.^8,9

We describe the design and rationale for a multi-method, AI-enhanced consensus process developed for the 2026 SAEM Consensus Conference: "Artificial Intelligence and Emergency Medicine: Technology, Training, Self, and Society." This methodology integrates three complementary priority elicitation layers with a structured AI synthesis pipeline, producing what we believe is the first application of AI-augmented consensus methodology in medical research agenda development. We detail the process design, the AI pipeline architecture including its human-in-the-loop safeguards, and the prespecified validation strategy intended to evaluate whether this approach improves upon traditional methods.

## METHODS

### Study Design and Setting

This was a prospective, multi-method consensus study conducted over a five-week period (April 19 – May 21, 2026) culminating in an in-person conference at the SAEM Annual Meeting in [City], [State]. The study was designed by the conference planning committee (n=[X]) beginning in [month, year]. The methodology was preregistered [if applicable] and all materials, AI prompts, and analysis code are publicly available in the project repository (https://github.com/rAndrewTaylor/saem-ai-consensus-conference).

The study was deemed exempt from institutional review board oversight as a quality improvement and professional consensus-building activity [or: was approved by the IRB at X institution].

### Participants and Working Groups

Participants were recruited through a structured process. The planning committee identified five thematic domains organized around four pillars — Technology, Training, Self, and Society — reflecting the conference's conceptual framework:

| Working Group | Domain | Pillar |
|---|---|---|
| WG1 | AI in Clinical Practice and Operations | Technology |
| WG2 | AI Technology: Infrastructure and Data Ecosystems | Technology |
| WG3 | AI Education, Training, and Competency Development | Training |
| WG4 | Human-AI Interaction and the Perception of Self | Self |
| WG5 | Ethical, Legal, and Societal Implications | Society |

Each working group was led by two co-leads selected for domain expertise, methodological rigor, and track record of scholarship. Working group members (target 8-12 per group) were recruited by co-leads with attention to diversity of institution, geography, career stage, disciplinary background, and demographic representation. Each group included at minimum one early-career investigator and one member with methodological or technical expertise complementary to the domain focus.

Conference-day participants included all pre-conference working group members plus additional SAEM Annual Meeting attendees, providing broader stakeholder input on the final research agenda.

### Problem Identification and Pre-Conference Literature Review

Each working group conducted a structured literature review to identify knowledge gaps and generate candidate research questions. The specific review methodology varied by domain based on the maturity and scope of the existing literature:

- **Scoping reviews** were conducted for domains with a broad, heterogeneous literature base, following the PRISMA-ScR framework.^10
- **Rapid reviews** were conducted for domains with a more focused literature, using a simplified but systematic approach to identification, selection, and analysis.^11
- **Narrative reviews with structured search** were conducted for emerging domains where the literature was insufficient for formal systematic approaches.

Medical librarians from [X] institutions supported search strategy development across all five groups. Each review produced an evidence brief summarizing key findings, identified gaps, and candidate research questions.

### Layer 1: Modified Delphi Survey

#### Design

We employed a two-round modified Delphi process, compressed from the traditional three rounds due to timeline constraints while preserving the essential features of iterative feedback and statistical convergence measurement.^6 Surveys were administered electronically with anonymous participation linked by unique tokens.

#### Round 1

For each candidate research question, participants provided:

1. **Disposition vote** (categorical): Include / Include with modifications / Exclude
2. **Importance rating** (ordinal): 9-point Likert scale (1 = Not important, 5 = Moderately important, 9 = Critically important), consistent with the RAND/UCLA Appropriateness Method.^12
3. **Free-text comment** (optional): Rationale for vote, suggested modifications, or concerns
4. **Open-ended suggestions**: Up to three additional research questions not on the current list

#### Consensus Thresholds — Round 1

- **>=80% Include** (combining "Include" and "Include with modifications"): **Confirmed.** Question advanced to the final research agenda without modification.
- **21-79% Include**: **Gray zone.** Question discussed at co-lead meeting, revised incorporating participant feedback, and advanced to Round 2.
- **<=20% Include**: **Removed.** Question documented but excluded from further consideration.

These thresholds were established a priori by the planning committee based on published Delphi methodology guidance and prior SAEM consensus conference precedent.^5,13

#### Between-Round Processing

The interval between rounds (approximately 24 hours) was used for three activities: (1) computation of Round 1 results, (2) AI-assisted synthesis of qualitative data (described below), and (3) co-lead deliberation to revise gray-zone questions. Revised questions were presented in Round 2 alongside the original wording and aggregated Round 1 results, preserving the controlled feedback essential to the Delphi method.

#### Round 2

Round 2 used a simplified binary disposition (Include / Exclude) to drive convergence, along with the same 9-point importance rating and an optional final comment.

#### Consensus Thresholds — Round 2

- **>=80% Include**: **Confirmed.** Added to the final research agenda.
- **60-79% Include**: **Near-consensus.** Reported separately as "approaching consensus" with importance data.
- **<60% Include**: **Not confirmed.** Documented but excluded from the primary agenda.

#### Statistical Analysis

For each question in each round, we computed: number of respondents, response rate, percentage endorsement by disposition category, mean and median importance rating with interquartile range, and disposition trajectory from Round 1 to Round 2 for questions appearing in both rounds.

### Layer 2: Pairwise Comparison Ranking

#### Rationale

The Delphi method provides consensus thresholds and importance ratings but does not directly force prioritization among questions that all exceed the consensus threshold. To generate a continuous priority ranking, we employed a concurrent pairwise comparison survey using the All Our Ideas platform (allourideas.org), an open-source wiki survey developed at Princeton University that implements an adaptive Bayesian ranking algorithm.^8

#### Design

One pairwise survey was created per working group, seeded with the same candidate research questions as the Delphi Round 1. Participants were presented with two questions at a time and asked to select which they considered more important for the research agenda, with a "Can't decide" option available. The platform adaptively selects pairs to maximize information gain and computes a Bayesian score (0-100 scale) with confidence intervals for each item.

The pairwise survey launched simultaneously with Delphi Round 1 and remained open continuously through conference day, providing a longitudinal priority signal. Between rounds, removed questions were dropped, revised questions were updated, and new questions entering Round 2 were added. Participant-suggested questions were reviewed by co-leads before inclusion.

#### Concordance Analysis

The primary analytical use of pairwise data was to assess concordance with Delphi importance ratings. For each working group, we computed the Spearman rank correlation (rho) between the Delphi mean importance ranking and the pairwise Bayesian score ranking. We interpreted concordance using a prespecified matrix:

| Delphi Result | Pairwise Ranking | Interpretation |
|---|---|---|
| High consensus + high importance | High rank | Strong priority — convergent evidence |
| High consensus | Low rank | Consensus but not top priority |
| Gray zone | High rank | Important concept, wording needs work |
| Gray zone | Low rank | Weak signal, consider dropping |
| Excluded | High rank | Anomaly worth investigating |

### Layer 3: AI-Enhanced Synthesis Pipeline

#### Rationale

The volume of free-text data generated across five working groups — potentially hundreds of comments per round — exceeds the practical synthesis capacity of co-lead teams operating under a 24-hour between-round turnaround. We developed a structured AI synthesis pipeline to augment (not replace) the co-leads' analytical work, operating under explicit human-in-the-loop oversight with full transparency and auditability.

#### Architecture

The AI pipeline consisted of four components, each with a standardized prompt template, defined inputs, structured outputs, and mandatory human review:

**Component A: Comment Theme Clustering.** For each gray-zone question, the AI received all anonymized free-text comments along with voting distributions and importance statistics. The output was a structured analysis identifying 3-5 distinct themes, representative quotes mapped to comment numbers, outlier perspectives, and direct contradictions. The AI was explicitly instructed to organize — not to recommend.

**Component B: Question Revision Suggestions.** For questions with substantial "Include with modifications" votes (>20%), the AI received the original question, voting breakdown, and all comments from "Modify" and "Exclude" voters. It produced 1-3 revised question wordings, each with an explanation of changes made, which voter concerns were addressed, and which were not. Constraints included that revisions must be specific, empirically testable, relevant to emergency medicine, and answerable through funded research within 10 years.

**Component C: New Question Synthesis.** The AI received all participant-suggested new questions alongside the existing question list and working group scope. It categorized each suggestion as a duplicate (mapped to the specific existing question), a refinement (with assessment of whether it added meaningful specificity), a genuinely new topic (with suggested polished wording), or out of scope (with suggested alternate working group).

**Component D: Cross-Working-Group Overlap Detection.** The AI received all five working groups' question lists with voting data. It identified: (1) overlapping questions addressing similar topics from different angles, with recommendations to keep as complementary, coordinate, or merge; (2) tensions between working group priorities; (3) gaps in the combined agenda relative to working group scopes; and (4) questions that would benefit from cross-working-group collaboration.

#### Model and Prompt Transparency

All synthesis was performed using [model name and version, e.g., Claude Sonnet 4]. Prompt templates are published in full in the project repository (Supplementary Appendix A). Each prompt included explicit role framing ("You are an expert research methodologist assisting with a medical consensus conference. Your role is to organize and synthesize data, not to make decisions."), structured input data, specific task instructions, output format requirements, and behavioral constraints.

#### Human-in-the-Loop Protocol

Every AI output was reviewed by the relevant working group co-leads before any action was taken. For each item, co-leads recorded a decision (accepted, rejected, or modified) with written rationale. The planning committee reviewed all cross-working-group outputs. No AI output was incorporated into the consensus process without explicit human approval. All raw AI outputs, human decisions, and final post-review versions were archived as an audit trail.

#### Validation Substudy

To evaluate whether AI augmentation improved synthesis quality or efficiency, we conducted a prespecified validation substudy in two of the five working groups (selected randomly before Round 1). In these groups, co-leads independently completed their between-round synthesis before receiving AI outputs, producing paired human-only and AI-augmented analyses. We assessed:

1. **Thematic alignment**: Degree of overlap between human-identified and AI-identified themes
2. **Adoption rate**: Proportion of AI-suggested revisions accepted or adapted by co-leads
3. **Time savings**: Self-reported time for synthesis with and without AI augmentation
4. **Cross-working-group detection**: Whether AI identified overlaps that co-leads missed (and vice versa)

### Layer 4: Conference-Day Data Collection

#### Design

Conference-day activities provided a third independent priority elicitation from a broader stakeholder audience, enabling triangulation with the pre-conference Delphi and pairwise data.

#### Per-Working-Group Sessions (~45 minutes each)

Each working group session followed a standardized protocol:

1. **Presentation** (10 min): Co-leads presented the Delphi process, results, and final question list
2. **Clarification** (5 min): Audience questions
3. **Pre-deliberation vote** (5 min): Attendees ranked their top 5 priority questions via electronic polling
4. **Breakout discussion** (15 min): Small-group deliberation (6-8 per table) with trained facilitators capturing themes, agreements, disagreements, and novel suggestions
5. **Post-deliberation vote** (5 min): Repeat ranking after discussion
6. **New suggestions** (5 min): Audience submitted modifications or new questions

#### Cross-Working-Group Prioritization (30 minutes)

All confirmed questions from all five working groups were displayed. Each attendee allocated a fixed budget of 100 points across all questions, forcing prioritization across domains and producing a ratio-scale unified ranking.

#### Deliberation Shift Analysis

The pre- and post-discussion rankings within each working group session were compared to measure the impact of deliberation on priority ordering, using paired analysis of rank changes.

### Concordance Across All Three Methods

The final analysis assessed three-way concordance:

| Comparison | Data Sources | Method |
|---|---|---|
| Delphi vs. Pairwise | Mean importance rank vs. Bayesian score rank | Spearman rho |
| Delphi vs. Conference | Mean importance rank vs. audience allocation rank | Spearman rho |
| Pairwise vs. Conference | Bayesian score rank vs. audience allocation rank | Spearman rho |
| All three | Combined rankings | Kendall's W |

Concordance was computed per working group and across the combined research agenda.

## RESULTS

[To be completed after the conference. Will include:]

### Participation

- Working group composition and demographics
- Delphi Round 1 and Round 2 response rates
- Pairwise comparison participation (total votes, unique participants, median votes per participant)
- Conference-day attendance and voting participation

### Delphi Outcomes

- Number of candidate questions entering Round 1 per working group
- Round 1 disposition: confirmed / gray zone / removed
- Round 2 disposition: confirmed / near-consensus / not confirmed
- Final question counts per working group and overall

### Pairwise Comparison Outcomes

- Bayesian rankings per working group
- Concordance with Delphi importance ratings (Spearman rho per WG)
- Discrimination: ability of pairwise to differentiate questions rated similarly by Delphi

### AI Synthesis Outcomes

- Volume of qualitative data processed (total comments, suggestions)
- AI outputs generated per component
- Human review decisions (acceptance, rejection, modification rates)
- Validation substudy results (thematic alignment, adoption rates, time savings)

### Conference-Day Outcomes

- Pre- and post-deliberation rankings
- Deliberation shift magnitude and direction
- Cross-working-group unified priority ranking
- Demographic variation in priorities

### Three-Way Concordance

- Per-working-group and overall concordance statistics
- Interpretation of convergent and divergent signals

## DISCUSSION

[To be completed. Will address:]

### Principal Findings

- Overall feasibility of the multi-method approach within SAEM consensus conference constraints
- Concordance patterns and what they reveal about the construct validity of priority rankings
- AI synthesis performance: where it added value and where human judgment was irreplaceable

### Comparison with Prior Methods

- How this approach builds on the established SAEM consensus conference model^3-5
- Advantages over single-method Delphi: triangulation, forced prioritization, scalable qualitative synthesis
- Resource and time requirements compared to traditional approaches

### The Role of AI in Consensus Processes

- AI as augmentation, not automation: the human-in-the-loop principle in practice
- Transparency requirements: prompts, outputs, and decisions as a reproducible audit trail
- Risks of AI in consensus methodology: potential for homogenization, anchoring effects, and how our design mitigated these

### Implications for Future Consensus Conferences

- Which components of this methodology generalize beyond the AI-in-EM topic?
- Minimum viable AI integration: what worked well enough to recommend broadly?
- Recommendations for organizations considering AI-enhanced consensus methods

## LIMITATIONS

[To be completed. Will address:]

- Two-round Delphi (compressed from three) may have limited convergence
- Pairwise comparison participation may be uneven across working groups
- AI synthesis quality depends on model capabilities at time of use — results may not generalize to other models
- Conference-day audience may not be representative of the broader EM community
- Validation substudy limited to two working groups
- Concordance analysis is correlational and does not establish which method produces the "best" ranking

## CONCLUSIONS

[To be completed. Will summarize the methodological contribution and provide actionable recommendations for future consensus conference organizers.]

## REFERENCES

1. Fink A, Kosecoff J, Chassin M, Brook RH. Consensus methods: characteristics and guidelines for use. *Am J Public Health*. 1984;74(9):979-983.
2. Murphy MK, Black NA, Lamping DL, et al. Consensus development methods, and their use in clinical guideline development. *Health Technol Assess*. 1998;2(3):i-iv, 1-88.
3. Schoenfeld EM, Pester BD, Engel KG, et al. Executive summary of the 2021 SAEM consensus conference: From bedside to policy. *Acad Emerg Med*. 2022;29(4):393-404.
4. Chen EH, Betz ME, Gadsden SE, et al. Executive summary of the SAEM 2022 consensus conference to address racism in emergency medicine. *Acad Emerg Med*. 2023;30(4):362-373.
5. Strehlow MC, Gisondi MA, Engel H, et al. 2023 Society for Academic Emergency Medicine Consensus Conference on Precision Emergency Medicine: Development of a policy-relevant, patient-centered research agenda. *Acad Emerg Med*. 2024;31(8):732-743.
6. Dalkey N, Helmer O. An experimental application of the Delphi method to the use of experts. *Manag Sci*. 1963;9(3):458-467.
7. Diamond IR, Grant RC, Feldman BM, et al. Defining consensus: a systematic review recommends methodologic criteria for reporting of Delphi studies. *J Clin Epidemiol*. 2014;67(4):401-409.
8. Salganik MJ, Levy KEC. Wiki surveys: open and quantifiable social data collection. *PLoS One*. 2015;10(5):e0123483.
9. Bradley RA, Terry ME. Rank analysis of incomplete block designs: I. The method of paired comparisons. *Biometrika*. 1952;39(3-4):324-345.
10. Tricco AC, Lillie E, Zarin W, et al. PRISMA Extension for Scoping Reviews (PRISMA-ScR). *Ann Intern Med*. 2018;169(7):467-473.
11. Hamel C, Michaud A, Thuku M, et al. Defining rapid reviews: a systematic scoping review and thematic analysis. *Syst Rev*. 2021;10(1):209.
12. Fitch K, Bernstein SJ, Aguilar MD, et al. *The RAND/UCLA Appropriateness Method User's Manual*. RAND Corporation; 2001.
13. Hsu CC, Sandford BA. The Delphi technique: making sense of consensus. *Pract Assess Res Eval*. 2007;12(10):1-8.

## TABLES AND FIGURES

**Table 1.** Working Group Composition and Demographics
**Table 2.** Modified Delphi Results by Working Group and Round
**Table 3.** Pairwise Comparison Rankings and Concordance with Delphi
**Table 4.** AI Synthesis Pipeline: Outputs and Human Review Decisions
**Table 5.** Conference-Day Voting Results and Deliberation Shift
**Table 6.** Three-Way Concordance Analysis

**Figure 1.** Multi-Method Consensus Process Overview (Flow Diagram)
**Figure 2.** AI Synthesis Pipeline Architecture with Human-in-the-Loop Checkpoints
**Figure 3.** Concordance Visualization: Delphi Importance vs. Pairwise Score vs. Conference-Day Allocation (per Working Group)
**Figure 4.** Deliberation Shift: Pre- vs. Post-Discussion Rankings

**Supplementary Appendix A.** Complete AI Prompt Templates
**Supplementary Appendix B.** Survey Instruments (Delphi Rounds 1 and 2)
**Supplementary Appendix C.** Validation Substudy Protocol and Results
**Supplementary Table S1.** Full AI Synthesis Audit Log (Selected Examples)
