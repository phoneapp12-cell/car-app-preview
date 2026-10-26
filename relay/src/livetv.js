/* 2.28.42: Internet TV Guide (EPG) + Cloud DVR & Series Link Engine + True VOD Segment Capture */
const DVR_KEY = "ltv-dvr-v1";
const REC_PREFIX = "ltv-rec-vod-v2:";

const SEED_RECORDINGS = [
  {
    id: "rec-mythbusters-jetpack",
    title: "MythBusters — Jetpack & Pyramid Power",
    episode: "Season 3 · Episode 12",
    desc: "Adam and Jamie build a personal jetpack from internet plans and test whether pyramid shapes preserve razor blades and food.",
    channelId: "mythbusters",
    channelName: "MythBusters 24/7",
    category: "🔨 Home, DIY & Science",
    streamUrl: "https://mediapackage-ptmb-source.fullscreen.nz/index.m3u8",
    start: "2026-10-24T20:00:00+13:00",
    end: "2026-10-24T21:00:00+13:00",
    durationMin: 60,
    status: "ready",
    seriesTitle: "MythBusters",
    oneDrivePath: "/My App TV Recordings/MythBusters-Jetpack-2026-10-24.json",
    recordedAt: "2026-10-24T21:00:00+13:00",
    sizeMb: 412
  },
  {
    id: "rec-midsomer-badgers-drift",
    title: "Midsomer Murders — The Killings at Badger’s Drift",
    episode: "Series 1 · Feature Mystery",
    desc: "DCI Tom Barnaby and Sergeant Gavin Troy investigate a suspicious death in the idyllic English village of Badger’s Drift.",
    channelId: "midsomer-murders-uk",
    channelName: "Midsomer Murders 24/7 (UK)",
    category: "🇬🇧 UK & British TV",
    streamUrl: "https://all3media-midsomer-1-us.roku.wurl.tv/playlist.m3u8",
    start: "2026-10-24T21:00:00+13:00",
    end: "2026-10-24T22:30:00+13:00",
    durationMin: 90,
    status: "ready",
    seriesTitle: "Midsomer Murders",
    oneDrivePath: "/My App TV Recordings/Midsomer-Murders-Badgers-Drift-2026-10-24.json",
    recordedAt: "2026-10-24T22:30:00+13:00",
    sizeMb: 580
  }
];

async function loadDvrState(env) {
  const kv = env && env.EVENTS_KV;
  if (kv) {
    try {
      const c = await kv.get(DVR_KEY, { type: "json" });
      if (c && Array.isArray(c.recordings) && Array.isArray(c.seriesLinks)) return c;
    } catch (e) {}
  }
  return {
    recordings: SEED_RECORDINGS.slice(),
    seriesLinks: [
      { id: "sl-mythbusters", seriesTitle: "MythBusters", channelId: "mythbusters", channelName: "MythBusters 24/7", streamUrl: "https://mediapackage-ptmb-source.fullscreen.nz/index.m3u8", category: "🔨 Home, DIY & Science", addedAt: "2026-10-24T19:00:00Z" }
    ],
    storage: {
      provider: "OneDrive (My App TV Recordings) + Cloudflare Edge DVR",
      folder: "/My App TV Recordings",
      connected: true
    }
  };
}

async function saveDvrState(env, st) {
  const kv = env && env.EVENTS_KV;
  if (kv) {
    try { await kv.put(DVR_KEY, JSON.stringify(st)); } catch (e) {}
  }
}

function resolveAttrUris(line, base) {
  return line.replace(/URI="([^"]+)"/g, (m, u) => {
    try { return `URI="${new URL(u, base).toString()}"`; } catch (e) { return m; }
  });
}

