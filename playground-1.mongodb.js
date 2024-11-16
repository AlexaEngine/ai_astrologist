/* global use, db */
// MongoDB Playground for Astrology Bot

// Select the database to use
use('astrologyBotDB');

// Create a collection for storing user details
db.createCollection('users');

// Insert sample user data into the 'users' collection
db.getCollection('users').insertMany([
  { 
    name: 'Alexandra Grier', 
    birthday: '1991-04-29', 
    birthTime: '21:22', 
    birthPlace: 'Tashkent, Uzbekistan', 
    questions: [] // Store user's queries here
  },
  { 
    name: 'John Doe', 
    birthday: '1985-12-03', 
    birthTime: '13:15', 
    birthPlace: 'Miami, FL', 
    questions: [] 
  }
]);

// Query to find all users
const allUsers = db.getCollection('users').find().toArray();
console.log('All Users:', allUsers);

// Insert a question into a user's record
db.getCollection('users').updateOne(
  { name: 'Alexandra Grier' }, 
  { 
    $push: { 
      questions: { 
        question: '/today', 
        date: new Date(), 
        result: 'Taurus forecast for today is great!' 
      } 
    } 
  }
);

// Find user by name and display their information
const user = db.getCollection('users').findOne({ name: 'Alexandra Grier' });
console.log('User Details:', user);
