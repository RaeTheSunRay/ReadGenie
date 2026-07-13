import { generateQuizQuestions, buildStoryContext } from "../lib/quiz-generator";
import { getSeedPlot } from "../lib/seed-plots";

const books = [
  ["Harry Potter and the Sorcerer's Stone", "J.K. Rowling"],
  ["Wonder", "R.J. Palacio"],
  ["The Hobbit", "J.R.R. Tolkien"],
  ["Charlotte's Web", "E.B. White"],
  ["The Remarkable Journey of Coyote Sunrise", "Dan Gemeinhart"],
  ["Percy Jackson and the Lightning Thief", "Rick Riordan"],
  ["Train I Ride", "Andrea Beaty"],
];

async function main() {
  for (const [title, author] of books) {
    const seed = getSeedPlot(title, author);
    const context = seed ? buildStoryContext(seed, title) : null;
    const questions = await generateQuizQuestions(title, author);

    console.log(`\n=== ${title} ===`);
    console.log(`seed: ${seed ? "yes" : "no"}`);
    console.log(`phrases: ${context?.eventPhrases.length ?? 0}`);
    console.log(`profiles: ${context?.characterProfiles.length ?? 0}`);
    console.log(`questions: ${questions.length}`);
  }
}

main();
