import { shuffle } from "./shuffle.js";

const MAX_QUESTIONS = 7;
const QUESTIONS_BATCH_SIZE = 50;
const TOTAL_QUESTIONS = 100; // Total number of desired questions

// Function to get queries from the OpenTDB API
async function fetchQuestions() {
  let allQuestions = [];
  let questionsToFetch = TOTAL_QUESTIONS;

  // Make the first request immediately
  const initialAmount = Math.min(QUESTIONS_BATCH_SIZE, questionsToFetch);
  let response = await fetch(`https://opentdb.com/api.php?amount=${initialAmount}&category=22&type=multiple`);
  let data = await response.json();
  allQuestions = allQuestions.concat(data.results);
  questionsToFetch -= initialAmount;

  // Function to make additional requests
  const fetchAdditionalQuestions = async () => {
    while (questionsToFetch > 0) {
      const amount = Math.min(QUESTIONS_BATCH_SIZE, questionsToFetch);
      response = await fetch(`https://opentdb.com/api.php?amount=${amount}&category=22&type=multiple`);
      data = await response.json();
      allQuestions = allQuestions.concat(data.results);
      questionsToFetch -= amount;
      // Wait 5 seconds before the next request if more questions are required.
      if (questionsToFetch > 0) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  };

  // Initiate additional requests without waiting
  fetchAdditionalQuestions();

  // Decode HTML entities before saving
  const decodedQuestions = allQuestions.map(question => ({
    ...question,
    question: decodeHtml(question.question),
    correct_answer: decodeHtml(question.correct_answer),
    incorrect_answers: question.incorrect_answers.map(answer => decodeHtml(answer))
  }));

  // Save questions on the server
  saveQuestions(decodedQuestions);

  return allQuestions;
}

// Function for decoding HTML entities
function decodeHtml(html) {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

// Function to display a question
function displayQuestion(data, index, container, currentQuestionIndex, numberOfQuestions) {
  const item = data[index];
  container.innerHTML = "";

  const itemCategory = document.createElement("div");
  const itemQuestion = document.createElement("div");
  const answersList = document.createElement("div");
  const resultMessage = document.createElement("div");

  itemCategory.className = "item-category";
  itemQuestion.className = "item-question";
  answersList.className = "answers-list";
  resultMessage.className = "result-message";

  let possibleAnswers = [...item.incorrect_answers];
  possibleAnswers.push(item.correct_answer);
  shuffle(possibleAnswers);

  possibleAnswers.forEach((answer, index) => {
    const answerItem = document.createElement("div");
    answerItem.className = "answer-item";
    answerItem.textContent = decodeHtml(answer); // Decode response
    answerItem.addEventListener("click", (event) => {
      if (possibleAnswers[index] === item.correct_answer) {
        event.target.className = "answer-item correct-answer";
        resultMessage.textContent = "Correct!";
        resultMessage.className = "result-message text-green-500";
        currentQuestionIndex++;
        setTimeout(() => {
          if (currentQuestionIndex < numberOfQuestions) {
            displayQuestion(data, currentQuestionIndex, container, currentQuestionIndex, numberOfQuestions);
          } else {
            container.innerHTML = '<div class="text-lg font-bold text-center text-gray-800">Quiz Completed!</div>';
            clearInterval(window.intervalId);
          }
        }, 1000);
      } else {
        event.target.className = "answer-item incorrect-answer";
        resultMessage.textContent = "Incorrect!";
        resultMessage.className = "result-message text-red-500";
      }
    });
    answersList.appendChild(answerItem);
  });

  itemCategory.textContent = `Category: ${item.category}`;
  itemQuestion.textContent = `${index + 1}. ${decodeHtml(item.question)}`; // Decode question

  container.appendChild(itemCategory);
  container.appendChild(itemQuestion);
  container.appendChild(answersList);
  container.appendChild(resultMessage);
}

// Function to save questions on the server
async function saveQuestions(questions) {
  try {
    const response = await fetch('/save-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(questions),
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    console.log('Questions saved successfully');
  } catch (error) {
    console.error('There was a problem with the fetch operation:', error);
  }
}

// Fetch questions and display the first one
fetchQuestions().then(data => {
  const numberOfQuestions = Math.min(MAX_QUESTIONS, data.length);
  let currentQuestionIndex = 0;
  const container = document.getElementById("container");

  displayQuestion(data, currentQuestionIndex, container, currentQuestionIndex, numberOfQuestions);
});
