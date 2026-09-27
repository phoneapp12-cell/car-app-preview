# Car & Life Due Dates

A small installable web app (PWA) for keeping track of WOF, rego and servicing for the family's cars, plus service history, drivers (AA membership and licence dates), pets (flea treatment, worming, vaccinations, grooming, vet check-ups, dog registration), bills, to-dos, appointments, repeating events of your own (payday, rubbish day…), birthdays and ideas, with reminders. It can also show events from an Outlook.com, Google or iCloud calendar link.

- Open it: https://phoneapp12-cell.github.io/car-app-preview/
- Install it: in Chrome on Android tap ⋮ then **Add to Home screen** / **Install app**. On iPhone (Safari) tap **Share** then **Add to Home Screen**.
- Your data is saved on your phone only (IndexedDB). The only thing that leaves the phone is a connected calendar link, which is passed to the calendar link service (`relay/`) to fetch the calendar. Use **Settings › Export backup** now and then.
- Home shows the Whangārei weather (from Open-Meteo, straight from the phone) and **More › Events** lists what's on in Whangārei over the next 60 days (from the council, through the relay). Neither sends anything about you.

- New Zealand public holidays are built in and on by default (Settings › Show public holidays). No setup and no internet needed.
- **Meal planner** (More › Meal planner): plan dinners for your cooking nights only (Friday and Saturday to start with), with ideas, suggestions, a shopping list and history. Everything is written **gluten free** (Shane has coeliac disease). See below.
- **My events** (Calendar › Add event, v1.6.0): your own events like payday, rubbish day or recycling, one-off or repeating, with an optional reminder. See below.
- **Pets & Vet** (More › Pets & Vet, v1.5.0): your pets with their care items – flea treatment, worming, vaccinations, grooming, vet check-ups, dog registration and your own items – with due dates on Home and the Calendar. See below.
- **Lifting bridge – Dave Culham Drive** (Te Matau ā Pohe): the likely state of the bridge and the next change, worked out from the council's lift times. It's **not live**. Open it from Home, **More › Lifting bridge**, or the **Bridge** app shortcut (long-press the app icon on Android).