// Convert a child media playlist into a static #EXT-X-PLAYLIST-TYPE:VOD playlist with absolute segment URLs and #EXT-X-ENDLIST.
// Also backfills earlier segments when the CDN keeps a rolling sequence (e.g. Fullscreen MediaPackage or Wurl).
async function buildVodChildPlaylist(childUrl, startMs, endMs, fetchImpl = fetch) {
  try {
    const r = await fetchImpl(childUrl, { signal: AbortSignal.timeout(4500) });
    if (!r.ok) return "";
    const txt = await r.text();
    if (!txt.includes("#EXTM3U")) return "";
    const base = r.url || childUrl;
    const rawLines = txt.split(/\r?\n/);

    const headers = ["#EXTM3U", "#EXT-X-VERSION:6", "#EXT-X-PLAYLIST-TYPE:VOD", "#EXT-X-INDEPENDENT-SEGMENTS"];
    let targetDur = 6;
    let mapLine = "";
    const items = [];
    let curPdt = 0;
    let curKey = "";
    let curDisc = false;

    for (let i = 0; i < rawLines.length; i++) {
      const l = rawLines[i].trim();
      if (!l) continue;
      if (l.startsWith("#EXT-X-TARGETDURATION:")) {
        targetDur = Math.max(2, parseInt(l.split(":")[1], 10) || 6);
      } else if (l.startsWith("#EXT-X-MAP:")) {
        mapLine = resolveAttrUris(l, base);
      } else if (l.startsWith("#EXT-X-KEY:")) {
        curKey = resolveAttrUris(l, base);
      } else if (l.startsWith("#EXT-X-PROGRAM-DATE-TIME:")) {
        const dt = Date.parse(l.slice("#EXT-X-PROGRAM-DATE-TIME:".length).trim());
        if (dt) curPdt = dt;
      } else if (l === "#EXT-X-DISCONTINUITY") {
        curDisc = true;
      } else if (l.startsWith("#EXTINF:")) {
        const dur = parseFloat(l.slice(8)) || targetDur;
        for (let j = i + 1; j < rawLines.length; j++) {
          const nxt = rawLines[j].trim();
          if (!nxt) continue;
          if (nxt.startsWith("#")) {
            if (nxt.startsWith("#EXT-X-PROGRAM-DATE-TIME:")) {
              const dt = Date.parse(nxt.slice("#EXT-X-PROGRAM-DATE-TIME:".length).trim());
              if (dt) curPdt = dt;
            } else if (nxt.startsWith("#EXT-X-KEY:")) {
              curKey = resolveAttrUris(nxt, base);
            } else if (nxt === "#EXT-X-DISCONTINUITY") {
              curDisc = true;
            }
            continue;
          }
          let absUrl = nxt;
          try { absUrl = new URL(nxt, base).toString(); } catch (e) {}
          items.push({ dur, extinf: l, url: absUrl, pdt: curPdt, key: curKey, disc: curDisc });
          if (curPdt) curPdt += Math.round(dur * 1000);
          curDisc = false;
          i = j;
          break;
        }
      }
    }

    if (!items.length) return "";

    let chosen = items;
    const hasPdt = items.some(x => x.pdt > 0);
    if (hasPdt && items.length > 60 && startMs && endMs) {
      const win = items.filter(x => x.pdt >= startMs - 30000 && x.pdt <= endMs + 60000);
      if (win.length >= 15) {
        chosen = win;
      } else {
        chosen = items.slice(Math.max(0, items.length - 450));
      }
    } else if (items.length > 80) {
      chosen = items.slice(Math.max(0, items.length - 450));
    } else if (items.length <= 30) {
      const first = items.find(x => !/:tag=ad:/i.test(x.extinf)) || items[0];
      const fsMatch = first.url.match(/^(.*_)(\d+)(\.ts\?m=\d+.*)$/);
      const wurlMatch = !fsMatch && first.url.match(/^(.*-)(\d{5})(\.ts.*)$/);
      if (fsMatch) {
        const prefix = fsMatch[1], firstSeq = parseInt(fsMatch[2], 10), suffix = fsMatch[3];
        const backfillCount = 225;
        const backfilled = [];
        for (let s = firstSeq - backfillCount; s < firstSeq; s++) {
          if (s > 0) backfilled.push({ dur: first.dur, extinf: `#EXTINF:${first.dur.toFixed(3)},`, url: `${prefix}${s}${suffix}`, pdt: 0, key: first.key, disc: false });
        }
        chosen = backfilled.concat(items);
      } else if (wurlMatch) {
        const prefix = wurlMatch[1], firstSeq = parseInt(wurlMatch[2], 10), suffix = wurlMatch[3];
        let backSteps = 0;
        for (const step of [45, 25, 12, 6, 3]) {
          if (firstSeq - step <= 0) continue;
          const probeUrl = `${prefix}${String(firstSeq - step).padStart(5, "0")}${suffix}`;
          try {
            const pr = await fetchImpl(probeUrl, { method: "HEAD", signal: AbortSignal.timeout(1200) });
            if (pr.ok) { backSteps = step; break; }
          } catch (e) {}
        }
        if (backSteps > 0) {
          const backfilled = [];
          for (let s = firstSeq - backSteps; s < firstSeq; s++) {
            backfilled.push({ dur: first.dur, extinf: `#EXTINF:${first.dur.toFixed(3)},`, url: `${prefix}${String(s).padStart(5, "0")}${suffix}`, pdt: 0, key: first.key, disc: false });
          }
          chosen = backfilled.concat(items);
        }
      }
    }

    headers.push(`#EXT-X-TARGETDURATION:${Math.ceil(targetDur)}`);
    headers.push(`#EXT-X-MEDIA-SEQUENCE:0`);
    if (mapLine) headers.push(mapLine);

    let lastKey = "";
    for (const seg of chosen) {
      if (seg.disc) headers.push("#EXT-X-DISCONTINUITY");
      if (seg.key && seg.key !== lastKey) {
        headers.push(seg.key);
        lastKey = seg.key;
      }
      headers.push(seg.extinf);
      headers.push(seg.url);
    }
    headers.push("#EXT-X-ENDLIST");
    return headers.join("\n") + "\n";
  } catch (e) {
    return "";
  }
}

