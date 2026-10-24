import { LegalShell, type LegalSection } from "@/components/LegalShell";

/**
 * Terms and conditions for DhruvaTwin.
 *
 * Written for what the product actually is: a research and education digital
 * twin of the Indian Antarctic stations, built as a prototype with simulated
 * sensor data. The sections that do the real work are the ones that stop anyone
 * reading it as an operational safety system, that put responsibility for
 * conduct and content on the user, and that cap what anyone can claim from a
 * team of students running a free, non-commercial prototype.
 */
const SECTIONS: LegalSection[] = [
  {
    id: "service",
    heading: "What DhruvaTwin is, and what it is not",
    paragraphs: [
      "DhruvaTwin is a digital twin platform for the Indian Antarctic stations Maitri and Bharati, built by Team HackFinity007 for Smart India Hackathon 2026 under problem statement 26060, with the National Centre for Polar and Ocean Research, Ministry of Earth Sciences as the problem statement partner. It models station environments, sensors, plant, interiors, wildlife and logistics for training, research, demonstration and education.",
      "It is a prototype and a demonstration. It is not an official system of NCPOR, the Ministry of Earth Sciences, the Government of India, or any station authority, and nothing on it may be represented as such. It is not connected to the real Maitri or Bharati stations, and it does not operate, control or monitor any real equipment.",
      "Sensor channels, plant behaviour, wildlife placement, voyages, weather fallbacks and forecasts shown in the twin are simulated or modelled for demonstration unless a screen states that a value comes from a live public source. Simulated values must never be read as measurements of the real stations.",
    ],
  },
  {
    id: "acceptance",
    heading: "Acceptance of these terms",
    paragraphs: [
      "By creating an account, signing in as a guest, or otherwise using DhruvaTwin, you agree to these terms and to our Privacy Policy, and you confirm that you are able to enter into a binding agreement. If you do not agree, do not use the service.",
      "If you use DhruvaTwin on behalf of an institution, you confirm that you are authorised to accept these terms for that institution, and that the institution accepts responsibility for use under its credentials.",
      "You must be at least 18 years old, or have verifiable consent from a parent or guardian, to hold an account. Accounts for minors must be created with that consent.",
    ],
  },
  {
    id: "accounts",
    heading: "Accounts and access",
    paragraphs: [
      "Access is granted by a one-time code sent to your email, or by a temporary guest session. You are responsible for everything done under your account and for keeping your email account secure. Tell us at once if you believe your access has been used by someone else.",
      "Guest sessions are temporary and device-local. Work saved only inside a guest session, including anything still in the offline queue, may be lost when the session ends.",
      "We may suspend, restrict or withdraw access to protect the service, other users, or ourselves, including for abuse, security incidents, suspected unlawful use, or legal requirements.",
    ],
  },
  {
    id: "use",
    heading: "Acceptable use",
    paragraphs: ["You agree to use the platform lawfully and not to misuse it. In particular you must not:"],
    bullets: [
      "attempt to gain access to another user's account, to the underlying deployment, or to any system behind it, outside the interface we provide;",
      "publish unlawful, abusive, harassing, deceptive, defamatory or infringing content through notes, comments, logs, check-ins, sightings or the assistant;",
      "upload another person's personal data without their consent, or any confidential, restricted, export-controlled or safety-critical information, including into an assistant question;",
      "interfere with the service or overload it, including flooding the shared public MQTT broker, the assistant, the advisor or the deployment with requests, or attempting to scrape it in bulk;",
      "reverse engineer, decompile or attempt to extract the source of the service, resell it, or remove attribution from exported datasets;",
      "use the platform to plan, justify or promote any activity that would breach the Antarctic Treaty system, the Protocol on Environmental Protection, station standing orders, or any applicable law;",
      "present the platform or its output as an official NCPOR, MoES or Government of India record, or as evidence of endorsement by them or by any linked provider.",
    ],
  },
  {
    id: "risk",
    heading: "Assumption of risk: not for operational or life-safety use",
    paragraphs: [
      "The platform is a training and demonstration tool. It must not be used as the sole or primary basis for any decision that could affect the safety of a person, a vessel, an aircraft, a field party, a building or a piece of plant, and it must not be used for navigation, clearance, medical, structural, electrical or other professional decision-making.",
      "By using the platform you accept that its data, models, forecasts and AI output may be incomplete, delayed, out of date or wrong, that they describe a simulated station rather than the real one, and that any decision you take on the strength of them is your own risk and responsibility.",
      "For anything that matters, rely on the official record held by NCPOR, on station standing orders, and on qualified people on site. In an emergency, use the real emergency procedures, not this platform.",
    ],
  },
  {
    id: "content",
    heading: "Your content",
    paragraphs: [
      "You keep ownership of what you write or upload. To operate the platform we need to store it, show it to the people entitled to see it, and process it to run the features you use, so you grant us a non-exclusive, worldwide, royalty-free licence to do exactly that, for as long as your content is on the platform.",
      "You confirm that you have the rights to anything you submit, that it does not infringe anyone else's rights, and that it contains no personal data of another person that you are not entitled to share. You are responsible for what you publish, not us.",
      "We may remove or restrict content that breaches these terms, that we are required to remove, or that puts the service or other users at risk. We are not obliged to monitor content, but we may.",
    ],
  },
  {
    id: "ai",
    heading: "AI features: the assistant and the advisor",
    paragraphs: [
      "The station assistant and the AI advisor use a large language model hosted by a third party provider. They generate text and, in the advisor's case, structured recommendations. Generated output is probabilistic: it can be wrong, incomplete, out of date or confident about something that is not true, even when it is grounded in live station context.",
      "AI output on this platform is not professional advice of any kind - engineering, medical, meteorological, navigational, legal or financial - and it must not be treated as a substitute for the record or for a qualified person. Check anything consequential against the console's own screens, which carry the underlying readings, before acting on it.",
      "Do not submit personal, sensitive, confidential, restricted or classified information in a question, and do not submit information you are not free to share with a third-party processor. Your question, the answer and limited station context are sent to the AI provider when you use these features, as described in the Privacy Policy.",
      "You can use the platform without the AI features simply by not using them; nothing else on the console depends on them.",
    ],
  },
  {
    id: "data",
    heading: "Simulated, modelled and third-party data",
    paragraphs: [
      "Unless a screen says otherwise, readings shown in the twin are produced by the platform's own simulation. Weather is provided by Open-Meteo from public model data; satellite imagery and map embeds come from Google; MQTT messaging uses a public HiveMQ community broker; the AI features use a model hosted by Groq. Wildlife species cards are compiled from published field references and are for information only.",
      "Third-party services are governed by their own terms, availability and accuracy, and we do not control them. We are not responsible for their content, their downtime, or what they do with data you send them.",
      "Weather, map, imagery and AI output are provided for context and demonstration. They are not certified forecasts or navigational products.",
    ],
  },
  {
    id: "ip",
    heading: "Intellectual property and attribution",
    paragraphs: [
      "The DhruvaTwin platform, its interface, models, copy, diagrams and code remain the property of the team that built it and its contributors. You may not copy, redistribute or republish them except as allowed by these terms, by an applicable open-source licence, or with written permission.",
      "Datasets you export may be reused within the terms stated on the export record, provided attribution is preserved and the data is not presented as an official NCPOR record.",
      "Names and marks belonging to NCPOR, MoES, the Government of India, Smart India Hackathon, three.js, Convex, Groq, Google, HiveMQ, Open-Meteo and any other service named in the console remain the property of their owners, and their appearance here implies no endorsement, sponsorship or affiliation.",
      "Feedback, suggestions and bug reports you send may be used to improve the platform without obligation, payment or attribution to you.",
    ],
  },
  {
    id: "availability",
    heading: "Availability, offline mode and changes",
    paragraphs: [
      "The platform is offered as available, without any guarantee of uptime, capacity or continued availability. It may be unavailable during deployments, seeding, maintenance, faults or provider outages.",
      "An offline outbox stores work locally in your browser and forwards it when the link returns. Data held only on your device can be lost if you clear site storage, use private browsing, or the session ends before the queue is delivered. Keep your own copy of anything you cannot afford to lose.",
      "We may add, change, suspend or withdraw features, screens, datasets and entire stations at any time as the project develops.",
    ],
  },
  {
    id: "security",
    heading: "Security and responsible disclosure",
    paragraphs: [
      "Do not test the platform's security, scan it, or attempt to break into it without written permission. If you believe you have found a vulnerability, report it privately through the workspace rather than publishing it or exploiting it, and give us a reasonable chance to fix it before disclosure.",
      "We do not run a paid bug bounty, and nothing here obliges us to reward a report.",
    ],
  },
  {
    id: "termination",
    heading: "Termination",
    paragraphs: [
      "You may stop using the platform at any time and ask us to delete your account. We may suspend or terminate access where these terms are breached, where required by law, or where continuing would put the service or other users at risk.",
      "On termination your account and personal content are handled as described in the Privacy Policy. Records that the audit chain or the law requires to be preserved, such as signed drill, repair and export entries, may be retained in a form that no longer identifies you where possible.",
      "Sections that by their nature should survive termination - content ownership and licence, disclaimers, liability, indemnity, and governing law - continue to apply.",
    ],
  },
  {
    id: "liability",
    heading: "Disclaimer and limitation of liability",
    paragraphs: [
      "The service is provided as is and as available, without warranties of any kind, express or implied, including accuracy, completeness, timeliness, fitness for a particular purpose, quiet enjoyment and non-infringement. We do not warrant that the service will be uninterrupted, secure or free of errors, or that any defect will be corrected.",
      "To the fullest extent permitted by law, the team behind DhruvaTwin, its members and contributors are not liable for any indirect, incidental, special, exemplary, consequential or punitive loss, or for loss of data, profit, revenue, opportunity or goodwill, arising out of or connected with your use of the platform, whether in contract, tort (including negligence), strict liability or otherwise, and even if we were told such loss was possible.",
      "We are not liable for decisions taken or not taken on the basis of simulated data, modelled voyages or weather, or AI output, nor for any interruption or loss caused by a third-party provider.",
      "The platform is provided free of charge for non-commercial research, education and demonstration. To the fullest extent permitted by law, our total aggregate liability to you for all claims connected with the service is limited to the greater of the amount you have paid us to use it (which is nil) and one thousand Indian rupees.",
      "Nothing in these terms excludes or limits liability that cannot lawfully be excluded or limited, including liability for fraud or fraudulent misrepresentation, or for death or personal injury caused by negligence where such liability cannot be excluded.",
    ],
  },
  {
    id: "indemnity",
    heading: "Indemnity",
    paragraphs: [
      "To the extent permitted by law, you agree to indemnify and hold harmless the team behind DhruvaTwin, its members, contributors and the institutions supporting the project against any claim, demand, loss, liability, cost or expense (including reasonable legal fees) arising from your use of the platform, your content, your breach of these terms, or your infringement of the rights of a third party.",
      "This does not apply to the extent the claim results from our own unlawful conduct or negligence.",
    ],
  },
  {
    id: "law",
    heading: "Governing law and disputes",
    paragraphs: [
      "These terms are governed by the laws of India. Before starting any formal proceeding, you agree to raise the issue with us through the workspace and give us thirty days to resolve it informally and in good faith.",
      "If that does not resolve it, the courts at the project team's principal place of work in India have exclusive jurisdiction, and you agree to submit to it. Each side bears its own costs unless a court orders otherwise.",
      "If any provision of these terms is held unenforceable, it is limited or removed to the minimum extent necessary and the remaining provisions stay in full force.",
    ],
  },
  {
    id: "general",
    heading: "General",
    paragraphs: [
      "These terms, together with the Privacy Policy, are the entire agreement between you and us about the platform, and replace anything said or written before. A failure to enforce a provision is not a waiver of it, and no single waiver prevents us from enforcing it later.",
      "You may not assign your rights under these terms without our written consent; we may assign ours to a successor in the project without consent.",
      "Notices to you may be given through the platform or to the email address on your account. Notices to us go through the workspace.",
      "Nothing in these terms creates a partnership, agency, employment or joint venture between you and us.",
    ],
  },
  {
    id: "changes",
    heading: "Changes to these terms",
    paragraphs: [
      "We may update these terms as the platform changes. The date at the top of this page shows when they were last updated, and material changes will be highlighted on the landing page.",
      "Continuing to use DhruvaTwin after a change means you accept the updated terms. If you do not accept them, stop using the service and ask us to delete your account.",
    ],
  },
];

export default function Terms() {
  return (
    <LegalShell
      current="terms"
      title="Terms and Conditions"
      updated="28 September 2026"
      lede="The rules for using DhruvaTwin: what the platform is, what it is not, what we take responsibility for and what stays with you. Please read these before using the command centre."
      sections={SECTIONS}
    />
  );
}
