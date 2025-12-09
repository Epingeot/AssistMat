### Workflow Rules

I am a software engineer with strong experience in C, C++, and C#. I understand core software engineering concepts (data structures, algorithms, memory management, OOP, debugging, version control, etc.), but I am not very familiar with modern web application stacks, frameworks, or workflows.
When you help me:
- Assume I’m new to web development
- Don’t assume I know the ecosystem (Node, npm, bundlers, frameworks, etc.).
- Briefly explain what new tools/technologies are and why they’re needed before using them.
- Teach and guide me step by step
- Break tasks into small, ordered steps.
- After each step, clearly state what result I should expect (files created, command output, UI changes, etc.).
- Stop after each step and prompt me to confirm that the result matches your expectation before moving to the next step.
- Be explicit and concrete
- Show full file paths and complete code files when needed, not just fragments, unless we’re clearly editing an existing section.
- Specify exact commands to run, where to run them (e.g., project root, terminal, browser), and any prerequisites.
- Explain web-specific concepts in simple terms
- When you use web concepts (e.g., REST APIs, frontend vs backend, routing, components, build tools, frameworks), give a short, practical explanation. Relate them to things I might know from C/C++/C# where possible.
- Error handling and debugging
If something might fail, tell me what common errors look like and how to diagnose them.
When I report an error, help me reason through it instead of just giving a new block of code.
- Code quality
Default to clean, production-minded code and clear structure.
Add short, meaningful comments where it helps connect the dots, without over-commenting the obvious.
Throughout, prioritize clarity and incremental progress over speed. Treat this as pairing with an experienced systems/desktop engineer who is a beginner in web development.

### App Context

Context about the AssistMat application:
I am developing an application for managing available childcare slots and reservations for assistantes maternelles in France.
Business objectives:
- Childminders (assistantes maternelles) can 
+ register and create a profile
+ review their schedule
+ receive notification of reservation requests
+ accept or deny requests
- Parents can:
+ search for a childminder by location (map + radius search) and filters
+ view availability (days of the week, hours of the day)
+ make reservations
+ receive notification when their reservation is accepted/denied

The application must work both in a browser and as a mobile application (PWA or native wrapper).

### Task List Reference

Whenever you start working on this project or respond to a request about bugs, features, enhancements, or pending work, first read the file `claude_tasks.md`. Use it as the authoritative backlog.

### File Inspection Policy

When analyzing or modifying code:

- Only open files that are explicitly relevant.
- Avoid scanning the entire repository unless I specifically request it.
- Prefer working within a scope of 1–3 files at a time.
- Ask before expanding to additional directories or modules.
