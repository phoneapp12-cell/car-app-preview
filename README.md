# Car & Life Due Dates

A small installable web app (PWA) for keeping track of WOF, rego and servicing for the family's cars, plus service history, drivers (AA membership and licence dates), pets (flea treatment, worming, vaccinations, grooming, vet check-ups, dog registration), bills, to-dos, appointments, repeating events of your own (payday, rubbish day…), commission by pay fortnight, birthdays and ideas, with reminders. It can also show events from an Outlook.com, Google or iCloud calendar link.

- Open it: https://phoneapp12-cell.github.io/car-app-preview/
- Install it: in Chrome on Android tap ⋮ then **Add to Home screen** / **Install app**. On iPhone (Safari) tap **Share** then **Add to Home Screen**.
- Your data is saved on your phone (IndexedDB). Settings › Sync can also keep a second device in step: you create a private code on one device and type it on the other. The copy is encrypted with that code and stored by the calendar link service (`relay/`, `POST /sync`). A connected calendar link is still passed to that service to fetch the calendar. Use **Settings › Export backup** now and then.
- Home shows the Whangārei weather (from Open-Meteo, straight from the phone) and **More › Events** lists what's on in Whangārei over the next 60 days (from the council, through the relay). Neither sends anything about you.

- New Zealand public holidays are built in and on by default (Settings › Show public holidays). No setup and no internet needed.
- **Meal planner** (More › Meal planner): plan dinners for your cooking nights only (Friday and Saturday to start with), with ideas, suggestions, a shopping list and history. Everything is written **gluten free** (Shane has coeliac disease). See below.
- **Commission** (More › Commission, v1.7.0): enter each day's commission the day after, grouped into Monday-to-Sunday pay fortnights, with totals, a chart and an optional 9 am reminder. See below.
- **My events** (Calendar › Add event, v1.6.0): your own events like payday, rubbish day or recycling, one-off or repeating, with an optional reminder. See below.
- **Health** (More › Health, v1.8.0): dentist, doctor, chiropractor and other check-ups for each person, with clinic phone, repeat interval, booked appointments, reminders and history. See below.
- **Pets & Vet** (More › Pets & Vet, v1.5.0): your pets with their care items – flea treatment, worming, vaccinations, grooming, vet check-ups, dog registration and your own items – with due dates on Home and the Calendar. See below.
- **Colour themes** (Settings › Appearance, v1.9.0): Teal (the standard look), Blue, Green, Purple, Orange and Dark, plus **Match phone** to follow the phone's light or dark mode. See below.
- **Weather card** (Home, v1.9.0): now graphical, with weather icons, the next 12 hours in a strip and each day's high and low drawn as a bar. See below.
- **Calendar** (v1.9.0): each day in the month shows short coloured labels for what's on (up to 3, then "+N more"), and tapping a day opens a day view under the month. See below.
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
- **Home › Upcoming meals** (v1.4.2): a card under the weather, lifting bridge and holidays, above the tiles, listing planned meals with their dates, e.g. "Fri 2 Oct – Butter chicken" with the GF marker (or "Check it's gluten free") and Tonight / Tomorrow / In N days. Only nights with a meal entered are listed – empty nights are left out – and the whole card is hidden when nothing is planned. Today's meal is included until it's ticked as cooked; after that it's upcoming cooking nights within the planner's 4 weeks, up to 6, with **See all** (showing the count when there are more) going to the planner. Tapping a meal opens that night in the planner. It replaces the old "Tonight / Tomorrow" line, so a meal never shows twice on Home. **Calendar** shows planned meals with a "Meal" tag (turn off in the planner or Settings › Calendar). Since v1.7.0 tonight's dinner is in Needs attention ("Tonight: Butter chicken"), so the card starts from the next night.
- Saved with everything else in `S.meals`, so it's in backups. The bottom bar stays at five tabs so it fits a 360 px screen. Tested by `pwtest/meals.mjs`.

