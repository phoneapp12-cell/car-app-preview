/* 1.9.0 Daily family question / photo challenge. One prompt a day (NZ date), the same for everyone; days alternate
   question → photo challenge. Family-safe, fun, kid-friendly (Aranea can join in), a bit of NZ flavour. */
export const QUESTIONS = [
  'What’s the best thing that happened to you this week?', 'If you could have any animal as a pet (even a made-up one), what would it be?',
  'What’s your favourite Kiwi snack of all time?', 'Which sitcom episode could you watch again and again?', 'If you could live anywhere in NZ for a year, where would it be?',
  'What song always puts you in a good mood?', 'What’s one thing you’re looking forward to this month?', 'Pineapple lumps or jaffas?',
  'What superpower would you pick, and what would you do first?', 'What’s the funniest thing a pet has ever done in front of you?',
  'Beach day or bush walk?', 'What’s a food you hated as a kid but love now?', 'If our family had a theme song, what would it be?',
  'What’s your favourite thing to grow (or would like to grow) in the garden?', 'Which movie or show would you love to jump inside for a day?',
  'What’s a small thing that made you smile today?', 'If you could ask a space scientist one question, what would it be?',
  'What’s the best board game or card game for a rainy day?', 'Which three things would you take to a desert island?', 'Fish and chips: what’s your order?',
  'What’s something you’re proud of from this year?', 'Which NZ bird would you be, and why?', 'What’s your go-to comfort meal?',
  'If you could learn any skill instantly, what would it be?', 'What’s your favourite family memory?', 'Summer or winter, and what do you love about it?',
  'What’s the silliest joke you know?', 'Which book or story did you love as a kid?', 'If you invented a new ice cream flavour, what would it be?',
  'Where’s the best spot in Northland for a picnic?', 'What would your dream treehouse have in it?', 'What’s one thing you’d like to try this summer?',
  'Who’s someone who made your day lately?', 'What’s the most beautiful place you’ve ever seen?', 'If you could talk to animals, which animal first?',
  'What’s your favourite way to spend a lazy Sunday?', 'What’s a hobby you’d like to start?', 'Pavlova or chocolate cake?',
  'What’s the best thing about where you live?', 'If you had a robot helper, what job would you give it?', 'What’s a word that makes you laugh?',
  'Which song from when you were younger still gets stuck in your head?', 'What are you grateful for today?', 'What would you name a new planet?',
];
export const CHALLENGES = [
  'Show us something green 🌿', 'Your view right now 👀', 'Something that made you smile today 😊', 'Your favourite mug ☕', 'A pet (yours or one you met) 🐾',
  'Something yummy you made or ate 🍽️', 'The sky today ☁️', 'Something in your garden or a plant you love 🌱', 'Your shoes today 👟', 'Something with your favourite colour 🎨',
  'A cosy spot in your home 🛋️', 'Something old and special 🕰️', 'Something tiny 🔍', 'A sign or a funny word you spotted 🪧', 'Something you’re reading, watching or listening to 📚',
  'Your breakfast 🥣', 'A shadow or reflection 🌗', 'Something you made with your hands ✂️', 'Something round ⚪', 'Your favourite thing in your bag 👜',
  'A bird, bug or critter 🐦', 'Something that’s been in the family a long time 💝', 'Your happy place 🏖️', 'Something you’d give a gold medal 🥇', 'Something blue 💙',
  'A cloud that looks like something ☁️', 'Your window view at sunset 🌅', 'A flower 🌸', 'Something that makes a sound 🔔', 'Your weekend in one photo 📸',
];
export const nzDay = (t = Date.now()) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' }); // YYYY-MM-DD
const dayNum = d => Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5);
export function dailyPrompt(day = nzDay()) {
  const n = dayNum(day), photo = n % 2 === 1, list = photo ? CHALLENGES : QUESTIONS;
  const k = Math.floor(n / 2) * 7 % list.length; // steps through the list without repeating for a while
  return { day, key: 'dq' + day.replace(/-/g, ''), type: photo ? 'photo' : 'question', text: list[k] };
}
