/* =====================================================================
   OT CYBERSECURITY ASSESSMENT TOOL — QUESTION BANK
   Sale Fish Marketing and Consulting
   Question Bank Version: 2.1.0 (2026-11-21)
   2.1.0: TSA standard renamed "TSA Pipeline Security Directives" (the
   directives cover natural gas and hazardous liquid pipelines and LNG
   alike); reporting window updated to 72 hours (SD Pipeline-2021-01G);
   TSA assessment family reworded to match the Cybersecurity Assessment
   Program; several NIST CSF 2.0 category labels corrected. Family IDs
   are unchanged, so saved assessments still load.

   Methodology note: control families below are a representative,
   foundational set derived from each standard's core structure
   (IEC 62443's 7 Foundational Requirements; a representative subset of
   NIST SP 800-53 control families as tailored by NIST SP 800-82r3;
   and the core requirement areas of TSA's pipeline Security Directives).
   This is a maturity self-assessment tool, not a substitute for a full
   formal control-by-control audit against the complete standard text.

   ctrlRefs: cross-references to the CTRL-x.x.x IDs used in the
   companion "OT Cybersecurity Technical Reference" document and its
   companion workbook, for traceability between the two deliverables.
   Not every family has a direct 1:1 CTRL ID (some are broader
   governance concepts); those note the closest section reference.
   ===================================================================== */

const QUESTION_BANK_VERSION = "2.1.0";
const QUESTION_BANK_DATE = "2026-11-21";

const CSF_FUNCTIONS = {
  GV: { name: "Govern", color: "#8B6FD6" },
  ID: { name: "Identify", color: "#4FD1C5" },
  PR: { name: "Protect", color: "#5B9BD5" },
  DE: { name: "Detect", color: "#E8A33D" },
  RS: { name: "Respond", color: "#E5734D" },
  RC: { name: "Recover", color: "#4DAF7C" },
};

/* Illustrative industry baseline maturity (CMM 1-5), by standard.
   These are planning-level estimates based on general regulatory
   pressure and observed sector maturity trends, NOT empirical survey
   data. Use to give exec audiences directional context only. */
const INDUSTRY_BASELINES = {
  "P&U":          { NIST_800_82: 3.4, IEC_62443: 3.2, TSA_GAS: 3.6, label: "Power & Utilities" },
  "O&G":          { NIST_800_82: 3.0, IEC_62443: 2.9, TSA_GAS: 3.3, label: "Oil & Gas" },
  "Chemical":     { NIST_800_82: 2.8, IEC_62443: 2.9, TSA_GAS: 2.4, label: "Chemical" },
  "Manufacturing":{ NIST_800_82: 2.3, IEC_62443: 2.4, TSA_GAS: 1.8, label: "Manufacturing" },
  "Healthcare":   { NIST_800_82: 2.0, IEC_62443: 1.9, TSA_GAS: 1.5, label: "Healthcare" },
};

const STANDARDS_META = {
  NIST_800_82: {
    name: "NIST SP 800-82r3",
    fullName: "NIST SP 800-82 Rev.3 — Guide to Operational Technology (OT) Security",
    description: "Tailors NIST SP 800-53r5 control families for OT environments.",
  },
  IEC_62443: {
    name: "IEC 62443",
    fullName: "IEC 62443 — Security for Industrial Automation and Control Systems",
    description: "OT-native standard organized around 7 Foundational Requirements (FR1-FR7) and zone/conduit security levels.",
  },
  TSA_GAS: {
    name: "TSA Pipeline Security Directives",
    fullName: "TSA Security Directive Pipeline-2021-01 and -02 Series (Natural Gas & Hazardous Liquid Pipelines, LNG)",
    description: "Mandatory federal directives for TSA-designated pipeline owner/operators. Applicability note: the Pipeline-2021-01 and -02 directive series apply to designated natural gas and hazardous liquid pipeline and LNG owner/operators. Selectable for any industry for reference/benchmarking, but is only a regulatory obligation for those operators. Rail and transit directives have related but distinct requirements not modeled here.",
  },
};

const INDUSTRIES = ["P&U", "O&G", "Chemical", "Manufacturing", "Healthcare"];

