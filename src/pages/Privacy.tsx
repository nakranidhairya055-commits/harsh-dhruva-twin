import { LegalShell, type LegalSection } from "@/components/LegalShell";

/**
 * Privacy policy for DhruvaTwin.
 *
 * Written against what the product really stores: an account, the operational
 * records an operator writes, a rolling telemetry window, a local offline
 * queue, and the third parties the platform actually talks to (Convex, the
 * public HiveMQ broker, Groq for the AI features, Open-Meteo for weather and
 * Google for map embeds). Rights and grievance handling follow the principles
 * of India's Digital Personal Data Protection Act, 2023.
 */
const SECTIONS: LegalSection[] = [
  {
    id: "summary",
    heading: "Summary",
    paragraphs: [
      "We collect what the platform needs to work and nothing else: your email to sign you in, the records you write (notes, logs, check-ins, wildlife sightings, drill and repair results), the operational data the console generates, and basic technical data our host records for security.",
      "We do not run advertising or cross-site trackers, we do not sell or rent data, we do not build profiles for marketing, and we do not read your content except to show it back to you and to run the features you ask for.",
      "Two things leave our deployment when you use the features that need them: a question you put to the AI assistant or advisor goes to our AI provider together with limited station context, and messages published to the messaging broker travel over a public broker so that the offline queue can be delivered. Everything else stays in our database and in your own browser.",
    ],
  },
  {
    id: "controller",
    heading: "Who is responsible",
    paragraphs: [
      "DhruvaTwin is built and run by Team HackFinity007 as a Smart India Hackathon 2026 prototype under problem statement 26060, with the National Centre for Polar and Ocean Research, Ministry of Earth Sciences as the problem statement partner. Team HackFinity007 is the entity responsible for the personal data described in this policy.",
      "The platform is a research and education prototype, offered free of charge and without commercial intent. Contact details for privacy requests and grievances are at the end of this policy.",
    ],
  },
  {
    id: "collect",
    heading: "Information we collect",
    paragraphs: ["We collect the following categories, and only where the platform needs them:"],
    bullets: [
      "Account data: your email address and sign-in method (one-time code or guest session), and your assigned role view where an administrator sets one.",
      "Content you create: station notes and comments, maintenance log entries, check-ins and SOS messages, wildlife sightings, cascade drill records, repair records, self-test verdicts and dataset export requests.",
      "Operational data: telemetry simulated for the stations, the alerts raised from it, and the hash-chained audit entries that record what was done in the platform and by whom.",
      "Device and preference data: your selected station, view settings, layer switches, achievements and the offline outbox queue, held locally in your browser using local storage and IndexedDB until the queue is delivered.",
      "Technical data: IP address, browser type, referring page and timestamp recorded by our hosting provider for security, abuse prevention and error diagnosis.",
    ],
  },
  {
    id: "notcollect",
    heading: "What we do not collect",
    paragraphs: [
      "We do not collect payment or billing information, because the platform is free. We do not collect government identifiers, biometric data, health data, precise device location, or your contacts. We do not use third-party advertising, behavioural tracking or cross-site profiling pixels. We do not ask for, and ask you not to enter, sensitive, confidential or restricted information anywhere in the platform, including in AI prompts.",
    ],
  },
  {
    id: "use",
    heading: "How we use it",
    paragraphs: [
      "We use this information to provide the service: to authenticate you, render your stations, keep the twin in step with your work, deliver queued messages when the link returns, and keep an auditable record of operational actions so that history can be verified later.",
      "We also use it to keep the service secure, to diagnose faults, to enforce our Terms and Conditions and to answer support questions you raise. We do not use your content for advertising, and we do not sell it.",
      "We do not make automated decisions that produce legal or similarly significant effects about you. The AI features generate text and recommendations; they do not decide anything about your account, your access or your rights.",
    ],
  },
  {
    id: "basis",
    heading: "Legal basis and consent",
    paragraphs: [
      "Where data protection law requires a basis, we rely on the performance of our agreement with you to provide the platform you signed up for, your consent where you choose to use an optional feature such as the AI assistant or advisor, and legitimate interests in securing, debugging and improving the service.",
      "Where we rely on consent, you can withdraw it at any time by contacting us or simply by not using that feature. Withdrawing consent for an optional feature does not affect the rest of the platform, and it does not make earlier processing unlawful.",
      "Under India's Digital Personal Data Protection Act, 2023, you give consent for the specific purposes described in this policy, and you may withdraw it, review it and nominate another person to exercise your rights in the event of your death or incapacity. We handle requests on that basis.",
    ],
  },
  {
    id: "share",
    heading: "Who we share it with",
    paragraphs: ["We share only what each provider needs to do its job, and nothing more:"],
    bullets: [
      "Convex: hosting, database and authentication for the platform itself. Account data, content and operational records are stored here.",
      "HiveMQ community broker: a public MQTT message broker used to carry telemetry batches, alerts, check-ins and the offline queue. Messages published to a public broker can be observed by the broker operator while in transit. Payloads carry station readings, queue identifiers and device identifiers, never your email or a password.",
      "Groq: runs the language model behind the station assistant and the AI advisor. When you use those features, your question, the generated answer and limited station context (telemetry, incidents, continuity, microgrid, weather and the dependency graph summary) are sent to it.",
      "Open-Meteo: receives station coordinates only, to fetch public weather forecasts for the two station sites.",
      "Google Maps: receives the coordinates used in map embeds and external links on the supply-ship tracker and the site plot. Opening an embedded or linked map follows Google's own terms and privacy policy.",
      "Our hosting and infrastructure providers: process technical data such as IP address and request metadata as part of running and protecting the deployment.",
    ],
  },
  {
    id: "aiprocessing",
    heading: "AI processing in detail",
    paragraphs: [
      "The station assistant and the AI advisor send data to our AI provider only when you use them. What is sent is your question, the recent conversation you are continuing, and a compact context block describing the station you are working on: live telemetry readings, open incidents, the continuity prediction, the generation snapshot, local weather, recent repairs, self-test verdicts and a summary of the station dependency graph.",
      "That context describes the station and the plant, not you, and it contains no account details. Do not type personal, sensitive, confidential or restricted information into a question: anything you type is sent to the provider and is outside our control once it leaves the deployment.",
      "The provider does not receive your email address or your account identifier from us. If you would rather not send anything to a third party, do not use the assistant or the advisor; the rest of the console works without them and the offline rule engine exists precisely so the platform is usable without a model key.",
    ],
  },
  {
    id: "cookies",
    heading: "Cookies and local storage",
    paragraphs: [
      "We use only what is needed to keep you signed in and to remember your preferences: authentication cookies set by our own backend, plus local storage and IndexedDB entries for settings, achievements and the offline outbox.",
      "There are no advertising cookies, no cross-site tracking, and no third-party analytics scripts. You can clear local storage and IndexedDB from your browser at any time; doing so signs you out, resets your local preferences and achievements, and discards anything still waiting in the offline queue on that device.",
    ],
  },
  {
    id: "retention",
    heading: "How long we keep it",
    paragraphs: [
      "Telemetry is held in a rolling window and older readings are pruned automatically, so only recent history remains in the queryable store; the window is short by design and is shorter for high-frequency channels than for slow ones.",
      "Audit, drill, repair, self-test, export and sighting records are kept while the project runs, because their purpose is to keep the history they describe verifiable. Account records are kept while the account is active.",
      "Delete your account and we remove the account record and the personal content attached to it. Signed operational records may be retained in a form that no longer identifies you, or retained where the law or the integrity of the audit chain requires it. Data in the local offline queue stays on your device until it is delivered or you clear it from the sync panel.",
    ],
  },
  {
    id: "security",
    heading: "How we protect it",
    paragraphs: [
      "Access is protected by one-time codes rather than stored passwords, transport is encrypted in transit, audit records are hash-chained so that edits, insertions and reorderings are detectable, and secrets such as the AI model key are held as deployment credentials rather than in the source code.",
      "We apply data minimisation: the platform stores what a feature needs and no more, and local device storage holds the offline queue only until it is delivered.",
      "No system is perfectly secure. If we become aware of a breach affecting your personal data, we will investigate, contain it, and notify affected users and any authority we are required to notify, without undue delay.",
    ],
  },
  {
    id: "transfers",
    heading: "International transfers",
    paragraphs: [
      "Our hosting and service providers operate internationally, so your data may be processed outside India. Where it is, we rely on the providers' contractual and technical safeguards and, where required, on your consent to the transfer. If you need the data kept in a specific jurisdiction, contact us before using the platform.",
    ],
  },
  {
    id: "rights",
    heading: "Your rights",
    paragraphs: [
      "Subject to applicable law, including the Digital Personal Data Protection Act, 2023, you have the right to:",
    ],
    bullets: [
      "access a summary of the personal data we hold about you and how we process it;",
      "correct, complete or update that data, and easily request erasure when it is no longer needed for the purpose it was collected for;",
      "withdraw consent for an optional feature at any time, and to have processing stop for that purpose;",
      "nominate another person to exercise your rights in the event of your death or incapacity;",
      "object to or restrict processing carried out on the basis of legitimate interests;",
      "complain to us first, and then to the Data Protection Board of India or another competent authority if you are not satisfied with our response;",
      "export the datasets you created from the compliance centre at any time, without asking us.",
    ],
  },
  {
    id: "children",
    heading: "Children",
    paragraphs: [
      "The platform is aimed at students, researchers and operators. It is not directed at children, and under Indian law a child is anyone under eighteen. We do not knowingly process the personal data of a child without verifiable consent from a parent or lawful guardian, and we do not carry out tracking, behavioural monitoring or targeted advertising directed at children.",
      "If you believe a child has given us personal data without that consent, contact us and we will delete it promptly.",
    ],
  },
  {
    id: "grievance",
    heading: "Grievance and contact",
    paragraphs: [
      "For any privacy question, access, correction, erasure or consent-withdrawal request, or a complaint about how we have handled your data, contact the data protection and grievance point for the project: Team HackFinity007, through the workspace inside DhruvaTwin, which is the monitored channel for this prototype, or through the National Centre for Polar and Ocean Research as the problem statement partner.",
      "We acknowledge requests promptly and answer within thirty days, and we will tell you if we need longer and why. We will not treat you differently, or restrict your access, for exercising a right or raising a grievance.",
      "If you are not satisfied with our response, you may escalate to the Data Protection Board of India or another competent supervisory authority.",
    ],
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    paragraphs: [
      "We may update this policy as the platform changes. The date at the top of this page shows when it was last updated, and material changes are highlighted on the landing page. Continuing to use DhruvaTwin after a change means you accept the updated policy; if you do not accept it, stop using the service and ask us to delete your account.",
    ],
  },
];

export default function Privacy() {
  return (
    <LegalShell
      current="privacy"
      title="Privacy Policy"
      updated="28 September 2026"
      lede="What we collect when you use DhruvaTwin, why we collect it, who we share it with, how long we keep it, and the choices and rights you have. Written in plain language, against what the platform actually does."
      sections={SECTIONS}
    />
  );
}
