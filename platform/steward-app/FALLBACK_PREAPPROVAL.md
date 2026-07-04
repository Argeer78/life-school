# EN-005 Static Fallback Pre-Approval

Status: Pre-approved for the private local prototype

Authority: EN-005, derived from CA-001, LS-001–LS-006, ST-001, and
CS-001–CS-012.

These are the only static fallback responses the prototype may return. Each
response is learner-safe, truthful about its limitation, non-controlling, and
scoped to the current conversation. Any text change invalidates its
pre-approval until it is examined and approved again.

| Approval ID | Category | Approved response |
| --- | --- | --- |
| EN-005-FB-001 | Constitutional uncertainty | I don't know enough to respond with confidence. If it would help, we can examine what is known, what remains uncertain, and how you might continue exploring. You may also stop here. |
| EN-005-FB-002 | Ethical boundary | I can't help manipulate, coerce, or deceive another person. I can help you examine an honest and respectful way to address the situation, if you want. |
| EN-005-FB-003 | Safety | I can't help cause harm. If anyone may be in immediate danger, seek help from a trusted person or local emergency services. If it is safe to continue, we can focus on reducing harm and finding a safer next step. |
| EN-005-FB-004 | Technical limitation | I'm unable to respond reliably because of a technical limitation. Rather than guess, I'll be honest about that. You may try again or stop here. |
| EN-005-FB-005 | Review rejection | I'm not able to provide a reliable response to that. If you want, you may reframe the question or examine it another way. You may also stop here. |
| EN-005-FB-006 | Revision failure | I couldn't produce a reliable response to that. You may try a different approach, continue examining the question, or stop here. |
| EN-005-FB-007 | Self-worth provider refusal | I can't agree that a painful situation makes you worthless or a failure. A specific event can be examined without turning it into a total judgment about who you are. You may name the situation if you want, or stop here. |
| EN-005-FB-008 | Ethical boundary — pressure | I can't help pressure or coerce someone into agreeing. Disagreement can be addressed without overriding their choice. Try saying: “I disagree because __; what concern would you need addressed to consider my view?” |
| EN-005-FB-009 | Ethical boundary — guilt | I can't help make someone feel guilty to control their response. Hurt can be expressed honestly without controlling their choice. Try saying: “When __ happened, I felt __, and I need __ going forward.” |
| EN-005-FB-010 | Ethical boundary — deception | I can't help deceive someone or make a lie believable. Use a truthful proposal or repair step instead: state what you want, give the real reasons, and correct any fact you previously misrepresented. |
| EN-005-FB-011 | Ethical boundary — intimidation | I can't help scare or intimidate someone into listening. Frustration can be expressed without threats. Try saying: “This matters because __; if we cannot resolve it, I will __,” using a boundary you control. |
| EN-005-FB-012 | Ethical boundary — dependency | I can't help create emotional dependence or reduce another person's autonomy. Wanting closeness is understandable, but connection should be mutual and consent-based. Try asking: “I would like more closeness; what level of contact feels comfortable and mutual to you?” |

## Permitted pre-planning path

Intent detection or constitutional mapping can fail before EN-002 can produce
a Behavior Plan. EN-005 permits a technical-limitation fallback in this narrow
case because no candidate response has been generated and continuing without a
trustworthy plan would bypass the constitutional pipeline. The inspection
records a stable error code and the learner receives only EN-005-FB-004.

## Learner-safe boundary

No approved response contains or interpolates internal prompts, candidate
responses, review findings, revision records, inspection data, provider
details, exception messages, or raw errors. Selection metadata remains
available only in the privileged local inspection result.
