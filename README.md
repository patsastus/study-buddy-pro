<!-- branch-check: commit made to verify active branch (expected: backend-refactor) -->
# Study buddy: a first adventure in Lovable coding

For the first **Hive Helsinki AI Hackathon** on April 22nd, 2026, we made this thing to help break down a study project into concepts to learn. It was the first time using Lovable for everyone, and it was an interesting change from coding stuff from scratch like we usually do.

## Team
Who is 'we'? All students at Hive:
- Niklas Raatikainen, you're in my repo
- Jenni Korvenpää []()
- Kristian Repo [GitHub](https://github.com/k-repo-dev)
- Núria Mascaro [GitHub](https://github.com/nmascaro436/nmascaro436)

## Why
Why did we make this? Honestly, it was one of the suggested paths to tackle (AI study assistant), and nobody had a better idea. And this is a task we're constantly presented with during studies at Hive: you're given a short brief of a project, and you need to break it down to manageable pieces so you can start implementing it. But you're nearly always wading into unexplored territory; Hive is designed to give you a broad base of coding knowledge, you rarely know enough at the start of a project to make informed choices about what knowledge you need to acquire to finish the task. This tool is our attempt to bridge that gap.

## What
The project frontend runs on Lovable, and the AI functionality is incorporated via Supabase edge function calls: the project file is distilled with Gemini, and then that information is bundled with the user input of target programming language, areas of emphasis, starting level and requested depth, and passed to Gemini to generate :
- a list of concepts
  - an explanation of each
  - a multiple choice question
  - a small coding challenge
  - a code snippet with a small bug to find

For the explanation, there is also an option to provide a simpler or deeper explanation, and an option of explaining it using an non-programming related analogy.
