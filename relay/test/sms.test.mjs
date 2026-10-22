import assert from 'node:assert/strict';
import { classifySms, looksLikeCode, parseWhen, smsReminder } from '../src/sms.js';
import { cleanReminder } from '../src/push.js';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const now = Date.parse('2026-10-22T09:30:00+13:00'); // Thursday
// codes are dropped
ok(classifySms('ASB', 'Your ASB code is 482913. Never share this code.', now) === null, 'bank OTP dropped');
ok(classifySms('Kiwibank', 'Kiwibank: 739204 is your one-time code to approve a payment of $250', now) === null, 'one-time code dropped');
ok(classifySms('Google', 'G-552019 is your Google verification code.', now) === null, 'verification code dropped');
ok(classifySms('BNZ', 'BNZ: 55120938 - use this to log in. We will never call you for it.', now) === null, 'bare digits + login dropped');
ok(classifySms('NZPost', 'NZ Post: your parcel locker PIN is 4471. Collect from Onerahi.', now) === null, 'parcel locker PIN dropped too');
ok(looksLikeCode('Your Uber code: 7781') && !looksLikeCode('See you Friday at 10:30am'), 'code test');
// B: deliveries
const a = classifySms('NZPost', 'NZ Post: Your parcel LN123456789NZ is out for delivery today. Track at https://www.nzpost.co.nz/tools/tracking', now);
ok(a && a.kind === 'parcel' && a.carrier === 'NZ Post' && a.status === 'Out for delivery' && a.tracking === 'LN123456789NZ' && /nzpost\.co\.nz/.test(a.trackUrl), 'NZ Post delivery');
const b = classifySms('Aramex', 'Aramex: we attempted delivery of your parcel 3456789012AB today. Card left.', now);
ok(b && b.carrier === 'Aramex' && b.status === 'Delivery attempted' && /aramex\.co\.nz/.test(b.trackUrl), 'Aramex attempted + built tracking link');
const sc = classifySms('+64211234567', 'NZPost: your parcel is held, pay the $2.99 redelivery fee at https://nzpost-redeliver.top/x', now);
ok(sc && sc.status === 'Possible scam' && !sc.trackUrl, 'scam link not linked');
// A: appointments
const d = classifySms('Onerahi Med', 'Reminder: you have an appointment with Dr Patel at Onerahi Medical Centre on Tue 27 Oct at 10:15am. Reply Y to confirm.', now);
ok(d && d.kind === 'appt' && d.date === '2026-10-27' && d.time === '10:15', 'doctor reminder with date and time');
const w = classifySms('VTNZ', 'VTNZ: Your WOF booking is confirmed for 30/10 at 2pm, Port Road Whangarei.', now);
ok(w && w.kind === 'appt' && w.date === '2026-10-30' && w.time === '14:00', 'WOF booking');
const den = classifySms('SmileDental', 'Your dental check-up is booked for tomorrow 3.30pm. See you then!', now);
ok(den && den.date === '2026-10-23' && den.time === '15:30', 'dentist tomorrow');
// everything else dropped
ok(classifySms('+64271112222', 'Hey are we still on for dinner Friday at 7? x', now) === null, 'personal text dropped');
ok(classifySms('Contact', 'Your power bill of $182.40 is due 25/10.', now) === null, 'bill text dropped');
ok(classifySms('Spark', 'Spark: you have used 80% of your data.', now) === null, 'other promo/info dropped');
ok(parseWhen('on 3 Jan at 9am', now).date === '2027-01-03', 'next year when month has passed');
const r = smsReminder(a, now); ok(r.id.startsWith('sms-') && cleanReminder(r, now), 'sms- push accepted');
console.log(`sms: ${n} checks passed`);