## Public holidays
Built into `core.js` (`nzHolidays(year)`), using the Holidays Act rules and the official dates published on
[employment.govt.nz](https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates) and
[govt.nz](https://www.govt.nz/browse/work-and-tax/public-holidays-and-work/dates-for-public-holidays-and-anniversary-days/):
New Year's Day and 2 January, Waitangi Day, Good Friday, Easter Monday, ANZAC Day, King's Birthday, Matariki (dates from Schedule 1 of
Te Kāhui o Matariki Public Holiday Act 2022, to 2052), Labour Day, Christmas Day and Boxing Day, plus Auckland Anniversary Day
(Northland's regional holiday, the Monday nearest 29 January). When Waitangi, ANZAC, Christmas, Boxing Day, 1 or 2 January falls on a
weekend, the Monday (or Tuesday) day off is shown as "(observed)". If a connected calendar (e.g. Google's NZ holidays) has the same
holiday on the same day, it isn't shown twice. The 2026–2028 dates are checked by `pwtest/holidays.mjs`.

## Meal planner
**Gluten free (coeliac):** all 40 starter ideas are written with explicit gluten-free ingredients – gluten-free pasta/spaghetti/macaroni/lasagne sheets, gluten-free soy sauce (tamari), cornflour or gluten-free flour for thickening, gluten-free pastry, buns, wraps, breadcrumbs, gravy, pizza bases, stock, sausages and sauces (BBQ, Worcestershire, curry paste, taco seasoning), rice noodles and corn tortillas. In v1.4.1 two dishes that don't work well gluten free were swapped: **Beef and black bean → Beef and broccoli stir fry** (gluten-free black bean sauce is hard to find) and **Sausage sizzle → BBQ chicken thighs with corn** (it's all about the white bread). Ideas and planned meals show a small **GF** marker; the planner has one note: "All ideas are written gluten free. Always check labels for 'gluten free', especially stock, sauces, sausages and seasonings." Nothing is claimed to be guaranteed safe. Typed-in meals and own ideas not ticked "Gluten free" are flagged, and **Suggest / Surprise me only pick ideas ticked "Gluten free"** (the tick is on by default for new ideas). The shopping list keeps the GF wording and adds "check label" to items where gluten often hides (stock, sauces, tamari, gravy, curry paste, sausages, seasonings, bacon, ham, corn chips, baked beans, cornflour, tortillas…).

*Updating from v1.4.0:* saved starter ideas get the new ingredients (favourites, hidden, notes and links are kept; starter ideas you've edited yourself are left alone from now on). Upcoming nights holding a swapped dish switch to its replacement (a one-off message says so); past nights keep what was cooked. Your own ideas and planned nights are kept; own ideas made before this start unticked, since they weren't written gluten free.

- **Cooking nights:** tap the day chips at the top of the planner (default Fri and Sat). The plan shows only those nights for the next 4 weeks.
- **Each night:** pick a meal from your ideas or type one in, with optional notes. **Suggest** picks one at random from your ideas, skipping anything planned in the 3 weeks before or after (favourites come up more often, hidden ideas never). **Surprise me for all** fills every empty night (Undo in the message).
- **Cooked:** tick it on the night; past nights go into **History** (with "Cooked" or "Not ticked").
- **Ideas:** 40 family-friendly starter dinners, each tagged Quick, BBQ, Slow cook, Oven bake, Budget or Takeaway-style, with a short ingredient list. Add your own, edit, favourite (★) or hide them; each can have a recipe link and ingredients (starter ideas can be hidden rather than deleted).
- **Shopping list:** tick the planned nights, then **Add to To-do** (adds the ingredients to a to-do list, Shopping by default, without duplicates) or **Copy list** (one item per line, to paste into another grocery app).
- **Home › Upcoming meals** (v1.4.2): a card under the weather, lifting bridge and holidays, above the tiles, listing planned meals with their dates, e.g. "Fri 2 Oct – Butter chicken" with the GF marker (or "Check it's gluten free") and Tonight / Tomorrow / In N days. Only nights with a meal entered are listed – empty nights are left out – and the whole card is hidden when nothing is planned. Today's meal is included until it's ticked as cooked; after that it's upcoming cooking nights within the planner's 4 weeks, up to 6, with **See all** (showing the count when there are more) going to the planner. Tapping a meal opens that night in the planner. It replaces the old "Tonight / Tomorrow" line, so a meal never shows twice on Home. **Calendar** shows planned meals with a "Meal" tag (turn off in the planner or Settings › Calendar).
- Saved with everything else in `S.meals`, so it's in backups. The bottom bar stays at five tabs so it fits a 360 px screen. Tested by `pwtest/meals.mjs`.

## My events (repeating)
Add from the Calendar with the **Add event** button under the month, or tap a day first ("Add event on Mon 5 Oct"). Starts empty; the form offers quick-add **Payday** (every 2 weeks), **Rubbish day** (every week) and **Recycling day** (every 2 weeks), which fill in the title and repeat.
- **Fields:** title, start date, **All day** (default) or **At a time**, repeat, optional end date, reminder, notes. The form shows the next few dates as you go.
- **Repeat:** Doesn't repeat, Every week, Every 2 weeks (counted from the start date), Every 4 weeks, Every month on the same date (for the 29th–31st it's on the last day in shorter months, and the form says so), Every month on the last day, Every year (29 Feb → 28 Feb in other years). Optional end date (the last date can be on it).
- **Tap a date** on the Calendar for: **Skip this date**, **Move this date** (just that one, e.g. rubbish day after a public holiday; "Put back" undoes it), **Edit series** and **Delete series** (asks first; Undo in the message). The edit form lists skipped and moved dates with **Put back**.
- **Calendar:** its own "My event" tag, indigo colour and "My events" legend entry. **Settings › Calendar › Show my events** turns them off on the Calendar.
- **Home:** a small line under the weather/bridge/holidays, above the tiles: "Today: Rubbish day" with "Tomorrow: Payday" underneath (or "Tomorrow: …" on its own). Tapping it opens that day on the Calendar. Only today and tomorrow, and they're not repeated in "Coming up this week". Hidden when nothing is on.
- **Reminders** (per event): Off, On the day, or The day before, at a time you pick between 7 am and 8:30 pm (defaults 7 am on the day, 7 pm the day before). Never between 9 pm and 7 am; moved dates are reminded on their new day, skipped dates not at all.
- Saved in `S.myEvents` (`start`, `repeat`, `until`, `skips`, `moves`, `remind`, `remindAt`), so they're in backups; older backups restore fine. Dates are worked out in `core.js` (`repeatDates`) so the service worker reminders use the same rules. Tested by `pwtest/recurring.mjs`.

## Pets & Vet
**More › Pets & Vet** (the bottom bar stays at five tabs). Starts empty with an **Add your first pet** button; there are no example pets.
- **Pets:** add as many as you like: name, type (dog, cat or other), breed, birthday (optional, shows the age), microchip number (optional), vet clinic and phone (optional; the pet page has a **Call** button, a `tel:` link). Edit from the pet page; **Delete** asks first, and the message has Undo.
- **Care items:** each new pet gets flea treatment (monthly), worming (every 3 months), vaccinations (yearly), grooming (every 6 weeks) and a vet check-up (yearly); dogs also get **dog registration**, due every **1 July** (the NZ registration year runs 1 July to 30 June; paying from May counts for the coming year, paying January–April counts for the current one; with nothing entered it shows the next 1 July). Every interval can be changed (weeks, months, years, or "Doesn't repeat"), items can be deleted, and you can add your own (e.g. a medication, heartworm, tick treatment).
- Each item keeps its **last done** date and works out the **next due** date from it, or you can set the next due date yourself (a set date wins, and is cleared the next time you tick Done).
- **Done** records the date (today unless you change it) with optional notes (product, vaccine…) and cost in the pet's **History**, and rolls the item forward. History entries can be edited or deleted.
- **Home:** due pet care feeds the Overdue / Due soon / All good tiles and **Needs attention**, exactly like the car due dates (same 30-day due-soon window, paw icon, "Max: Flea treatment"); like car dates it isn't repeated in "Coming up this week". Tapping opens the pet.
- **Calendar:** its own "Pet" tag, brown colour and "Pets" legend entry, plus the Overdue list. **Settings › Calendar › Show pets** turns it off (Home still shows them).
- **Reminders:** 3 days before and on the day (once if overdue), never between 9 pm and 7 am.
- Saved in `S.pets` (care items in `pet.care`, history in `pet.history`), so pets are in backups; older backups without pets restore fine. Due dates are worked out in `core.js` (`careDue`, `regDueAfter`) so the service worker reminders use the same rules. Tested by `pwtest/pets.mjs`.

## Lifting bridge card
The council doesn't publish live lift status, so the card says "Not live – based on the council's lift times". The rules (`bridgeStatus` in `core.js`) come from the
[council's bridge page](https://www.wdc.govt.nz/Services/Roads-and-Transportation/Transportation/Te-Matau-a-Pohe-bridge):
- Summer hours from the last Sunday in September to the day before the first Sunday in April: weekdays 9 am – 4 pm and 6 – 7 pm, weekends 7 am – 7 pm. Winter: weekdays 9 am – 4 pm, weekends 8 am – 5 pm. In those hours lifts are on request (about 5 a day, each stopping traffic for about 5–7 minutes).
- No lifts on weekdays 7 – 9 am and 4 – 6 pm (peak traffic). A scheduled lift at 12:00 noon. Outside staffed hours lifts are on call only.
- "Too windy for lifts (forecast)" when the Open-Meteo wind forecast is over gale force (34 knots, about 63 km/h).
- "Closed" during a planned closure that mentions the bridge or Dave Culham Drive on the council's [Roadworks and closures](https://www.wdc.govt.nz/Services/Roads-and-Transportation/Roads/Roadworks-and-closures) page (read by the relay's `GET /closures`, saved on the phone as `closures`, refreshed every 3 hours; if it can't be read the card just shows the schedule).
- **Live traffic** opens Google Maps at the bridge with the traffic layer.

Where it shows (Settings › Lifting bridge): **Near only** (default), **Always on Home** or **Off**. With Near only, Home shows a short line under the weather until you tap **Show when I'm near**; after that the card appears at the top of Home only when the app is opened within about 2 km of the bridge. Location is used only while the app is open and never saved; only the yes/no choice is stored. Tested by `pwtest/bridge.mjs`.

## Weather and events sources
- **Weather:** [Open-Meteo](https://open-meteo.com/) forecast API (no key, free for non-commercial use). Weather data by Open-Meteo.com, licensed CC BY 4.0; the credit is shown on the weather screen. Whangārei: lat -35.7251, lon 174.3237, Pacific/Auckland, °C, km/h. The last forecast is saved on the phone (`localStorage` key `wx`) and refreshed when the app opens if it's more than 30 minutes old. If Open-Meteo can't be reached, the app tries the relay's `/weather` copy. The full forecast screen links to [MetService Whangārei](https://www.metservice.com/towns-cities/regions/northland/locations/whangarei) for warnings.
- **Events:** [Whangārei District Council – What's On](https://www.wdc.govt.nz/Events/Whats-On), read by the relay's `GET /events` (the council site has no feed and doesn't allow browser access). The council's copyright notice allows reproducing its content for personal, informational and non-commercial use, and robots.txt allows these pages. Each event links back to its council page. Saved on the phone as `events` and refreshed every 3 hours. **Add to calendar** creates a normal appointment in the app's own Calendar (Undo in the message, or delete it like any appointment).

## Files
- `index.html` – page and styles
- `app.js` – the app screens (Home with weather and the lifting bridge, Cars, Calendar, To-do, More › Events, Meal planner, Pets & Vet, Bills, Birthdays, Ideas, Settings) and calendar sync
- `core.js` – dates, reminder schedule and on-device storage (shared with the service worker)
- `ical-import.js` – reads .ics calendars (time zones incl. Windows names, all-day, repeats, exceptions, cancellations)
- `vendor/ical.min.js` – ical.js 2.2.1 (Mozilla, MPL-2.0), unmodified
- `sw.js` – service worker: offline cache, background reminder checks, notification taps
- `relay/` – the tiny calendar link service (Cloudflare Worker), plus the read-only `/events`, `/weather` and `/closures` endpoints. See `relay/README.md`
- `manifest.webmanifest`, `icons/` – install details and app icons

## Calendar link service
`RELAY_DEFAULT` in `app.js` is the deployed address: `https://due-dates-calendar-relay.phoneapp12.workers.dev` (Cloudflare Workers, free plan; only accepts requests from `https://phoneapp12-cell.github.io`). If it's ever set back to empty, the app says the service is being set up and everything else works as normal.

## Shipping an update
Change `VERSION` in `sw.js` (and `APP_VERSION` in `app.js`), commit and push. The app picks up the new version the next time it's opened.
