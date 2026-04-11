import { motion } from 'framer-motion';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Link } from 'react-router-dom';
import {
  ClipboardList, GitCompare, Vote, CheckCircle2, ArrowRight,
  UserPlus, MessageSquare, BarChart3, Calendar, HelpCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DelphiProcessIllustration } from '@/components/illustrations';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export function GettingStartedPage() {
  usePageTitle('Getting Started');

  return (
    <>
      {/* Hero */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-500 px-4 py-16 text-white sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="default" className="mb-4 bg-white/15 text-white border-0">
            Participant Guide
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Getting Started</h1>
          <p className="mt-3 text-lg text-primary-100">
            Everything you need to know about participating in the consensus process
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {/* Overview */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <h2 className="text-2xl font-bold text-gray-900">How This Works</h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            You've been invited to help shape the <strong>10-year research agenda for AI in emergency medicine</strong>.
            The process uses a modified Delphi method — an iterative, anonymous consensus-building approach where your
            expert judgment directly influences which research questions make it into the final agenda.
          </p>
          <div className="mt-8">
            <DelphiProcessIllustration className="w-full max-w-lg mx-auto" />
          </div>
        </motion.section>

        {/* Timeline */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900">Timeline</h2>
          <div className="mt-6 space-y-4">
            {[
              { date: 'Apr 19–20', title: 'Kickoff Meeting', desc: 'Meet your working group, discuss the evidence brief, brainstorm candidate research questions', icon: UserPlus, color: 'bg-blue-100 text-blue-600' },
              { date: 'Apr 25 – May 2', title: 'Delphi Round 1', desc: 'Rate each candidate question: Include, Modify, or Exclude. Rate importance (1-9). Add comments.', icon: ClipboardList, color: 'bg-blue-100 text-blue-600' },
              { date: 'Apr 25 – May 21', title: 'Pairwise Ranking', desc: 'Quick side-by-side comparisons — which question matters more? Do as many as you like.', icon: GitCompare, color: 'bg-violet-100 text-violet-600' },
              { date: 'May 3–9', title: 'Delphi Round 2', desc: 'Re-vote on revised questions with Round 1 results shown. Binary vote: Include or Exclude.', icon: ClipboardList, color: 'bg-blue-100 text-blue-600' },
              { date: 'May 21', title: 'Conference Day', desc: 'Live voting at SAEM Annual Meeting in Atlanta. Rank priorities, rate importance, allocate points.', icon: Vote, color: 'bg-emerald-100 text-emerald-600' },
            ].map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${step.color}`}>
                  <step.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{step.title}</h3>
                    <Badge variant="default">{step.date}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
          <div className="mt-6 space-y-6">
            {[
              { q: 'Are my responses anonymous?', a: 'Yes. All Delphi survey responses are anonymous to other group members. Only aggregated results are shared.' },
              { q: 'How long does each survey take?', a: 'Round 1 takes about 15-20 minutes. Round 2 is shorter (10-15 minutes) since you\'re re-voting on revised questions. Pairwise comparisons take about 5 minutes.' },
              { q: 'What does "consensus" mean here?', a: 'A question reaches consensus when ≥80% of working group members vote to include it. Questions between 21-79% are revised and re-voted. Questions below 20% are removed.' },
              { q: 'How is AI used in this process?', a: 'AI helps synthesize free-text comments, suggest question revisions, and detect cross-group overlap. All AI outputs are reviewed by human co-leads before being used. AI does not make decisions — your expert judgment does.' },
              { q: 'Can I participate in more than one working group?', a: 'We ask participants to commit to one working group (two at most) to ensure deep engagement over surface-level participation.' },
              { q: 'What happens after the conference?', a: 'The consensus research agenda will be published in Academic Emergency Medicine. All working group members and conference participants will be acknowledged.' },
            ].map((faq, i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <h3 className="flex items-start gap-2 font-semibold text-gray-900">
                    <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                    {faq.q}
                  </h3>
                  <p className="mt-2 pl-6 text-sm leading-relaxed text-gray-600">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.section>

        {/* CTA */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mt-16 text-center">
          <Link to="/">
            <Button size="lg" className="gap-2">
              Go to Working Groups
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </>
  );
}