/* Each family:
   id, name, csf (function code), csfCategory (label),
   ctrlRefs: [CTRL-x.x.x, ...] cross-reference to reference document
   remediation: recommended action text shown for low-scoring items
   shortQuestion: { text, help }
   longQuestions: [ { text, help }, ... ]
   criticalityWeight: 1.0 (normal) - 1.5 (elevated, e.g. safety/segmentation) used in risk prioritization
*/
const QUESTION_BANK = {

  NIST_800_82: {
    standard: "NIST_800_82",
    families: [
      {
        id: "AC", name: "Access Control", csf: "PR", csfCategory: "PR.AA — Identity Management, Authentication and Access Control",
        ctrlRefs: ["CTRL-3.3.2", "CTRL-3.3.3"],
        remediation: "Implement role-based access control for HMI/SCADA and engineering workstations. Route all interactive OT sessions through a jump host / PAM solution with time-boxed, approved access — particularly for vendor/OEM remote support.",
        criticalityWeight: 1.3,
        shortQuestion: { text: "How mature is access control enforcement across your OT environment (least privilege, role-based access, session controls)?",
          help: "Consider PLCs, HMIs, engineering workstations, and historians." },
        longQuestions: [
          { text: "Least-privilege access is enforced and reviewed for all OT user and service accounts.", help: "Not just defined in policy — actually configured and periodically reviewed." },
          { text: "Role-based access control (RBAC) is implemented for HMI/SCADA and engineering workstation access.", help: "Distinct roles for operators, engineers, and administrators." },
          { text: "Remote and vendor access follows a documented, time-boxed, approved workflow (jump host / PAM).", help: "No standing vendor accounts or unmanaged remote access tools." },
        ],
      },
      {
        id: "IA", name: "Identification & Authentication", csf: "PR", csfCategory: "PR.AA — Identity Management, Authentication and Access Control",
        ctrlRefs: ["CTRL-2.1.1"],
        remediation: "Enforce MFA on all remote and administrative OT access. Establish a certificate/key lifecycle process (issuance, rotation, revocation) for device and software identity, particularly for OPC-UA and CIP Security deployments.",
        criticalityWeight: 1.2,
        shortQuestion: { text: "How mature is identity and authentication management for OT users, devices, and software?",
          help: "Includes MFA coverage and credential management practices." },
        longQuestions: [
          { text: "Multi-factor authentication (MFA) is enforced for all remote and administrative OT access.", help: "Including vendor/OEM remote support sessions." },
          { text: "Shared or generic OT accounts are minimized, with individual accountability where technically feasible.", help: "Legacy HMI/engineering workstations often default to shared accounts." },
          { text: "Device and software identity (certificates, keys) is managed with a defined lifecycle (issuance, rotation, revocation).", help: "Applies to OPC-UA, CIP Security, and similar certificate-based protocols." },
        ],
      },
      {
        id: "SC", name: "System & Communications Protection", csf: "PR", csfCategory: "PR.IR — Technology Infrastructure Resilience",
        ctrlRefs: ["CTRL-3.2.1", "CTRL-3.2.2", "CTRL-3.3.1"],
        remediation: "Establish a Level 3.5 industrial DMZ with brokered patch relay, jump host, and historian mirror functions — no direct session traversal between OT and IT. Implement default-deny conduit allow-lists between zones, and segment SIS as its own zone.",
        criticalityWeight: 1.4,
        shortQuestion: { text: "How mature is your network segmentation and boundary protection between IT and OT?",
          help: "Zones, conduits, and the industrial DMZ (Level 3.5)." },
        longQuestions: [
          { text: "OT is segmented from the enterprise IT network via a dedicated industrial DMZ, with no direct session traversal permitted.", help: "Patch relay, jump host, and historian mirror functions are brokered, not routed directly." },
          { text: "Inter-zone conduits use default-deny, explicit allow-list firewall rules rather than broad 'any-any' access.", help: "Documented and reviewed on a defined cadence." },
          { text: "Safety Instrumented Systems (SIS), where present, are segmented as their own zone independent of the basic control system.", help: "Logical segmentation at minimum; physical separation for highest-consequence systems." },
        ],
      },
      {
        id: "SI", name: "System & Information Integrity", csf: "PR", csfCategory: "PR.PS — Platform Security",
        ctrlRefs: ["CTRL-2.1.3", "CTRL-8.5.1"],
        remediation: "Deploy control-logic and configuration integrity monitoring, especially on engineering workstations. Verify firmware updates against vendor cryptographic signatures before deployment. Document compensating controls for legacy devices that cannot run endpoint protection.",
        criticalityWeight: 1.3,
        shortQuestion: { text: "How mature are your controls for protecting the integrity of control logic, firmware, and configuration data?",
          help: "Includes malware protection appropriate for OT constraints." },
        longQuestions: [
          { text: "Control logic and configuration changes are protected against unauthorized modification (integrity monitoring or equivalent).", help: "Especially on engineering workstations, per TRITON-class attack patterns." },
          { text: "Firmware updates are verified against vendor cryptographic signatures before deployment.", help: "Not merely sourced from an apparently-official channel." },
          { text: "Malware protection is deployed where technically feasible, with documented compensating controls where it is not (legacy Level 0/1 devices).", help: "Full EDR is frequently not feasible on legacy controllers." },
        ],
      },
      {
        id: "AU", name: "Audit & Accountability", csf: "DE", csfCategory: "DE.CM — Continuous Monitoring",
        ctrlRefs: ["CTRL-6.1.1", "CTRL-6.1.2", "CTRL-6.4.1", "CTRL-6.4.2"],
        remediation: "Deploy passive (SPAN/TAP) network monitoring at every zone conduit. Onboard OT alerts into the SIEM/SOC with OT-aware correlation logic and ensure analysts have asset-criticality context before triaging.",
        criticalityWeight: 1.1,
        shortQuestion: { text: "How mature is logging and monitoring across your OT environment?",
          help: "Passive network monitoring, SIEM integration, alert triage." },
        longQuestions: [
          { text: "OT network traffic is monitored passively (SPAN/TAP) at every zone conduit — not via inline/blocking-mode sensors.", help: "Inline enforcement risks disrupting the control loop on a false positive." },
          { text: "OT-derived alerts are onboarded into a SIEM/SOC with OT-aware correlation logic, not generic IT rules.", help: "Analysts have context on asset criticality and normal OT traffic patterns." },
          { text: "Protocol-aware detection (Modbus, DNP3, OPC-UA, EtherNet/IP, PROFINET function codes) is in place, not just IP/port-level visibility.", help: "Generic firewalls without ICS visibility only see 'TCP/502 traffic exists.'" },
        ],
      },
      {
        id: "IR", name: "Incident Response", csf: "RS", csfCategory: "RS.MA — Incident Management",
        ctrlRefs: ["CTRL-7.1.1", "CTRL-7.1.2", "CTRL-7.2.1", "CTRL-7.2.2"],
        remediation: "Document and rehearse a safety-first containment decision process (joint IR/operations/safety decision for SIS-adjacent assets). Build regulatory reporting timelines into the IR process explicitly, not as an afterthought.",
        criticalityWeight: 1.4,
        shortQuestion: { text: "How mature is your OT-specific incident response capability?",
          help: "Safety-first containment, forensics, regulatory reporting." },
        longQuestions: [
          { text: "Containment decisions for OT incidents follow a documented, safety-reviewed process rather than automatic/unilateral isolation.", help: "Abrupt isolation can itself cause an unsafe process state." },
          { text: "Pre-approved emergency isolation procedures exist and have been rehearsed for your highest-criticality zones.", help: "Tested via tabletop exercise, not just written." },
          { text: "Regulatory incident-reporting obligations (e.g., CISA, sector-specific) are built into the IR process as an explicit step.", help: "Not handled only after the fact by compliance." },
        ],
      },
      {
        id: "CP", name: "Contingency Planning", csf: "RC", csfCategory: "RC.RP — Recovery Plan Execution",
        ctrlRefs: ["CTRL-7.4.1", "CTRL-7.4.2"],
        remediation: "Establish verified 'golden image' backups (logic + configuration + firmware) for high-criticality assets, refreshed on every approved change. Actually test restore capability on a defined cadence, and define RTO/RPO jointly with operations/safety.",
        criticalityWeight: 1.3,
        shortQuestion: { text: "How mature are your OT backup and recovery capabilities?",
          help: "Golden-image backups, RTO/RPO, restore testing." },
        longQuestions: [
          { text: "Verified 'golden image' backups (logic + configuration + firmware version) exist for your highest-criticality assets.", help: "Refreshed on every approved change, not only on a fixed schedule." },
          { text: "Restore capability is actually tested on a defined cadence, not merely assumed to work.", help: "An untested backup is a hypothesis." },
          { text: "Recovery Time/Point Objectives (RTO/RPO) are defined per asset criticality tier and approved by operations/safety.", help: "Not set unilaterally by IT based on generic tooling defaults." },
        ],
      },
      {
        id: "CM", name: "Configuration Management", csf: "PR", csfCategory: "PR.PS — Platform Security",
        ctrlRefs: ["CTRL-8.2.1", "CTRL-8.2.2", "CTRL-8.3.1", "CTRL-8.3.2", "CTRL-8.3.3"],
        remediation: "Implement a formal Management of Change (MOC) process with risk, safety, and security review gates for every change to high-criticality assets. Maintain a current asset inventory reconciled at least annually, and validate patches in a staging environment before production deployment.",
        criticalityWeight: 1.2,
        shortQuestion: { text: "How mature is your change management (Management of Change) process for OT assets?",
          help: "Risk, safety, and security review gates before implementation." },
        longQuestions: [
          { text: "Every change to a high-criticality OT asset passes through risk, safety, and security review gates before implementation.", help: "No gate is skippable for urgency alone — only the timeline shortens." },
          { text: "An accurate, current asset inventory is maintained and reconciled against engineering records at least annually.", help: "Passive monitoring alone will miss devices that are present but not currently communicating." },
          { text: "Patches are validated in a representative staging environment before deployment to production Tier 1/2 assets.", help: "Never applied directly to a live controller as the first validation step." },
        ],
      },
    ],
  },

  IEC_62443: {
    standard: "IEC_62443",
    families: [
      {
        id: "FR1", name: "FR1 — Identification & Authentication Control", csf: "PR", csfCategory: "PR.AA — Identity Management, Authentication and Access Control",
        ctrlRefs: ["CTRL-2.1.1"],
        remediation: "Uniquely identify and authenticate all human users, software processes, and devices before granting OT access. Implement certificate-based device identity where supported (e.g., OPC-UA) and scale authentication strength to each zone's Security Level Target.",
        criticalityWeight: 1.2,
        shortQuestion: { text: "How mature is identity verification for users, software, and devices before access is granted?",
          help: "IEC 62443 Foundational Requirement 1." },
        longQuestions: [
          { text: "All human users are uniquely identified and authenticated before being granted access to OT systems.", help: "Shared/generic accounts are minimized where technically feasible." },
          { text: "Software processes and devices are authenticated before being permitted to communicate on OT networks.", help: "Certificate-based device identity where supported (e.g., OPC-UA)." },
          { text: "Authentication credentials are managed with a defined lifecycle appropriate to each Security Level (SL-T).", help: "Higher SL-T zones warrant stronger authentication requirements." },
        ],
      },
      {
        id: "FR2", name: "FR2 — Use Control", csf: "PR", csfCategory: "PR.AA — Identity Management, Authentication and Access Control",
        ctrlRefs: ["CTRL-2.1.2"],
        remediation: "Enforce least-privilege authorization consistently across zones, scaled to each zone's Security Level. Apply session timeout/concurrent-session limits at jump hosts, and restrict portable media and mobile code at OT boundaries.",
        criticalityWeight: 1.3,
        shortQuestion: { text: "How mature is enforcement of what an authenticated identity is actually permitted to do?",
          help: "IEC 62443 Foundational Requirement 2 — authorization, least privilege, session control." },
        longQuestions: [
          { text: "Least-privilege authorization is enforced and enforced consistently across zones of differing Security Levels.", help: "A Tier 1/SIS-adjacent zone warrants tighter enforcement than a Level 3 historian zone." },
          { text: "Session controls (timeout, concurrent session limits) are applied to privileged OT sessions.", help: "Particularly at jump hosts / PAM." },
          { text: "Use of portable media and mobile code is restricted and controlled at OT boundaries.", help: "A common initial-access and malware-introduction vector." },
        ],
      },
      {
        id: "FR3", name: "FR3 — System Integrity", csf: "PR", csfCategory: "PR.PS — Platform Security",
        ctrlRefs: ["CTRL-2.1.3", "CTRL-8.5.1"],
        remediation: "Implement control-logic change detection tied to your Management of Change process. Verify firmware/software integrity via cryptographic signature before deployment, and protect communication integrity on safety-relevant conduits.",
        criticalityWeight: 1.4,
        shortQuestion: { text: "How mature are your controls protecting the integrity of control system components and data?",
          help: "IEC 62443 Foundational Requirement 3 — includes control logic and firmware integrity." },
        longQuestions: [
          { text: "Control logic changes are detected and attributed to an authorized change (Management of Change process).", help: "Unauthorized logic modification is the highest-consequence OT integrity failure." },
          { text: "Firmware and software integrity is verified via cryptographic signature before deployment.", help: "Guards against compromised distribution channels, not just malicious insiders." },
          { text: "Communication integrity is protected on conduits carrying safety-relevant or high-consequence traffic.", help: "Message authentication/integrity checking where the protocol supports it." },
        ],
      },
      {
        id: "FR4", name: "FR4 — Data Confidentiality", csf: "PR", csfCategory: "PR.DS — Data Security",
        ctrlRefs: ["CTRL-3.5.1", "CTRL-3.5.2"],
        remediation: "Classify process data, control logic, and network topology information by sensitivity. Verify encryption configuration on OT protocols that support it (don't assume default settings are secure), and document data classification before sending OT data to cloud services.",
        criticalityWeight: 1.0,
        shortQuestion: { text: "How mature are your controls protecting sensitive OT data from unauthorized disclosure?",
          help: "IEC 62443 Foundational Requirement 4 — at rest and in transit." },
        longQuestions: [
          { text: "Process data, control logic, and network topology information are classified and handled per their sensitivity.", help: "Historians in particular are high-value targets for IP theft/espionage." },
          { text: "Encryption is applied to OT data in transit where the protocol and device support it, and configuration is verified (not just enabled by default).", help: "E.g., OPC-UA endpoints running 'SecurityPolicy: None' silently defeat this control." },
          { text: "Data sent to cloud-hosted OT services (historians, analytics) has a documented data classification and shared-responsibility review.", help: "Cloud provider certification does not guarantee your gateway/broker configuration is correct." },
        ],
      },
      {
        id: "FR5", name: "FR5 — Restricted Data Flow", csf: "PR", csfCategory: "PR.IR — Technology Infrastructure Resilience",
        ctrlRefs: ["CTRL-3.2.1", "CTRL-3.2.2", "CTRL-3.2.3"],
        remediation: "Partition OT into risk-based zones (not just topology-convenient ones). Enforce default-deny conduit allow-lists between every zone, and re-validate zone/conduit design whenever new device classes (e.g., IIoT gateways) are introduced.",
        criticalityWeight: 1.4,
        shortQuestion: { text: "How mature is your zone/conduit segmentation limiting unnecessary data flow between OT areas?",
          help: "IEC 62443 Foundational Requirement 5 — the technical enforcement of Purdue-level boundaries." },
        longQuestions: [
          { text: "OT is partitioned into zones based on risk/consequence, not just network topology convenience.", help: "Zone granularity: too few zones defeats the purpose; too many becomes unmanageable." },
          { text: "Every conduit between zones has an explicit, documented, default-deny allow-list.", help: "No 'any-any' rules between zones of differing criticality." },
          { text: "Zone/conduit design is re-validated when new device classes are introduced (e.g., IIoT gateways, wireless).", help: "New device classes are a common source of undocumented zone-boundary drift." },
        ],
      },
      {
        id: "FR6", name: "FR6 — Timely Response to Events", csf: "DE", csfCategory: "DE.AE — Adverse Event Analysis",
        ctrlRefs: ["CTRL-6.1.1", "CTRL-6.1.2"],
        remediation: "Ensure every zone conduit has an associated passive detection sensor. Map detection use cases to known adversary tactics/techniques (MITRE ATT&CK for ICS), and rehearse the incident response process via tabletop exercise at least annually.",
        criticalityWeight: 1.3,
        shortQuestion: { text: "How mature is your capability to detect and respond to security violations in a timely manner?",
          help: "IEC 62443 Foundational Requirement 6 — logging, monitoring, incident response capability." },
        longQuestions: [
          { text: "Every zone conduit has an associated detection sensor (passive network monitoring).", help: "Segmentation and monitoring should be treated as a paired control." },
          { text: "Detection use cases are mapped to known adversary tactics/techniques (e.g., MITRE ATT&CK for ICS), not just generic anomaly rules.", help: "Keeps the threat model and defensive coverage explicitly linked." },
          { text: "A documented, rehearsed incident response process exists with safety-first containment decision criteria.", help: "Tested via tabletop exercise at least annually for high-criticality zones." },
        ],
      },
      {
        id: "FR7", name: "FR7 — Resource Availability", csf: "PR", csfCategory: "PR.IR — Technology Infrastructure Resilience",
        ctrlRefs: ["CTRL-7.4.1", "CTRL-7.4.2"],
        remediation: "Maintain verified, restore-tested golden-image backups for high-criticality assets. Define RTO/RPO per criticality tier with operations/safety approval, and design networks for graceful degradation rather than cascading failure.",
        criticalityWeight: 1.3,
        shortQuestion: { text: "How mature are your controls ensuring the system remains available under degraded conditions?",
          help: "IEC 62443 Foundational Requirement 7 — DoS resilience, backup/recovery." },
        longQuestions: [
          { text: "Verified backups (golden images) exist for high-criticality assets and are actually restore-tested.", help: "An untested backup is a hypothesis, not a capability." },
          { text: "Recovery Time/Point Objectives are defined per criticality tier and approved by operations/safety.", help: "Not left to generic IT backup-tooling defaults." },
          { text: "Network and system design accounts for graceful degradation rather than cascading failure under resource exhaustion (e.g., DoS, broadcast storm).", help: "Particularly relevant for flat, under-segmented networks." },
        ],
      },
    ],
  },

  TSA_GAS: {
    standard: "TSA_GAS",
    families: [
      {
        id: "SEG", name: "IT/OT Network Segmentation", csf: "PR", csfCategory: "PR.IR — Technology Infrastructure Resilience",
        ctrlRefs: ["CTRL-3.2.1", "CTRL-3.3.1"],
        remediation: "Document a formal industrial DMZ / segmentation architecture separating IT and OT, and keep the documentation current for TSA/CISA review.",
        criticalityWeight: 1.4,
        shortQuestion: { text: "How mature is the segmentation between your IT and OT networks?",
          help: "A core, explicit requirement of the TSA Security Directives." },
        longQuestions: [
          { text: "OT is segmented from IT via a documented architecture (industrial DMZ or equivalent), not a flat or loosely-firewalled network.", help: "Directly required by the pipeline Security Directives." },
          { text: "Segmentation architecture is documented and available for TSA/CISA review upon request.", help: "Documentation currency matters as much as the architecture itself." },
        ],
      },
      {
        id: "ACC", name: "Access Control & MFA", csf: "PR", csfCategory: "PR.AA — Identity Management, Authentication and Access Control",
        ctrlRefs: ["CTRL-3.3.2", "CTRL-3.3.3"],
        remediation: "Enforce MFA for all remote access, including vendor/OEM support sessions. Log, time-box, and review all remote access sessions.",
        criticalityWeight: 1.3,
        shortQuestion: { text: "How mature is multi-factor authentication enforcement for OT remote access?",
          help: "An explicit TSA Security Directive requirement." },
        longQuestions: [
          { text: "MFA is enforced for all remote access into the OT environment, including vendor/OEM support sessions.", help: "A specific, named requirement in the pipeline directives." },
          { text: "Remote access sessions are logged, time-boxed, and reviewed.", help: "Ties to jump host / PAM architecture." },
        ],
      },
      {
        id: "PATCH", name: "Patch & Vulnerability Management", csf: "ID", csfCategory: "ID.RA — Risk Assessment",
        ctrlRefs: ["CTRL-4.3.1", "CTRL-4.3.2", "CTRL-8.2.1"],
        remediation: "Document a risk-based patch management process (deliberate, tracked, not necessarily immediate). Maintain documented compensating controls for vulnerabilities that cannot be immediately patched.",
        criticalityWeight: 1.2,
        shortQuestion: { text: "How mature is your risk-based patching and vulnerability management process?",
          help: "TSA directives require a risk-based patching approach, not immediate blanket patching." },
        longQuestions: [
          { text: "A documented, risk-based patch management process is in place and followed (not necessarily immediate, but deliberate and tracked).", help: "Consistent with OT's outage/revalidation constraints." },
          { text: "Compensating controls are documented and applied for vulnerabilities that cannot be immediately patched.", help: "Network isolation, increased monitoring, or feature disablement." },
        ],
      },
      {
        id: "MON", name: "Continuous Monitoring", csf: "DE", csfCategory: "DE.CM — Continuous Monitoring",
        ctrlRefs: ["CTRL-6.1.1", "CTRL-6.1.2", "CTRL-6.4.1"],
        remediation: "Deploy continuous monitoring capability broadly across OT network segments, not just at the IT/OT boundary. Establish a defined review cadence and escalation path for monitoring findings.",
        criticalityWeight: 1.3,
        shortQuestion: { text: "How mature is continuous monitoring of your OT environment for anomalous activity?",
          help: "An explicit TSA Security Directive requirement." },
        longQuestions: [
          { text: "Continuous monitoring capability is deployed across OT network segments, not only at the IT/OT boundary.", help: "Covers the OT environment broadly, per the Directive's intent." },
          { text: "Monitoring findings are reviewed on a defined cadence with a documented escalation path.", help: "Monitoring without review is a compliance gap even if the tooling is deployed." },
        ],
      },
      {
        id: "IRPT", name: "Incident Reporting & Response", csf: "RS", csfCategory: "RS.MA — Incident Management",
        ctrlRefs: ["CTRL-7.1.2"],
        remediation: "Document and rehearse a process ensuring qualifying incidents are reported to CISA within the required timeframe. Define and rehearse incident response roles and escalation paths.",
        criticalityWeight: 1.4,
        shortQuestion: { text: "How mature is your process for meeting mandatory CISA/TSA incident reporting timelines?",
          help: "Under SD Pipeline-2021-01G, cybersecurity incidents must be reported to CISA within 72 hours of identification, and a Cybersecurity Coordinator must be available 24/7." },
        longQuestions: [
          { text: "A documented process ensures qualifying incidents are reported to CISA within the required timeframe.", help: "72 hours from identification under SD Pipeline-2021-01G (it was 24 hours under earlier versions). Reporting-timeline compliance is a specific, auditable TSA requirement." },
          { text: "Incident response roles and escalation paths are defined and rehearsed, not only documented on paper.", help: "Tested via tabletop exercise." },
        ],
      },
      {
        id: "CIP", name: "Cybersecurity Implementation Plan / Governance", csf: "GV", csfCategory: "GV.RR — Roles, Responsibilities, and Authorities",
        ctrlRefs: [],
        remediation: "Maintain a current, TSA-reviewed Cybersecurity Implementation Plan describing how each directive requirement is met. Document named senior-management accountability for cybersecurity, exercised in practice, not just stated in policy.",
        criticalityWeight: 1.1,
        shortQuestion: { text: "How mature is your TSA-required Cybersecurity Implementation Plan and governance structure?",
          help: "TSA requires an approved implementation plan describing how directive requirements are met." },
        longQuestions: [
          { text: "A current, TSA-approved Cybersecurity Implementation Plan exists describing how each directive requirement is met.", help: "Kept current as the environment and directive revisions change." },
          { text: "Senior management accountability for cybersecurity is documented and exercised, not nominal, including a designated Cybersecurity Coordinator.", help: "A named executive owner, not just a policy statement." },
        ],
      },
      {
        id: "TPA", name: "Cybersecurity Assessment Program", csf: "ID", csfCategory: "ID.IM — Improvement",
        ctrlRefs: [],
        remediation: "Run the TSA-required Cybersecurity Assessment Program on its required cadence, including the architectural design review, with assessors independent of the team implementing the controls and findings tracked to closure with assigned ownership and timelines.",
        criticalityWeight: 1.0,
        shortQuestion: { text: "How mature is your Cybersecurity Assessment Program for proactively assessing the effectiveness of directive measures?",
          help: "The -02 directive series requires an annual Cybersecurity Assessment Program, including an architectural design review." },
        longQuestions: [
          { text: "The effectiveness of the measures in the Cybersecurity Implementation Plan is assessed on the required cadence, including an architectural design review, by assessors independent of the team implementing them.", help: "Independent from the team implementing the controls being assessed." },
          { text: "Assessment findings are tracked to closure with assigned ownership and timelines.", help: "A finding with no tracked remediation has not improved the program." },
        ],
      },
    ],
  },
};

if (typeof module !== "undefined") {
  module.exports = { QUESTION_BANK_VERSION, QUESTION_BANK_DATE, CSF_FUNCTIONS, INDUSTRY_BASELINES, STANDARDS_META, INDUSTRIES, QUESTION_BANK };
}