## My events (repeating)
Add from the Calendar with the **Add event** button under the month, or tap a day first ("Add event on Mon 5 Oct"). Starts empty; the form offers quick-add **Payday** (every 2 weeks), **Rubbish day** (every week) and **Recycling day** (every 2 weeks), which fill in the title and repeat.
- **Fields:** title, start date, **All day** (default) or **At a time**, repeat, optional end date, reminder, notes. The form shows the next few dates as you go.
- **Repeat:** Doesn't repeat, Every week, Every 2 weeks (counted from the start date), Every 4 weeks, Every month on the same date (for the 29th–31st it's on the last day in shorter months, and the form says so), Every month on the last day, Every year (29 Feb → 28 Feb in other years). Optional end date (the last date can be on it).
- **Tap a date** on the Calendar for: **Skip this date**, **Move this date** (just that one, e.g. rubbish day after a public holiday; "Put back" undoes it), **Edit series** and **Delete series** (asks first; Undo in the message). The edit form lists skipped and moved dates with **Put back**.
- **Calendar:** its own "My event" tag, indigo colour and "My events" legend entry. **Settings › Calendar › Show my events** turns them off on the Calendar.
- **Home:** (since v1.7.0) in **Needs attention** on the day and the day before, e.g. "Today: Rubbish day", "Tomorrow: Payday 7:00 pm". Tapping one opens that day on the Calendar. Skipped dates don't show, moved dates show on their new date, and they never count as Overdue. (The separate Today / Tomorrow line from v1.6.0 is gone.)
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

