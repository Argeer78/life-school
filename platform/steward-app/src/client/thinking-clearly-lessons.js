import { defineLesson } from "./lesson-model.js";
import { thinkingClearlyLessonsEl } from "./thinking-clearly-lessons-el.js";

export const thinkingClearlyLessons = Object.freeze([
  defineLesson({
    id: "CUR-001-LESSON-1",
    route: "/courses/thinking-clearly",
    moduleTitle: "Thinking Clearly",
    lessonNumber: 1,
    totalLessons: 6,
    title: "What happened vs. what it means",
    estimatedDuration: "15 minutes",
    introduction:
      "Separate an observable event from the meaning assigned to it.",
    whyThisMatters: {
      paragraphs: [
        "A reaction can turn an event into a conclusion before you notice the steps between them. Separating what happened from what it means gives you room to examine whether another explanation also fits.",
      ],
    },
    concept: {
      paragraphs: [
        "An observation describes what could have been seen, heard, counted, or recorded. An interpretation explains what you think the observation means.",
        "Interpretations are often necessary, but they are not identical to the event.",
      ],
      highlights: ["observation", "interpretation"],
    },
    example: {
      quote:
        "My friend looked at their phone twice while I was speaking. They do not respect me.",
      distinctions: [
        {
          term: "What happened",
          description: "The friend looked at their phone twice.",
        },
        {
          term: "What it might mean",
          description: "You interpret this as disrespect.",
        },
      ],
      paragraphs: [
        "Other explanations may exist. The observation alone does not establish which explanation is true.",
      ],
    },
    exercise: {
      instructions: [
        "Choose one statement and rewrite it as two lines: what happened and what I think it means.",
      ],
      options: [
        "My colleague did not answer my message today, so they are avoiding me.",
        "I made two mistakes in the presentation, so the whole presentation was a failure.",
        "My parent sighed when I spoke, which means they are disappointed in me.",
      ],
      fields: [
        {
          id: "observation",
          label: "What happened",
          placeholder: "Describe only what could be observed...",
          rows: 3,
          maxLength: 1500,
        },
        {
          id: "interpretation",
          label: "What I think it means",
          placeholder: "Name the meaning you are assigning...",
          rows: 3,
          maxLength: 1500,
        },
      ],
    },
    reflection: {
      prompt:
        "Which words in your original statement turned the event into a meaning?",
      placeholder:
        "Notice the words that added motive, judgment, or certainty...",
    },
    practicePromptTemplate: {
      instructions:
        "Use the lesson prompt as written or replace the example with your own. Steward will respond through the learner-safe production conversation path.",
      defaultPrompt:
        "Help me separate the observation from my interpretation: my friend looked at their phone while I was speaking, so I think they do not respect me.",
      handoff:
        "I observed: {{observation}}. My interpretation was: {{interpretation}}. Can you help me examine whether I'm separating what happened from what I think it means?",
    },
    completionCriteria:
      "Before continuing, check that you can state the observation and interpretation separately.",
    nextLesson: {
      href: "/courses/thinking-clearly/lesson-2",
      label: "Continue to Lesson 2",
    },
  }),
  defineLesson({
    id: "CUR-001-LESSON-2",
    route: "/courses/thinking-clearly/lesson-2",
    moduleTitle: "Thinking Clearly",
    lessonNumber: 2,
    totalLessons: 6,
    title: "Feelings are real, but not always final evidence",
    estimatedDuration: "15 minutes",
    introduction:
      "Respect a feeling as real experience without asking it to prove the whole story.",
    whyThisMatters: {
      paragraphs: [
        "Feelings can alert you to importance, fear, hurt, hope, or a need. They deserve attention. Trouble begins when a feeling is asked to settle every factual question about another person, the future, or your worth.",
      ],
    },
    concept: {
      paragraphs: [
        "A feeling is real because you are experiencing it. It may carry useful information about needs, expectations, or previous experience.",
        "A feeling does not automatically prove what another person intends, what will happen, or what you are worth. Clear thinking neither suppresses the feeling nor treats it as a verdict.",
      ],
    },
    example: {
      quote: "I feel certain that I will fail the interview.",
      distinctions: [
        {
          term: "Feeling",
          description: "The anxiety is real.",
        },
        {
          term: "What remains uncertain",
          description: "The interview result has not happened yet.",
        },
      ],
      paragraphs: [
        "The feeling may show that the interview matters or that difficulty is expected. It cannot provide the outcome in advance.",
      ],
    },
    exercise: {
      instructions: [
        "Choose one strong feeling. Name it, then examine what it might be drawing your attention to without turning that possibility into proof.",
      ],
      fields: [
        {
          id: "feeling",
          label: "Feeling",
          placeholder: "Name the feeling as plainly as you can...",
          rows: 3,
          maxLength: 1500,
        },
        {
          id: "feeling-meaning",
          label: "What the feeling might be telling me",
          placeholder: "Name what the feeling may be responding to...",
          rows: 3,
          maxLength: 1500,
        },
      ],
    },
    reflection: {
      prompt:
        "What changes when you respect the feeling without asking it to prove the whole story?",
      placeholder: "Notice what becomes clearer or remains uncertain...",
    },
    practicePromptTemplate: {
      instructions:
        "Use the lesson prompt as written or continue with your own exercise. Steward will respond through the learner-safe production conversation path.",
      defaultPrompt:
        "I feel sure I will fail, even though it has not happened. Help me respect the feeling while separating it from what is known.",
      handoff:
        "I noticed this feeling: {{feeling}}. I think it may be telling me: {{feeling-meaning}}. Can you help me examine the feeling without treating it as final evidence?",
    },
    completionCriteria:
      "Before continuing, check that you can respect the feeling while keeping factual questions open.",
    nextLesson: {
      href: "/courses/thinking-clearly/lesson-3",
      label: "Continue to Lesson 3",
    },
  }),
  defineLesson({
    id: "CUR-001-LESSON-3",
    route: "/courses/thinking-clearly/lesson-3",
    moduleTitle: "Thinking Clearly",
    lessonNumber: 3,
    totalLessons: 6,
    title: "Assumptions and missing information",
    estimatedDuration: "15 minutes",
    introduction: "Identify what a conclusion requires you to assume.",
    whyThisMatters: {
      paragraphs: [
        "Missing information can disappear inside a confident conclusion. Naming the assumption keeps the concern visible while showing which part still needs evidence.",
      ],
    },
    concept: {
      paragraphs: [
        "An assumption fills a gap between available information and a conclusion. Some assumptions are reasonable. Others are habits, fears, or guesses that have not been checked.",
        "Naming an assumption does not prove it false. It shows which part of your reasoning depends on information that may still be missing.",
      ],
      highlights: ["assumption"],
    },
    example: {
      quote: "They have not replied, so they must be angry with me.",
      distinctions: [
        {
          term: "Known",
          description: "No reply has arrived.",
        },
        {
          term: "Assumed",
          description:
            "They saw the message, could reply, chose not to, and did so because they were angry.",
        },
        {
          term: "Missing information",
          description:
            "Whether the message was seen, what else is happening, and what the person actually thinks.",
        },
      ],
      paragraphs: [
        "The conclusion may be possible, but it depends on information that has not been confirmed.",
      ],
    },
    exercise: {
      instructions: [
        "Use this conclusion or choose one of your own: My manager scheduled a meeting, so I am going to lose my job. Separate what you think might be true from what you do not know yet.",
      ],
      fields: [
        {
          id: "possible-truth",
          label: "What I think might be true",
          placeholder: "Name the conclusion or assumption...",
          rows: 3,
          maxLength: 1500,
        },
        {
          id: "missing-information",
          label: "What I do not know yet",
          placeholder: "Name the information that is still missing...",
          rows: 3,
          maxLength: 1500,
        },
      ],
    },
    reflection: {
      prompt: "Which assumption felt like a fact before you wrote it down?",
      placeholder: "Notice where the conclusion had hidden a gap...",
    },
    practicePromptTemplate: {
      instructions:
        "Use the lesson prompt as written or continue with your own exercise. Steward will respond through the learner-safe production conversation path.",
      defaultPrompt:
        "My manager scheduled a meeting and I am assuming I will lose my job. Help me identify the assumptions and missing information without giving me false reassurance.",
      handoff:
        "I think this might be true: {{possible-truth}}. What I do not know yet is: {{missing-information}}. Can you help me separate assumption from missing information?",
    },
    completionCriteria:
      "Before continuing, check that you can name both the assumption and the information still missing.",
    nextLesson: {
      href: "/courses/thinking-clearly/lesson-4",
      label: "Continue to Lesson 4",
    },
  }),
  defineLesson({
    id: "CUR-001-LESSON-4",
    route: "/courses/thinking-clearly/lesson-4",
    moduleTitle: "Thinking Clearly",
    lessonNumber: 4,
    totalLessons: 6,
    title: "Better questions create better thinking",
    estimatedDuration: "15 minutes",
    introduction:
      "Replace a loaded or unanswerable question with one that can be examined.",
    whyThisMatters: {
      paragraphs: [
        "Questions direct attention. When a question already contains an absolute claim, assumed motive, or impossible demand for certainty, it can make the answer harder to examine.",
      ],
    },
    concept: {
      paragraphs: [
        "A better question does not guarantee a comfortable answer. It identifies what you actually need to understand and makes relevant evidence easier to find.",
        "Making a question clearer preserves the concern while removing certainty that has not been established.",
      ],
    },
    example: {
      quote: "Why does nobody ever listen to me?",
      distinctions: [
        {
          term: "Hidden claim",
          description:
            "The words nobody and ever are treated as already established.",
        },
        {
          term: "Clearer question",
          description:
            "What happened in the last conversation where I felt unheard, and what did I need the other person to understand?",
        },
      ],
      paragraphs: [
        "The clearer question creates something specific to examine without dismissing the experience of feeling unheard.",
      ],
    },
    exercise: {
      instructions: [
        "Choose a question that contains an absolute claim, assumed motive, or demand for certainty. Rewrite it so that it becomes specific and examinable.",
      ],
      options: [
        "Why does everything go wrong for me?",
        "How can I know this decision is definitely right?",
        "Why are they trying to make me look foolish?",
      ],
      fields: [
        {
          id: "first-question",
          label: "My first question",
          placeholder: "Write the question as it first occurred to you...",
          rows: 3,
          maxLength: 1500,
        },
        {
          id: "clearer-question",
          label: "A clearer question",
          placeholder: "Make it specific and possible to examine...",
          rows: 3,
          maxLength: 1500,
        },
      ],
    },
    reflection: {
      prompt:
        "Did your revised question change the answer you were looking for, or only make the real question clearer?",
      placeholder: "Notice what changed when the question became clearer...",
    },
    practicePromptTemplate: {
      instructions:
        "Use the lesson prompt as written or continue with your own exercise. Steward will respond through the learner-safe production conversation path.",
      defaultPrompt:
        "Help me turn this into a clearer question without dismissing it: why does nobody ever listen to me?",
      handoff:
        "My first question was: {{first-question}}. I tried to make it clearer as: {{clearer-question}}. Can you help me improve the question so it leads to better thinking?",
    },
    completionCriteria:
      "Before continuing, check that your revised question is specific enough to examine without hiding the original concern.",
    nextLesson: {
      href: "/courses/thinking-clearly/lesson-5",
      label: "Continue to Lesson 5",
    },
  }),
  defineLesson({
    id: "CUR-001-LESSON-5",
    route: "/courses/thinking-clearly/lesson-5",
    moduleTitle: "Thinking Clearly",
    lessonNumber: 5,
    totalLessons: 6,
    title: "Evidence, alternatives, and consequences",
    estimatedDuration: "15 minutes",
    introduction:
      "Examine a claim by comparing evidence, alternative explanations, and likely consequences.",
    whyThisMatters: {
      paragraphs: [
        "A first conclusion can become stronger when attention stays only on supporting evidence. Alternatives and consequences test whether that conclusion has become certain too quickly.",
      ],
    },
    concept: {
      paragraphs: [
        "Clear thinking asks what supports a claim, what weakens it, what alternatives fit the facts, and what follows if the claim is acted upon.",
        "Alternatives do not need to be equally likely. Their purpose is to test the first explanation, not to force every possibility to seem the same.",
      ],
    },
    example: {
      quote: "If I raise the problem, the relationship will become worse.",
      distinctions: [
        {
          term: "Evidence",
          description:
            "Previous reactions and the seriousness of the problem may support the concern.",
        },
        {
          term: "Alternatives",
          description:
            "Careful communication might improve understanding, change nothing, or reveal a conflict that already exists.",
        },
        {
          term: "Consequences",
          description:
            "The likely result may depend on timing, wording, safety, and the other person's response.",
        },
      ],
      paragraphs: [
        "The claim needs examination rather than automatic belief or rejection.",
      ],
    },
    exercise: {
      instructions: [
        "Choose one claim you are considering. Examine evidence that supports or challenges it, one alternative explanation, and a possible consequence if the claim is right or wrong.",
      ],
      fields: [
        {
          id: "claim",
          label: "Claim or conclusion",
          placeholder: "State the claim you want to examine...",
          rows: 3,
          maxLength: 1500,
        },
        {
          id: "evidence",
          label: "Evidence supporting or challenging my claim",
          placeholder: "Name evidence that strengthens or weakens the claim...",
          rows: 3,
          maxLength: 1500,
        },
        {
          id: "alternative",
          label: "Possible alternative explanation",
          placeholder: "Name another explanation that could fit...",
          rows: 3,
          maxLength: 1500,
        },
        {
          id: "consequence",
          label: "Possible consequence if I am right or wrong",
          placeholder: "Name what may follow if the claim is right or wrong...",
          rows: 3,
          maxLength: 1500,
        },
      ],
    },
    reflection: {
      prompt:
        "Which mattered more to your conclusion: the amount of evidence or the quality of the evidence?",
      placeholder: "Notice which evidence actually changed your judgment...",
    },
    practicePromptTemplate: {
      instructions:
        "Use the lesson prompt as written or continue with your own exercise. Steward will respond through the learner-safe production conversation path.",
      defaultPrompt:
        "I think speaking up will make everything worse. Help me examine the evidence, alternatives, and consequences without deciding for me.",
      handoff:
        "My claim or conclusion is: {{claim}}. Evidence supporting or challenging it is: {{evidence}}. A possible alternative explanation is: {{alternative}}. A possible consequence if I am right or wrong is: {{consequence}}. Can you help me think through it more clearly?",
    },
    completionCriteria:
      "Before continuing, check that you can examine a claim through evidence, alternatives, or consequences without treating the first conclusion as final.",
    nextLesson: {
      href: "/courses/thinking-clearly/lesson-6",
      label: "Continue to Lesson 6",
    },
  }),
  defineLesson({
    id: "CUR-001-LESSON-6",
    route: "/courses/thinking-clearly/lesson-6",
    moduleTitle: "Thinking Clearly",
    lessonNumber: 6,
    totalLessons: 6,
    title: "From reaction to examination",
    estimatedDuration: "15 minutes",
    introduction:
      "Create a short pause between an initial reaction and a chosen conclusion or action.",
    whyThisMatters: {
      paragraphs: [
        "Reactions can alert you to danger, hurt, conflict, or importance. They can also combine fact, feeling, assumption, and conclusion before you notice the steps.",
      ],
    },
    concept: {
      paragraphs: [
        "Examination does not require suppressing the reaction. It slows the sequence enough to separate its parts and choose the next question responsibly.",
        "A reaction can remain important without becoming the only basis for a conclusion or action.",
      ],
    },
    example: {
      quote: "That message was rude. I should send an angry reply now.",
      distinctions: [
        {
          term: "Fact",
          description: "The message contained specific words.",
        },
        {
          term: "Feeling",
          description: "Anger or hurt is present.",
        },
        {
          term: "Interpretation",
          description: "The sender intended disrespect.",
        },
        {
          term: "Next question",
          description:
            "What response addresses the words clearly without acting on an unexamined motive?",
        },
      ],
      paragraphs: [
        "Separating the parts creates room to choose a response without denying the reaction.",
      ],
    },
    exercise: {
      instructions: [
        "Choose one recent reaction. State the reaction, then name what you want to examine before choosing whether to act.",
      ],
      fields: [
        {
          id: "first-reaction",
          label: "My first reaction",
          placeholder: "Name the immediate reaction...",
          rows: 3,
          maxLength: 1500,
        },
        {
          id: "examine-instead",
          label: "What I want to examine instead",
          placeholder: "Name the fact, feeling, assumption, or question to examine...",
          rows: 3,
          maxLength: 1500,
        },
      ],
    },
    reflection: {
      prompt:
        "Which part of the reaction became easier to examine once it had its own line?",
      placeholder: "Notice what changed when you paused the sequence...",
    },
    practicePromptTemplate: {
      instructions:
        "Use the lesson prompt as written or continue with your own exercise. Steward will respond through the learner-safe production conversation path.",
      defaultPrompt:
        "I received a message that felt rude and want to reply immediately. Help me separate the fact, feeling, assumption, interpretation, and next question.",
      handoff:
        "My first reaction was: {{first-reaction}}. What I want to examine instead is: {{examine-instead}}. Can you help me move from reaction to examination?",
    },
    completionCriteria:
      "Check that you can pause one reaction long enough to name what you want to examine before choosing an action.",
    nextLesson: null,
  }),
]);

/**
 * @param {string} pathname
 */
export function findThinkingClearlyLesson(pathname, locale = "en") {
  const normalizedPath =
    pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const lessons =
    locale === "el" ? thinkingClearlyLessonsEl : thinkingClearlyLessons;
  return lessons.find(
    (lesson) => lesson.route === normalizedPath,
  );
}