export async function captureHlsSnapshot(streamUrl, env, fetchImpl = fetch, recId = "", startMs = 0, endMs = 0) {
  if (!streamUrl || !streamUrl.startsWith("https://")) return "";
  try {
    const r = await fetchImpl(streamUrl, { signal: AbortSignal.timeout(4500) });
    if (!r.ok) return "";
    const txt = await r.text();
    if (!txt.includes("#EXTM3U")) return "";
    const base = r.url || streamUrl;

    if (txt.includes("#EXTINF:")) {
      return await buildVodChildPlaylist(base, startMs, endMs, fetchImpl);
    }

    const lines = txt.split(/\r?\n/);
    let audioUri = "";
    for (const l of lines) {
      if (l.startsWith("#EXT-X-MEDIA:") && /TYPE=AUDIO/i.test(l) && /URI="([^"]+)"/i.test(l)) {
        const m = l.match(/URI="([^"]+)"/i);
        if (m && (!audioUri || /DEFAULT=YES|LANGUAGE="en/i.test(l))) {
          try { audioUri = new URL(m[1], base).toString(); } catch (e) {}
        }
      }
    }

    const variants = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (l.startsWith("#EXT-X-STREAM-INF:")) {
        const bw = parseInt((l.match(/BANDWIDTH=(\d+)/) || [])[1] || "0", 10);
        for (let j = i + 1; j < lines.length; j++) {
          const u = lines[j].trim();
          if (!u || u.startsWith("#")) continue;
          try { variants.push({ inf: l, bw, url: new URL(u, base).toString() }); } catch (e) {}
          i = j;
          break;
        }
      }
    }

    if (!variants.length) return "";
    variants.sort((a, b) => Math.abs(a.bw - 2400000) - Math.abs(b.bw - 2400000));
    const picked = variants[0];

    if (!audioUri) {
      return await buildVodChildPlaylist(picked.url, startMs, endMs, fetchImpl);
    }

    const [videoVod, audioVod] = await Promise.all([
      buildVodChildPlaylist(picked.url, startMs, endMs, fetchImpl),
      buildVodChildPlaylist(audioUri, startMs, endMs, fetchImpl)
    ]);
    if (!videoVod) return "";
    if (audioVod && env && env.EVENTS_KV && recId) {
      try {
        await env.EVENTS_KV.put(REC_PREFIX + recId + ":video", videoVod, { expirationTtl: 14 * 86400 });
        await env.EVENTS_KV.put(REC_PREFIX + recId + ":audio", audioVod, { expirationTtl: 14 * 86400 });
        const cleanInf = picked.inf.replace(/,?\s*SUBTITLES="[^"]*"/gi, "");
        return [
          "#EXTM3U",
          "#EXT-X-VERSION:6",
          "#EXT-X-INDEPENDENT-SEGMENTS",
          `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",NAME="English",LANGUAGE="en",DEFAULT=YES,AUTOSELECT=YES,URI="/livetv-recording/${encodeURIComponent(recId)}-audio.m3u8"`,
          cleanInf.replace(/AUDIO="[^"]*"/, 'AUDIO="aud"'),
          `/livetv-recording/${encodeURIComponent(recId)}-video.m3u8`,
          ""
        ].join("\n");
      } catch (e) {}
    }
    return videoVod;
  } catch (e) {
    return "";
  }
}

