export type CodingChallenge = {
  key: string;
  title: string;
  difficulty: "Easy" | "Medium";
  description: string;
  example: string;
  hint: string;
  skills: string[];
};

export const codingChallenges: CodingChallenge[] = [
  {
    key: "reverse-string",
    title: "Reverse a string",
    difficulty: "Easy",
    description: "Write a function that returns a string with its characters in reverse order.",
    example: '"gradconnect" -> "tcennocdarg"',
    hint: "Think about turning the string into a list of characters before reversing it.",
    skills: ["JavaScript", "Algorithms"],
  },
  {
    key: "find-maximum",
    title: "Find the largest number",
    difficulty: "Easy",
    description: "Given an array of numbers, return the largest value without sorting the array.",
    example: "[4, 12, 7, 3] -> 12",
    hint: "Keep one variable for the largest value seen so far.",
    skills: ["JavaScript", "Problem Solving"],
  },
  {
    key: "count-vowels",
    title: "Count vowels",
    difficulty: "Easy",
    description: "Count how many vowels appear in a supplied string.",
    example: '"graduate" -> 4',
    hint: "Normalise the input to lowercase and compare each character with a small set of vowels.",
    skills: ["JavaScript", "Strings"],
  },
  {
    key: "remove-duplicates",
    title: "Remove duplicate values",
    difficulty: "Easy",
    description: "Return a new array containing each value only once while keeping the original order.",
    example: "[1, 2, 2, 3, 1] -> [1, 2, 3]",
    hint: "A Set is useful when you need to remember which values have already appeared.",
    skills: ["JavaScript", "Data Structures"],
  },
  {
    key: "palindrome-check",
    title: "Palindrome check",
    difficulty: "Easy",
    description: "Return true when a word reads the same forward and backward.",
    example: '"level" -> true',
    hint: "Compare the original word with a reversed version of itself.",
    skills: ["JavaScript", "Strings"],
  },
  {
    key: "fizz-buzz",
    title: "FizzBuzz",
    difficulty: "Easy",
    description: "Print numbers 1 to 30. Multiples of 3 become Fizz, multiples of 5 become Buzz, and multiples of both become FizzBuzz.",
    example: "13, 14, FizzBuzz, 16...",
    hint: "Check the most specific condition first.",
    skills: ["JavaScript", "Logic"],
  },
  {
    key: "word-frequency",
    title: "Word frequency counter",
    difficulty: "Medium",
    description: "Count how many times each word appears in a sentence and return the counts as an object.",
    example: '"code more code" -> { code: 2, more: 1 }',
    hint: "Split the sentence into words and use an object as a lookup table.",
    skills: ["JavaScript", "Objects"],
  },
  {
    key: "two-sum",
    title: "Two sum",
    difficulty: "Medium",
    description: "Return the indexes of two numbers whose values add up to a target number.",
    example: "[2, 7, 11, 15], target 9 -> [0, 1]",
    hint: "Store previously seen values and the index where each one appeared.",
    skills: ["Algorithms", "Data Structures"],
  },
  {
    key: "group-by-category",
    title: "Group records by category",
    difficulty: "Medium",
    description: "Given records containing a category field, group the records into an object keyed by category.",
    example: "Jobs can be grouped into Web, Data and Support categories.",
    hint: "Reduce the array into an object and create each category array only when needed.",
    skills: ["JavaScript", "Data Transformation"],
  },
  {
    key: "valid-email-list",
    title: "Filter valid email addresses",
    difficulty: "Easy",
    description: "Given a list of strings, return only values that look like valid email addresses.",
    example: '["a@b.com", "wrong", "dev@test.co.za"] -> two values',
    hint: "Keep the validation simple and predictable; do not try to reproduce the entire email specification.",
    skills: ["Validation", "Regular Expressions"],
  },
  {
    key: "sort-by-date",
    title: "Sort records by date",
    difficulty: "Easy",
    description: "Sort a list of objects from newest to oldest using a date property.",
    example: "Useful for activity feeds and job listings.",
    hint: "Convert each date to a numeric timestamp inside the comparison function.",
    skills: ["JavaScript", "Dates"],
  },
  {
    key: "pagination-window",
    title: "Build a pagination helper",
    difficulty: "Medium",
    description: "Given an array, page number and page size, return only the records for that page.",
    example: "20 records, page 2, size 5 -> records 6 to 10",
    hint: "Calculate a start index and use slice.",
    skills: ["JavaScript", "Web Development"],
  },
  {
    key: "skill-match",
    title: "Calculate a skill match score",
    difficulty: "Medium",
    description: "Compare a user's skills with a job's required skills and return a percentage match.",
    example: "2 matching skills out of 4 requirements -> 50%",
    hint: "Normalise both lists before comparing them.",
    skills: ["Algorithms", "Career Tech"],
  },
  {
    key: "task-status-summary",
    title: "Summarise task statuses",
    difficulty: "Easy",
    description: "Given tasks with a done boolean, return total, completed and remaining counts.",
    example: "5 tasks with 3 done -> { total: 5, completed: 3, remaining: 2 }",
    hint: "One reduce pass is enough.",
    skills: ["JavaScript", "Objects"],
  },
];

export function getTodayChallenge(date = new Date()) {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dayOfYear = Math.floor((today - startOfYear) / 86_400_000);

  return codingChallenges[dayOfYear % codingChallenges.length];
}

export function getChallengeCompletionKey(date = new Date()) {
  const challenge = getTodayChallenge(date);
  const day = date.toISOString().slice(0, 10);

  return `${day}:${challenge.key}`;
}
