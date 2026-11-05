/* 1.9.70 😂 joke cards: clean family jokes plus a few cheeky (never rude or offensive) ones. Two a day, dropped into the
   feed at random spots; tap to reveal the punchline. */
const JOKES = [
  ['Why don’t eggs tell jokes?', 'They’d crack each other up.'], ['What do you call a sleeping dinosaur?', 'A dino-snore.'],
  ['Why did the scarecrow win an award?', 'He was outstanding in his field.'], ['What do you call a fake noodle?', 'An impasta.'],
  ['Why can’t you trust stairs?', 'They’re always up to something.'], ['What did the ocean say to the beach?', 'Nothing, it just waved.'],
  ['Why did the bicycle fall over?', 'It was two-tired.'], ['What do you call a pile of cats?', 'A meow-ntain.'],
  ['How does a penguin build its house?', 'Igloos it together.'], ['Why did the cookie go to the doctor?', 'It was feeling crummy.'],
  ['What’s orange and sounds like a parrot?', 'A carrot.'], ['Why do cows wear bells?', 'Because their horns don’t work.'],
  ['What do you call a bear with no teeth?', 'A gummy bear.'], ['Why was the maths book sad?', 'It had too many problems.'],
  ['What did one wall say to the other?', 'I’ll meet you at the corner.'], ['Why don’t skeletons fight each other?', 'They don’t have the guts.'],
  ['What do you call cheese that isn’t yours?', 'Nacho cheese.'],
  ['What do you call a dog magician?', 'A labracadabrador.'], ['How do you organise a space party?', 'You planet.'],
  ['Why did the tomato blush?', 'It saw the salad dressing.', 1], ['What’s a sheep’s favourite sitcom?', 'Baa-ver-ly Hills… no wait, The Big Baa-ng Theory.'],
  ['Why did the kiwi cross the road?', 'To prove it wasn’t chicken.'], ['What do you call a lazy kangaroo?', 'A pouch potato.'],
  ['Why did the teddy bear say no to dessert?', 'It was already stuffed.'], ['What kind of tree fits in your hand?', 'A palm tree.'],
  ['Why do bees have sticky hair?', 'They use honeycombs.'], ['What did the grape do when it got stepped on?', 'Let out a little wine.'],
  ['What do you call a fish wearing a bowtie?', 'Sofishticated.'], ['Why did the computer go to the doctor?', 'It had a virus… and a terrible byte.'],
  ['I told my wife she was drawing her eyebrows too high.', 'She looked surprised.', 1], ['I used to hate facial hair…', 'but then it grew on me.'],
  ['My partner asked me to stop singing Wonderwall.', 'I said maybe…', 1],
  ['I asked the gym instructor if he could teach me to do the splits.', 'He said, “How flexible are you?” I said, “I can’t make Tuesdays.”', 1],
  ['What’s the best thing about Switzerland?', 'I don’t know, but the flag is a big plus.'], ['I only know 25 letters of the alphabet.', 'I don’t know y.'],
  ['I’m reading a book about anti-gravity.', 'It’s impossible to put down.'], ['Did you hear about the claustrophobic astronaut?', 'He just needed a little space.'],
  ['My wife said I should do lunges to stay in shape.', 'That would be a big step forward.', 1], ['I told my husband he was average.', 'I was just being mean.', 1],
  ['What do you call a man with a rubber toe?', 'Roberto.'], ['Why don’t oysters share their pearls?', 'Because they’re shellfish.'],
  ['What do you call an alligator in a vest?', 'An investigator.'], ['Why can’t a nose be 12 inches long?', 'Because then it would be a foot.'],
  ['Parallel lines have so much in common.', 'It’s a shame they’ll never meet.'],
  ['Why did the coffee file a police report?', 'It got mugged.'], ['How do you make a tissue dance?', 'Put a little boogie in it.', 1],
  ['What’s brown and sticky?', 'A stick.'], ['My doctor told me I was going deaf.', 'The news was hard for me to hear.'],
  ['Marriage is like a deck of cards.', 'In the beginning all you need is two hearts and a diamond. By the end you wish you had a club and a spade.', 1],
  ['I asked my wife if I was the only one she’d ever been with.', 'She said yes – the others were nines and tens.', 1],
  ['Why did the man put his money in the freezer?', 'He wanted cold hard cash.', 1], ['My husband and I have the secret to a long marriage.', 'Twice a week we go to a lovely restaurant. He goes Tuesdays, I go Fridays.', 1],
  ['What did the bra say to the hat?', 'You go on ahead, I’ll give these two a lift.', 1], ['Why was the broom late?', 'It over-swept.'],
  ['I tried to catch some fog this morning.', 'I mist.'], ['Why don’t calendars ever win arguments?', 'Their days are numbered.'],
  ['What do you call a boomerang that won’t come back?', 'A stick.'], ['Why did the pony get sent to his room?', 'He wouldn’t stop horsing around.'],
  ['What did the left eye say to the right eye?', 'Between you and me, something smells.'], ['Why do seagulls fly over the sea?', 'Because if they flew over the bay they’d be bagels.'],
  ['What’s the difference between a hippo and a Zippo?', 'One is really heavy, the other is a little lighter.'], ['Why did the banana go to the doctor?', 'It wasn’t peeling well.'],
  ['My wife told me to take the spider out instead of killing it.', 'We went for a drink. Nice guy. He’s a web developer.', 1],
  ['What do you call a cow with no legs?', 'Ground beef.'], ['I’m on a seafood diet.', 'I see food and I eat it.'],
  ['Why did the dad bring a ladder to the bar?', 'He heard the drinks were on the house.', 1], ['What’s a ghost’s favourite dessert?', 'I scream.'],
  ['Why did the sitcom writer get a job at the bakery?', 'He was great at coming up with rolls.'], ['What do you get from a pampered cow?', 'Spoiled milk.'],
];
const JK_E = ['😂', '🤣', '😆', '😹', '🙃', '😜', '🤭', '😝'];
function jokesToday() { const d = seenDayN(), n = JOKES.length; return [0, 1].map(k => { const j = (d * 2 + k) * 13 % n; return { id: 'joke-' + j, j, q: JOKES[j][0], a: JOKES[j][1], cheeky: !!JOKES[j][2], e: JK_E[(d + k) % JK_E.length] }; }); }
function jokeCard(i) {
  const k = i.k;
  return `<article class="card xc joke${k.cheeky ? ' cheeky' : ''}" data-id="${esc(k.id)}" style="--band-e:'${k.e}'">${xHead(k.e, k.cheeky ? 'A cheeky one' : 'Joke of the day', k.cheeky ? 'Grown-up giggle, nothing rude' : 'Guaranteed groan or your money back', 'Joke')}
    <div class="bd"><h3 class="xq jkq">${esc(k.q)}</h3><button class="jka" data-joke aria-expanded="false"><span class="jkh">👀 Tap for the punchline</span><span class="jkp" hidden>${esc(k.a)}</span></button></div></article>`;
}
document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-joke]'); if (!b) return; const p = b.querySelector('.jkp'), h = b.querySelector('.jkh'), on = p.hidden; p.hidden = !on; h.hidden = on; b.setAttribute('aria-expanded', on); b.classList.toggle('on', on); if (on && navigator.vibrate) navigator.vibrate(12); });
const jkCard = window.card; window.card = function (i) { return i && i.x === 'joke' ? jokeCard(i) : jkCard(i); };
const jkFestive = window.festive;
window.festive = function (order, nPins) {
  order = jkFestive ? jkFestive(order, nPins) : order; if (order.length < 10) return order;
  const out = order.slice(), J = jokesToday().filter(k => !out.some(x => x.id === k.id));
  J.forEach((k, n) => { const at = Math.min(Math.max(2, nPins) + 5 + n * 14 + (hash(k.id + seenDayN()) % 6), out.length); out.splice(at, 0, { id: k.id, x: 'joke', k, topic: 'games', t: k.q }); });
  return out;
};