export async function tickDvr(env, fetchImpl = fetch, now = Date.now()) {
  const st = await loadDvrState(env);
  let changed = false;
  for (const rec of st.recordings) {
    const sMs = Date.parse(rec.start || "") || 0;
    const eMs = Date.parse(rec.end || "") || (sMs + (rec.durationMin || 60) * 60000);
    if (rec.status === "scheduled" && now >= sMs) {
      rec.status = now >= eMs ? "ready" : "recording";
      rec.recordedAt = new Date(now).toISOString();
      if (!rec.sizeMb) rec.sizeMb = Math.round((rec.durationMin || 60) * 6.5);
      if (rec.streamUrl && env && env.EVENTS_KV) {
        const snap = await captureHlsSnapshot(rec.streamUrl, env, fetchImpl, rec.id, sMs, eMs);
        if (snap) {
          try { await env.EVENTS_KV.put(REC_PREFIX + rec.id, snap, { expirationTtl: 14 * 86400 }); } catch (e) {}
        }
      }
      changed = true;
    } else if (rec.status === "recording" && now >= eMs) {
      rec.status = "ready";
      rec.recordedAt = new Date(now).toISOString();
      if (rec.streamUrl && env && env.EVENTS_KV) {
        const snap = await captureHlsSnapshot(rec.streamUrl, env, fetchImpl, rec.id, sMs, eMs);
        if (snap) {
          try { await env.EVENTS_KV.put(REC_PREFIX + rec.id, snap, { expirationTtl: 14 * 86400 }); } catch (e) {}
        }
      }
      changed = true;
    }
  }
  if (changed) await saveDvrState(env, st);
  return st;
}

