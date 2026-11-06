/* 1.9.70 😂 joke cards: clean family jokes plus a few cheeky (never rude or offensive) ones. Two a day, dropped into the
   feed at random spots; tap to reveal the punchline. */
const JOKES = [
  ['I told my wife she was drawing her eyebrows too high.', 'She looked surprised.'],
  ['My dog keeps staring at me like I owe him money.', 'I checked. Apparently I do. Two biscuits, plus interest.'],
  ['Why did the GPS break up with the car?', 'It kept saying ’recalculating’ and the car took it personally.'],
  ['I tried to start a hot air balloon business.', 'It never really took off. Then it did, and I wasn’t on it.'],
  ['What’s the fastest way to make a cat love you?', 'Ignore it completely. Works on teenagers too.'],
  ['My phone battery lasts longer than my New Year’s resolutions.', 'And it’s three years old.'],
  ['I asked the librarian if they had books on paranoia.', 'She whispered, ’They’re right behind you.’'],
  ['Why did the toddler bring a ruler to bed?', 'To see how long they could stay awake. Answer: until your show starts.'],
  ['I bought a ceiling fan.', 'Now it just stands up there cheering all day.'],
  ['My smart fridge told me I’d eaten too much cheese.', 'So I unplugged it. Problem solved, cheese saved.'],
  ['What do you call a dog that does magic tricks?', 'A labracadabrador.'],
  ['Why don’t scientists trust atoms?', 'Because they make up everything. Including that excuse about the dishes.'],
  ['I told my cat a joke about mice.', 'He didn’t laugh, but he did go quiet and stare at the wall for an hour.'],
  ['My memory is so bad, I’ve started leaving myself notes.', 'I just found one that says ’Don’t forget.’ Forget what?!'],
  ['Why did the kid put the cheese in the microwave?', 'He wanted to make a melt-down. He did. So did I.'],
  ['I went to buy camouflage pants.', 'Couldn’t find any.'],
  ['What did the left eye say to the right eye?', 'Between you and me, something smells.'],
  ['How do you know a dog has eaten your homework?', 'The dog is now very good at algebra and won’t stop talking about it.'],
  ['Parenting tip: you can’t lose an argument with a two-year-old.', 'Because they’ve already wandered off mid-sentence.'],
  ['Why are elevator jokes so good?', 'They work on so many levels.'],
  ['My wife asked me to put ketchup on the shopping list.', 'Now I can’t read the list.'],
  ['Why did the seagull fly over the sea?', 'Because if it flew over the bay, it’d be a bagel.'],
  ['I’m reading a book about anti-gravity.', 'It’s impossible to put down.'],
  ['What’s a cat’s favourite TV show?', 'Anything playing on the screen you’re trying to use.'],
  ['Why did the sitcom character never leave the coffee shop?', 'Ten seasons, one couch, zero rent.'],
  ['I asked my dog what two minus two is.', 'He said nothing.'],
  ['My doctor told me to watch my drinking.', 'So now I drink in front of a mirror.', 1],
  ['Why did the cow cross the road?', 'To get to the udder side. It took a while. Cows don’t rush.'],
  ['The rotation of the Earth really makes my day.', 'Literally.'],
  ['I used to hate facial hair.', 'But then it grew on me.'],
  ['My kids think I’m too old for TikTok.', 'I’m not. I just can’t find where I left my glasses to watch it.'],
  ['Why did the scarecrow get promoted?', 'Outstanding in his field, and never once took a lunch break.'],
  ['Why did the bicycle fall over?', 'It was two-tired. Same, bicycle. Same.'],
  ['Every time I try to eat healthy,', 'a chocolate bar looks at me and says, ’Don’t be silly.’'],
  ['What do you call a fish wearing a bowtie?', 'Sofishticated.'],
  ['I told my partner we should do more things together.', 'So now we argue about the remote in the same room.'],
  ['Why did the cat sit on the computer?', 'To keep an eye on the mouse, and to stop you working.'],
  ['What’s the best thing about Switzerland?', 'No idea, but the flag is a big plus.'],
  ['I accidentally swallowed some food colouring.', 'The doctor says I’m fine, but I feel like I’ve dyed a little inside.'],
  ['Why did the dog sit in the shade?', 'He didn’t want to be a hot dog.'],
  ['My car’s sat nav has started sighing.', 'I think it’s given up on me.'],
  ['I’d tell you a joke about the roof,', 'but it’d go over your head.'],
  ['Why do ducks have feathers?', 'To cover their butt quacks.', 1],
  ['What did the grape do when it got stepped on?', 'Let out a little wine.'],
  ['My bed is a magical place.', 'I suddenly remember everything I forgot to do.'],
  ['Why don’t skeletons fight each other?', 'They don’t have the guts.'],
  ['My dog learned to sit in one day.', 'Now he’s working on ’stay off the couch.’ Week nine.'],
  ['Why did the man get fired from the orange juice factory?', 'He couldn’t concentrate.'],
  ['I asked the gym trainer which machine to use to impress people.', 'He pointed at the ATM outside.', 1],
  ['What’s the loudest pet?', 'A trum-pet.'],
  ['Why do cows wear bells?', 'Because their horns don’t work.']
];
const JK_E = ['😂', '🤣', '😆', '😹', '🙃', '😜', '🤭', '😝'];
function jokesToday() { const d = seenDayN(), n = JOKES.length; return [0, 1].map(k => { const j = (d * 2 + k) * 13 % n; return { id: 'joke-' + j, j, q: JOKES[j][0], a: JOKES[j][1], cheeky: !!JOKES[j][2], e: JK_E[(d + k) % JK_E.length] }; }); }
function jokeCard(i) {
  const k = i.k;
  return `<article class="card xc joke${k.cheeky ? ' cheeky' : ''}" data-id="${esc(k.id)}" style="--band-e:'${k.e}'">${xHead(k.e, k.cheeky ? 'A cheeky one ' + forMe() : 'Joke of the day ' + forMe(), k.cheeky ? 'Grown-up giggle, nothing rude' : 'Guaranteed groan or your money back', 'Joke')}
    <div class="bd"><h3 class="xq jkq">${esc(k.q)}</h3><p class="jka jkshow"><span class="jkp">😂 ${esc(k.a)}</span></p></div></article>`;
}
document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-joke]'); if (!b) return; const p = b.querySelector('.jkp'), h = b.querySelector('.jkh'), on = p.hidden; p.hidden = !on; h.hidden = on; b.setAttribute('aria-expanded', on); b.classList.toggle('on', on); if (on && navigator.vibrate) navigator.vibrate(12); });
const jkCard = window.card; window.card = function (i) { return i && i.x === 'joke' ? jokeCard(i) : jkCard(i); };
const jkFestive = window.festive;
window.festive = function (order, nPins) {
  order = jkFestive ? jkFestive(order, nPins) : order; return order; // 1.9.97 Shane: joke only in the top row, no joke cards in the feed
  const out = order.slice(), J = jokesToday().filter(k => !out.some(x => x.id === k.id));
  J.forEach((k, n) => { const at = Math.min(Math.max(2, nPins) + 5 + n * 14 + (hash(k.id + seenDayN()) % 6), out.length); out.splice(at, 0, { id: k.id, x: 'joke', k, topic: 'games', t: k.q }); });
  return out;
};