## Health
**More › Health** (v1.8.0, right under Pets & Vet; the bottom bar stays at five tabs). The More row shows what's next (e.g. "Next: Sarah – Dentist, tomorrow 10:30 am") and an "N overdue" pill.
- **People:** starts empty – nobody is added automatically and there's no example data. Quick-add chips for **Shane**, **Sarah** and **Cass** (on the empty page, under the list and in the Add a person form) add that person when tapped (with Undo); chips for people already added are hidden. Each person has a name, an optional **NHI number** (checked: 3 letters then 4 numbers, or 3 letters, 2 numbers and 2 letters; tidied to capitals) and notes (e.g. allergies or medications). Edit from the person page; **Delete** asks first, and the message has Undo.
- **Check-ups:** a new person has none, just a quick-add row of the suggested types: Dentist (6 months), Doctor check-up (1 year), Chiropractor (4 weeks), Optometrist (2 years), Hygienist (6 months), Physio (doesn't repeat), Skin check (1 year), Flu jab (1 year, with a note that it's usually in autumn, March to May), Prescription repeat (3 months), or **Something else** for your own. Each has a type, name, clinic (suggested from clinics already used; picking a type fills in the clinic already used for it), clinic phone (a tap-to-call button on the row, a `tel:` link), repeat interval (weeks, months, years or "Doesn't repeat" for one-offs – all editable), **last done**, and an optional **next due** date set by hand that wins over the worked-out one.
- **Booked appointment:** optional date and time on the check-up. While it's booked (today or later) the booking stands in for the due date: the row shows "Booked Fri 2 Oct 10:30 am", and the check-up isn't counted as due or overdue and gets no due-date reminders, so it never shows twice. If the date passes without ticking Done, the row asks you to tick Done and the due date counts again.
- **Done** records the date (today, or the booking date if it's passed), optional notes and cost in the person's **History**, rolls the item forward and clears the booking (all with Undo). History entries can be edited or deleted; the last done date follows the latest entry.
- **Home › Needs attention:** the `health` source in `ATT_SOURCES`. Check-ups due within 30 days or overdue ("Sarah – Dentist · Health · Smile Dental · Due Sat 10 Oct"; these are real due dates, so they count in the Overdue / Due soon tiles like pets), and bookings today and tomorrow ("Tomorrow: Sarah – Dentist 10:30 am"). Tapping opens the person's page with that check-up highlighted.
- **Calendar:** bookings (at their time) and due check-ups, with a "Health" tag, teal colour and "Health" legend entry, plus the Overdue list. **Settings › Calendar › Show health** turns it off (Home still shows them).
- **Reminders:** check-ups 3 days before and on the day (once if overdue); bookings the evening before at 7 pm ("Tomorrow: Sarah – Dentist 10:30 am") and 2 hours before if that falls between 7 am and 9 pm. Never between 9 pm and 7 am, like everything else.
- Saved in `S.health` (`person.items`, `person.history`), so it's in backups (the restore summary counts people in Health); older backups without it restore fine. Due dates use the same `careDue` maths as pet care, and bookings come from `healthAppts`, both in `core.js`, so the service worker reminders follow the same rules. Tested by `pwtest/health.mjs`.

## Lifting bridge card
The council doesn't publish live lift status, so the card says "Not live – based on the council's lift times". The rules (`bridgeStatus` in `core.js`) come from the
[council's bridge page](https://www.wdc.govt.nz/Services/Roads-and-Transportation/Transportation/Te-Matau-a-Pohe-bridge):
- Summer hours from the last Sunday in September to the day before the first Sunday in April: weekdays 9 am – 4 pm and 6 – 7 pm, weekends 7 am – 7 pm. Winter: weekdays 9 am – 4 pm, weekends 8 am – 5 pm. In those hours lifts are on request (about 5 a day, each stopping traffic for about 5–7 minutes).
- No lifts on weekdays 7 – 9 am and 4 – 6 pm (peak traffic). A scheduled lift at 12:00 noon. Outside staffed hours lifts are on call only.
- "Too windy for lifts (forecast)" when the Open-Meteo wind forecast is over gale force (34 knots, about 63 km/h).
- "Closed" during a planned closure that mentions the bridge or Dave Culham Drive on the council's [Roadworks and closures](https://www.wdc.govt.nz/Services/Roads-and-Transportation/Roads/Roadworks-and-closures) page (read by the relay's `GET /closures`, saved on the phone as `closures`, refreshed every 3 hours; if it can't be read the card just shows the schedule).
- **Live traffic** opens Google Maps at the bridge with the traffic layer.

Where it shows (Settings › Lifting bridge): **Near only** (default), **Always on Home** or **Off**. With Near only, Home shows a short line under the weather until you tap **Show when I'm near**; after that the card appears at the top of Home only when the app is opened within about 2 km of the bridge. Location is used only while the app is open and never saved; only the yes/no choice is stored. Tested by `pwtest/bridge.mjs`.

## Colour themes (v1.9.0)
**Settings › Appearance** (at the top of Settings) has a picker with six themes: **Teal** (the standard look, same as before v1.9.0), **Blue**, **Green**, **Purple**, **Orange** and **Dark** (easy on the eyes at night). Tap one and it applies straight away, with Undo in the message. **Match phone** switches to Dark when the phone is in dark mode and back to the chosen light theme when it isn't (Teal if Dark was the choice).
- The theme is saved in the app's settings (`S.settings.theme`, `S.settings.themeAuto`) and in `localStorage` key `theme`, so `index.html` can set it before the app starts (no light flash when Dark is on). The phone's top bar colour (`theme-color`) follows the theme.
- Included in backups. Older backups without a theme restore as Teal.
- All colours are CSS variables in `index.html` (`:root` for Teal, `[data-theme=…]` for the others); themes are listed in `THEMES` in `app.js`. Calendar category colours are spaced further apart, with their own set for Dark.

## Weather card (v1.9.0)
The Home card shows the current temperature with an icon, feels-like and wind, the **next 12 hours** as a strip (icon, temperature, chance of rain in blue from 30%; scrolls sideways inside the card), then 3 days with each day's low and high drawn as a bar on one scale for the week, and **Show all 7 days**. **Full forecast** opens the Weather screen with the next 24 hours, the 7-day bars and the day-by-day list. Missing values show "–" and missing sections are left out. The app asks Open-Meteo for 48 hours of hourly data; the relay's `/weather` copy asks for the same fields (saved as `weather-v2`).

## Calendar (v1.9.0)
Each day in the month shows up to 3 short coloured labels (the first word of the title, in the category's colour), then "+N more". Tapping a day opens a **day view** under the month with that day's items, all-day first, then by time, each with its icon and tag, and **Add event on …** for that day. **Show all** closes the day view. The legend lists the categories shown.

Themes, the weather card and the calendar look are tested by `pwtest/visual.mjs` (themes apply, survive a reload and are in backups; Dark contrast spot checks; the weather card with full and missing data; chips, "+N more" and the day view; nothing scrolls sideways and the bottom bar stays flush, at 360 and 390 wide).

## Weather and events sources
- **Weather:** [Open-Meteo](https://open-meteo.com/) forecast API (no key, free for non-commercial use). Weather data by Open-Meteo.com, licensed CC BY 4.0; the credit is shown on the weather screen. Whangārei: lat -35.7251, lon 174.3237, Pacific/Auckland, °C, km/h. The last forecast is saved on the phone (`localStorage` key `wx`) and refreshed when the app opens if it's more than 30 minutes old. If Open-Meteo can't be reached, the app tries the relay's `/weather` copy. The full forecast screen links to [MetService Whangārei](https://www.metservice.com/towns-cities/regions/northland/locations/whangarei) for warnings.
- **Roadworks:** NZTA TREIS highway events within 40 km of Whangārei (read in the browser), plus council projects on [Roading improvements](https://www.wdc.govt.nz/Council/Projects/Roading-improvements) whose expected start is within the next 12 months (Pacific/Auckland). That page has no CORS header, so the app reads it from the relay’s `GET /roadworks`. Past start dates, anything further than a year out, and dates the page does not pin to a month (a two-year range, or TBC) are left out. Each project links back to the council.
- **Events:** [Whangārei District Council – What's On](https://www.wdc.govt.nz/Events/Whats-On), read by the relay's `GET /events` (the council site has no feed and doesn't allow browser access). The council's copyright notice allows reproducing its content for personal, informational and non-commercial use, and robots.txt allows these pages. Each event links back to its council page. Saved on the phone as `events` and refreshed every 3 hours. **Add to calendar** creates a normal appointment in the app's own Calendar (Undo in the message, or delete it like any appointment).

## Files
- `index.html` – page and styles
- `app.js` – the app screens (Home with weather and the lifting bridge, Cars, Calendar, To-do, More › Events, Meal planner, Pets & Vet, Health, Bills, Birthdays, Ideas, Settings) and calendar sync
- `core.js` – dates, reminder schedule and on-device storage (shared with the service worker)
- `ical-import.js` – reads .ics calendars (time zones incl. Windows names, all-day, repeats, exceptions, cancellations)
- `vendor/ical.min.js` – ical.js 2.2.1 (Mozilla, MPL-2.0), unmodified
- `sw.js` – service worker: offline cache, background reminder checks, notification taps
- `relay/` – the tiny calendar link service (Cloudflare Worker), plus the read-only `/events`, `/weather`, `/closures` and `/roadworks` endpoints. See `relay/README.md`
- `manifest.webmanifest`, `icons/` – install details and app icons

## Calendar link service
`RELAY_DEFAULT` in `app.js` is the deployed address: `https://due-dates-calendar-relay.phoneapp12.workers.dev` (Cloudflare Workers, free plan; only accepts requests from `https://phoneapp12-cell.github.io`). If it's ever set back to empty, the app says the service is being set up and everything else works as normal.

## Home › Needs attention (v1.7.0)
One combined list of everything due soon, from every section. Each item has its own icon and label line, and tapping it opens where it lives:
- **Cars** (WOF, rego, service), **drivers** (AA membership, licence), **bills**, **to-dos with a due date**, **pet care** and **health check-ups** (v1.8.0): overdue or within 30 days, as before. These are the only things that can be overdue, and the only things counted in the Overdue / Due soon / All good tiles.
- **Birthdays**: today ("Today!") and the next 7 days. Opens Birthdays.
- **Appointments**, including What's On events you added ("Event you added"), and **connected calendars** (labelled with the calendar's name): today and tomorrow, e.g. "Today: Dentist 3:30 pm". Opens that day on the Calendar.
- **My events**: today and tomorrow (see My events).
- **Tonight's dinner** if one is planned and not ticked cooked: "Tonight: Butter chicken". Opens that night in the Meal planner.
- **Health bookings** (v1.8.0): today and tomorrow, e.g. "Tomorrow: Sarah – Dentist 10:30 am". Opens the person at that check-up.
- **Commission**: "Enter yesterday's commission" when the tracker is set up and nothing is entered for yesterday. Opens Add commission for yesterday.

Sorted overdue first (most overdue at the top), then by date; on the same day due dates come first, then events by time, birthdays and dinner. Anything whose day has passed drops off. Up to 8 are shown with **Show all** (overdue items are always shown). "Cars at a glance" was removed (the car dates are all in this list), and "Coming up this week" became **Later this week** (appointments and calendar events 2–7 days out), so nothing shows twice. In `app.js` each source is a function in `ATT_SOURCES` returning `{ days, rank, sort, html }`; to add a section, add a source. Tested by `pwtest/home.mjs`.

## Commission
**More › Commission** (v1.7.0). The bottom bar stays at 5 tabs; the More row shows this fortnight's total.
- **Pay fortnights** run Monday to the Sunday 13 days later. The first time, the app asks for the Monday the current pay fortnight started (the most recent Monday is suggested, the one before is offered, or pick another Monday; only Mondays up to today are accepted). Every fortnight lines up from that Monday (`S.commission.anchor`). It can be changed on the tracker ("Change" under the days) or in **Settings › Commission**; changing it only regroups entries, nothing is lost, and there's Undo.
- **Entries:** day earned (defaults to yesterday, can't be in the future), amount in NZD, optional note. Several per day. Amounts are stored as whole cents (`cents`) so totals don't pick up rounding errors. **Adjustment (minus)** is for a clawback or correction: it's stored as a minus amount, tagged "Adjustment" and shown in red as −$25.00. Tap an entry to edit it or delete it (both with Undo).
- **Tracker:** this fortnight's dates, total, days left (counting today) and entries; an **Add yesterday** button; Week 1 and Week 2, Mon to Sun, with each day's entries (day total when there's more than one; empty days just show "Add", future days are greyed). Then totals for this month, this calendar year and the **NZ tax year** (1 April – 31 March), all by the day the commission was earned; a plain SVG bar chart of the last 8 fortnights (bars show short amounts like $1.5k; full amounts are in the chart's label and the list); and past fortnights newest first, tap to expand (13 shown, then "Show all").
- **Reminder** (off by default): turn it on from the card on the tracker or **Settings › Commission**. At 9 am (or the next time the app checks after that, before 9 pm) you get "Enter yesterday's commission?" unless something is already entered for yesterday. Once per day; tapping it opens Add commission for yesterday. Uses the same reminder check as everything else (`pendingReminders` in `core.js`), so background delivery depends on Android's background checks.
- Included in backups. Older backups without commission restore fine (the tracker just asks for the start Monday again).
- Tested by `pwtest/commission.mjs` (fortnight grouping across and before the start Monday and on the daylight-saving change dates, the yesterday default and future dates blocked, several entries per day, edit/delete with Undo, month/year/tax-year totals, changing the start Monday, the chart, the reminder, backup/restore, layout at 360 and 390).

## Shipping an update
Change `VERSION` in `sw.js` (and `APP_VERSION` in `app.js`), commit and push. The app picks up the new version the next time it's opened.

## Layout notes
- **Left tab strip (v1.50.0):** the page itself never scrolls. `html, body` are `overflow:hidden`, `#app` is pinned to the screen (`position:fixed; inset 0`) and `#view` is the only thing that scrolls. The tab strip (Home, the chosen tabs and More) sits on the left edge of `#app`, off-screen until a swipe that starts within 20px of that edge. A swipe back, or a tap on the dimmed page, hides it again. Choosing a tab opens that page and hides the strip. `#view` no longer reserves space for a bottom bar, so the page uses the full height. A small chevron on the left edge shows where to swipe. Don't go back to sizing `#app` with `100vh`/`100dvh`: on Android Chrome those change as the address bar and keyboard come and go, which let the whole page scroll away.
- While the on-screen keyboard is up (a text field has focus and the screen is more than 150px shorter), `body` gets the class `kb` and the bottom padding tightens. Sheets (`#sheet`, z-index 50) cover the strip.