export async function dvrRoute(path, request, env, fetchImpl = fetch) {
  if (path.startsWith("/livetv-recording/")) {
    const rawName = decodeURIComponent(path.replace("/livetv-recording/", "").replace(/\.m3u8$/i, ""));
    if (rawName.endsWith("-video") && env && env.EVENTS_KV) {
      const baseId = rawName.slice(0, -6);
      const v = await env.EVENTS_KV.get(REC_PREFIX + baseId + ":video");
      if (v) return [200, v, "application/vnd.apple.mpegurl"];
    }
    if (rawName.endsWith("-audio") && env && env.EVENTS_KV) {
      const baseId = rawName.slice(0, -6);
      const a = await env.EVENTS_KV.get(REC_PREFIX + baseId + ":audio");
      if (a) return [200, a, "application/vnd.apple.mpegurl"];
    }
    const id = rawName;
    const st = await loadDvrState(env);
    let rec = st.recordings.find(r => r.id === id) || SEED_RECORDINGS.find(r => r.id === id);
    if (env && env.EVENTS_KV) {
      try {
        const saved = await env.EVENTS_KV.get(REC_PREFIX + id);
        if (saved && saved.includes("#EXTM3U") && (saved.includes("#EXT-X-ENDLIST") || saved.includes("-video.m3u8"))) {
          return [200, saved, "application/vnd.apple.mpegurl"];
        }
      } catch (e) {}
    }
    const reqUrl = new URL(request.url);
    const streamUrl = (rec && rec.streamUrl) || reqUrl.searchParams.get("u") || "";
    if (streamUrl) {
      const sMs = (rec && Date.parse(rec.start || "")) || 0;
      const eMs = (rec && Date.parse(rec.end || "")) || 0;
      const snap = await captureHlsSnapshot(streamUrl, env, fetchImpl, id, sMs, eMs);
      if (snap) {
        if (env && env.EVENTS_KV) {
          try { await env.EVENTS_KV.put(REC_PREFIX + id, snap, { expirationTtl: 14 * 86400 }); } catch (e) {}
        }
        return [200, snap, "application/vnd.apple.mpegurl"];
      }
    }
    return [404, "#EXTM3U\n#EXT-X-ENDLIST\n", "application/vnd.apple.mpegurl"];
  }

  if (request.method === "GET") {
    const st = await tickDvr(env, fetchImpl, Date.now());
    return [200, st, "application/json"];
  }

  if (request.method === "POST") {
    let body = {};
    try { body = await request.json(); } catch (e) { body = {}; }
    const st = await tickDvr(env, fetchImpl, Date.now());
    const act = body.action || "";

    // Client can upload its captured static VOD m3u8 directly (e.g. built in browser on NZ IP or accumulated during live recording)
    if (act === "save-vod" && body.id && typeof body.m3u8 === "string" && body.m3u8.includes("#EXTM3U")) {
      const id = String(body.id);
      if (env && env.EVENTS_KV) {
        try { await env.EVENTS_KV.put(REC_PREFIX + id, body.m3u8, { expirationTtl: 14 * 86400 }); } catch (e) {}
        if (typeof body.videoM3u8 === "string" && body.videoM3u8.includes("#EXTM3U")) {
          try { await env.EVENTS_KV.put(REC_PREFIX + id + ":video", body.videoM3u8, { expirationTtl: 14 * 86400 }); } catch (e) {}
        }
        if (typeof body.audioM3u8 === "string" && body.audioM3u8.includes("#EXTM3U")) {
          try { await env.EVENTS_KV.put(REC_PREFIX + id + ":audio", body.audioM3u8, { expirationTtl: 14 * 86400 }); } catch (e) {}
        }
      }
      return [200, { ok: true }, "application/json"];
    }

    if (act === "record") {
      const p = body.prog || {};
      const id = p.id || ("rec-" + Date.now());
      const now = Date.now();
      const sMs = Date.parse(p.start || "") || now;
      const eMs = Date.parse(p.end || "") || (sMs + (p.durationMin || 60) * 60000);
      const isNow = sMs <= now + 60000;
      const safeName = String(p.title || "Recording").replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 50);
      const rec = {
        id,
        title: String(p.title || "Recorded Programme").slice(0, 140),
        episode: String(p.episode || "").slice(0, 100),
        desc: String(p.desc || "").slice(0, 300),
        channelId: String(p.channelId || ""),
        channelName: String(p.channelName || "Live TV"),
        category: String(p.category || "Live TV"),
        streamUrl: String(p.streamUrl || ""),
        start: new Date(sMs).toISOString(),
        end: new Date(eMs).toISOString(),
        durationMin: Math.max(1, Math.round((eMs - sMs) / 60000)),
        status: isNow ? "ready" : "scheduled",
        seriesTitle: String(p.seriesTitle || p.title || "").replace(/\s*—.*$/, "").slice(0, 100),
        oneDrivePath: "/My App TV Recordings/" + safeName + "-" + new Date(sMs).toISOString().slice(0, 10) + ".json",
        recordedAt: isNow ? new Date(now).toISOString() : "",
        sizeMb: p.sizeMb || Math.round(Math.max(10, (eMs - sMs) / 60000) * 6.5)
      };
      if (typeof body.vodM3u8 === "string" && body.vodM3u8.includes("#EXTM3U") && env && env.EVENTS_KV) {
        try { await env.EVENTS_KV.put(REC_PREFIX + rec.id, body.vodM3u8, { expirationTtl: 14 * 86400 }); } catch (e) {}
        if (typeof body.videoM3u8 === "string" && body.videoM3u8.includes("#EXTM3U")) {
          try { await env.EVENTS_KV.put(REC_PREFIX + rec.id + ":video", body.videoM3u8, { expirationTtl: 14 * 86400 }); } catch (e) {}
        }
        if (typeof body.audioM3u8 === "string" && body.audioM3u8.includes("#EXTM3U")) {
          try { await env.EVENTS_KV.put(REC_PREFIX + rec.id + ":audio", body.audioM3u8, { expirationTtl: 14 * 86400 }); } catch (e) {}
        }
      } else if (isNow && rec.streamUrl && env && env.EVENTS_KV) {
        const snap = await captureHlsSnapshot(rec.streamUrl, env, fetchImpl, rec.id, sMs, eMs);
        if (snap) {
          try { await env.EVENTS_KV.put(REC_PREFIX + rec.id, snap, { expirationTtl: 14 * 86400 }); } catch (e) {}
        }
      }
      st.recordings = [rec, ...st.recordings.filter(x => x.id !== id)].slice(0, 80);
      await saveDvrState(env, st);
      return [200, { ok: true, recording: rec, state: st }, "application/json"];
    }

    if (act === "series-link") {
      const p = body.prog || {};
      const seriesTitle = String(p.seriesTitle || p.title || "").replace(/\s*—.*$/, "").trim().slice(0, 100);
      const channelId = String(p.channelId || "");
      const existing = st.seriesLinks.find(s => s.seriesTitle.toLowerCase() === seriesTitle.toLowerCase() && (!channelId || s.channelId === channelId));
      if (existing) {
        st.seriesLinks = st.seriesLinks.filter(s => s.id !== existing.id);
        await saveDvrState(env, st);
        return [200, { ok: true, removed: true, state: st }, "application/json"];
      }
      const sl = {
        id: "sl-" + Date.now(),
        seriesTitle,
        channelId,
        channelName: String(p.channelName || "Live TV"),
        streamUrl: String(p.streamUrl || ""),
        category: String(p.category || "Live TV"),
        addedAt: new Date().toISOString()
      };
      st.seriesLinks.unshift(sl);
      if (Array.isArray(body.upcoming)) {
        for (const ep of body.upcoming.slice(0, 6)) {
          const eid = ep.id || ("rec-sl-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6));
          if (!st.recordings.some(r => r.title === ep.title && r.start === ep.start)) {
            const isNow = Date.parse(ep.start) <= Date.now();
            const newRec = {
              id: eid,
              title: ep.title,
              episode: ep.episode || "Series Link Episode",
              desc: ep.desc || "",
              channelId: sl.channelId,
              channelName: sl.channelName,
              category: sl.category,
              streamUrl: sl.streamUrl,
              start: ep.start,
              end: ep.end,
              durationMin: ep.durationMin || 60,
              status: isNow ? "ready" : "scheduled",
              seriesTitle,
              fromSeriesLink: true,
              oneDrivePath: "/My App TV Recordings/" + seriesTitle.replace(/[^A-Za-z0-9_-]+/g, "-") + ".json",
              recordedAt: isNow ? new Date().toISOString() : "",
              sizeMb: 390
            };
            if (isNow && newRec.streamUrl && env && env.EVENTS_KV) {
              const snap = await captureHlsSnapshot(newRec.streamUrl, env, fetchImpl, newRec.id, Date.parse(ep.start) || 0, Date.parse(ep.end) || 0);
              if (snap) {
                try { await env.EVENTS_KV.put(REC_PREFIX + newRec.id, snap, { expirationTtl: 14 * 86400 }); } catch (e) {}
              }
            }
            st.recordings.unshift(newRec);
          }
        }
      }
      await saveDvrState(env, st);
      return [200, { ok: true, added: sl, state: st }, "application/json"];
    }

    if (act === "delete-recording") {
      const id = String(body.id || "");
      st.recordings = st.recordings.filter(r => r.id !== id);
      if (env && env.EVENTS_KV && id) {
        try { await env.EVENTS_KV.delete(REC_PREFIX + id); } catch (e) {}
      }
      await saveDvrState(env, st);
      return [200, { ok: true, state: st }, "application/json"];
    }

    if (act === "delete-series-link") {
      const id = String(body.id || "");
      st.seriesLinks = st.seriesLinks.filter(s => s.id !== id);
      await saveDvrState(env, st);
      return [200, { ok: true, state: st }, "application/json"];
    }
  }
  return [400, { error: "bad_request" }, "application/json"];
}
